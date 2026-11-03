import { fetchDay, fetchJobs, type RemoteJob } from "@/lib/api/today";
import { fetchTemplate, fetchVanStock } from "@/lib/api/worksheet";
import {
  getDayInfo,
  listJobs,
  listWorksheets,
  replaceJobs,
  setDayInfo,
  putTemplate,
  replaceStock,
  type DayInfo,
  type JobRecord,
  type WorksheetDraft,
} from "@/lib/db";
import { nowLocalIso } from "@/lib/time";

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
 * Merge remote jobs with local jobs that have not yet been synchronized
 * but still have an associated local worksheet (work in progress).
 *
 * Local jobs without a worksheet are discarded, as there is no work to preserve.
 * LRemote jobs are enriched with a cache timestamp.
 *
 * @param remoteJobs jobs retrieved from the backend
 * @param localJobs  jobs stored on db
 * @param worksheets local worksheets stored on db
 *
 * @returns jobs combined and sorted by scheduledAt
 */
function mergeTodayJobs(
  remoteJobs: JobRecord[],
  localJobs: JobRecord[],
  worksheets: WorksheetDraft[],
): JobRecord[] {
  const remoteIds = new Set(remoteJobs.map((job) => job.id));
  const worksheetJobIds = new Set(
    worksheets.map((worksheet) => worksheet.jobId),
  );

  const localOnly = localJobs.filter(
    (job) => !remoteIds.has(job.id) && worksheetJobIds.has(job.id),
  );

  return [
    ...remoteJobs.map((job) => ({ ...job, cachedAt: nowLocalIso() })),
    ...localOnly,
  ].sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));
}

/**
 * Fetch the latest day and jobs, merge local-only jobs that still have a
 * worksheet, persist the result, and pre-cache data.
 *
 * @returns the refreshed day and jobs
 */
export async function refreshToday(): Promise<TodaySnapshot> {
  const [day, remoteJobs, localJobs, worksheets] = await Promise.all([
    fetchDay(),
    fetchJobs(),
    listJobs(),
    listWorksheets(),
  ]);

  const jobs = mergeTodayJobs(remoteJobs, localJobs, worksheets);

  await Promise.all([setDayInfo(day), replaceJobs(jobs)]);

  // Pre-cache data (templates + van stock) so worksheets can load offline
  const plantTypes = [...new Set(remoteJobs.map((job) => job.plantType))];
  await Promise.allSettled([
    ...plantTypes.map((plantType) =>
      fetchTemplate(plantType).then((template) => putTemplate(template)),
    ),
    fetchVanStock().then((stock) => replaceStock(stock)),
  ]);

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
