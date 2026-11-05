import { fetchDay, fetchJobs, type RemoteJob } from "@/lib/api/today";
import { fetchTemplate, fetchVanStock } from "@/lib/api/worksheet";
import {
  getDayInfo,
  listJobs,
  listQueueItems,
  listWorksheets,
  replaceJobs,
  setDayInfo,
  putTemplate,
  replaceStock,
  type DayInfo,
  type JobRecord,
  type QueueItem,
  type WorksheetDraft,
} from "@/lib/db";
import { nowLocalIso } from "@/lib/time";
import { isDemoConflictEnabled } from "@/lib/demo/flags";

/**
 * Day and jobs cached on db.
 */
export interface TodaySnapshot {
  day: DayInfo;
  jobs: JobRecord[];
}

/**
 * Where the current snapshot came from.
 */
export type TodaySource = "network" | "cache";

/**
 * Today snapshot plus the source it was loaded from.IndexedDB
 */
export interface TodayResult extends TodaySnapshot {
  source: TodaySource;
}

/**
 * Read the day and jobs stored on db.
 *
 * @returns the data, or null when no day has been stored yet
 */
export async function readTodayCache(): Promise<TodaySnapshot | null> {
  const [day, jobs] = await Promise.all([getDayInfo(), listJobs()]);
  if (!day) return null;

  return { day, jobs };
}

/**
 * Merge remote jobs with local jobs that still have local work: a worksheet
 * or a queued item. Remote jobs with queued work keep their local sync
 * status so the refresh does not overwrite "queued"/"failed"/"conflict".
 *
 * Local jobs without a worksheet or queue item are discarded, as there is no
 * work to preserve. Remote jobs are enriched with a cache timestamp.
 *
 * @param remoteJobs jobs retrieved from the backend
 * @param localJobs  jobs stored on db
 * @param worksheets local worksheets stored on db
 * @param queueItems local queue stored on db
 *
 * @returns jobs combined and sorted by scheduledAt
 */
function mergeTodayJobs(
  remoteJobs: RemoteJob[],
  localJobs: JobRecord[],
  worksheets: WorksheetDraft[],
  queueItems: QueueItem[],
): JobRecord[] {
  const cachedAt = nowLocalIso();
  const remoteIds = new Set(remoteJobs.map((job) => job.id));
  const localById = new Map(localJobs.map((job) => [job.id, job]));
  const queueJobIds = new Set(queueItems.map((item) => item.jobId));
  const preservedJobIds = new Set([
    ...worksheets.map((worksheet) => worksheet.jobId),
    ...queueJobIds,
  ]);

  const localOnly = localJobs.filter(
    (job) => !remoteIds.has(job.id) && preservedJobIds.has(job.id),
  );

  const remote = remoteJobs.map((job) => {
    const local = localById.get(job.id);
    if (!local || !queueJobIds.has(job.id)) {
      return { ...job, cachedAt };
    }

    return {
      ...job,
      status: local.status,
      localOnly: local.localOnly,
      queuedItems: local.queuedItems,
      syncedAt: local.syncedAt,
      conflictWith: local.conflictWith,
      cachedAt,
    };
  });

  return [...remote, ...localOnly].sort((a, b) =>
    a.scheduledAt.localeCompare(b.scheduledAt),
  );
}

/**
 * Fetch the current day's data and jobs, merge local-only jobs that still have a
 * worksheet or queued item, persist the result, and pre-cache data.
 *
 * @returns the refreshed day and jobs
 */
export async function refreshToday(): Promise<TodaySnapshot> {
  const [day, remoteJobs, localJobs, worksheets, queueItems] =
    await Promise.all([
      fetchDay(),
      fetchJobs(),
      listJobs(),
      listWorksheets(),
      listQueueItems(),
    ]);

  const jobs = mergeTodayJobs(
    remoteJobs,
    localJobs,
    worksheets,
    queueItems,
  );

  await Promise.all([setDayInfo(day), replaceJobs(jobs)]);

  // Pre-cache data (templates + van stock) so worksheets can load offline
  const plantTypes = [...new Set(remoteJobs.map((job) => job.plantType))];
  await Promise.allSettled([
    ...plantTypes.map((plantType) =>
      fetchTemplate(plantType).then((template) => putTemplate(template)),
    ),
    fetchVanStock().then((stock) => replaceStock(stock)),
  ]);

  // Demo-only fixture: never imported nor called in production.
  if (isDemoConflictEnabled()) {
    try {
      const { seedDemoConflictIfNeeded } = await import(
        "@/lib/demo/conflict"
      );
      await seedDemoConflictIfNeeded();
    } catch {
      // The demo seed must never block loading the day.
    }
  }

  return { day, jobs };
}

/**
 * Load today's data, trying the network first and falling back to the
 * IndexedDB cache when the API is unavailable.
 *
 * @returns the snapshot and its source
 */
export async function loadToday(): Promise<TodayResult> {
  try {
    return { ...(await refreshToday()), source: "network" };
  } catch (error) {
    const cached = await readTodayCache();
    if (cached) return { ...cached, source: "cache" };

    throw error;
  }
}
