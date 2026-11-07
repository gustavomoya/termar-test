import { listJobs, listQueueItems, listWorksheets, type JobRecord, type JobSyncStatus, type QueueErrorKind, type QueueItem,
  type QueueItemStatus, type QueueStep, type WorksheetDraft } from "@/lib/db";
import { formatTime } from "@/lib/today";
import { readTodayCache } from "@/lib/services/today";
import { mapDraftToRemoteWorksheet } from "@/lib/services/worksheet";
import { estimatedDataUrlBytes } from "@/lib/worksheet/photos";
import { isDemoConflictEnabled } from "@/lib/demo/flags";

/**
 * Safely reads a list from a database store.
 * Returns an empty array if the operation fails.
 *
 * @param fn Asynchronous function
 */
async function safeList<T>(fn: () => Promise<T[]>): Promise<T[]> {
  try {
    return await fn();
  } catch {
    return [];
  }
}

/**
 * One pending step shown on the Sync screen.
 */
export interface SyncItem {
  step: QueueStep;
  status: QueueItemStatus;
  label: string;
  detail?: string;
  sizeBytes: number;
  attempts: number;
  nextAttemptAt?: string;
  lastError?: string;
  lastErrorKind?: QueueErrorKind;
}

/**
 * All pending work for one job.
 */
export interface SyncJobGroup {
  jobId: string;
  reference: string;
  site: string;
  scheduledAt: string;
  jobStatus: JobSyncStatus;
  items: SyncItem[];
}

/**
 * Everything the Sync screen needs to render.
 */
export interface SyncOverview {
  groups: SyncJobGroup[];
  waiting: number;
  failed: number;
  conflict: number;
  totalItems: number;
  totalBytes: number;
  waitingBytes: number;
}

/**
 * Count the checklist answers already recorded in a worksheet.
 */
function answeredCount(worksheet: WorksheetDraft): number {
  return Object.values(worksheet.checks).filter(
    (answer) => answer.result !== undefined,
  ).length;
}

/**
 * Describe what is inside the worksheet upload
 */
function describeDetail(worksheet: WorksheetDraft): string | undefined {
  const parts = worksheet.parts.length;
  const photos = worksheet.photos.length;
  const pieces = [
    parts > 0 ? `${parts} ${parts === 1 ? "part" : "parts"}` : null,
    photos > 0 ? `${photos} ${photos === 1 ? "photo" : "photos"}` : null,
    worksheet.signature ? "signed" : null,
  ].filter((piece): piece is string => piece !== null);

  return pieces.length > 0 ? pieces.join(" · ") : undefined;
}

/**
 * Estimate the bytes a queued step will send.
 *
 * The worksheet upload is the real payload: the mapped worksheet already
 * includes the signature, and the compressed photos travel as base64 inside it.
 * The status step only sends a small JSON body
 */
function estimateSize(
  item: QueueItem,
  worksheet: WorksheetDraft | undefined,
): number {
  if (item.step !== "worksheet" || !worksheet) {
    return new TextEncoder().encode(JSON.stringify({ status: "synced" }))
      .length;
  }

  const payloadBytes = new TextEncoder().encode(
    JSON.stringify(mapDraftToRemoteWorksheet(worksheet)),
  ).length;
  const photoBytes = worksheet.photos.reduce(
    (total, photo) =>
      total + (photo.sizeBytes ? estimatedDataUrlBytes(photo.sizeBytes) : 0),
    0,
  );

  return payloadBytes + photoBytes;
}

/**
 * Describe a queued step for the Sync screen.
 */
function describeItem(
  item: QueueItem,
  worksheet: WorksheetDraft | undefined,
): SyncItem {
  const isWorksheet = item.step === "worksheet";
  const label = isWorksheet
    ? worksheet
      ? `Worksheet · ${answeredCount(worksheet)} answered`
      : "Worksheet"
    : "Status update";

  return {
    step: item.step,
    status: item.status,
    label,
    detail: isWorksheet && worksheet ? describeDetail(worksheet) : undefined,
    sizeBytes: estimateSize(item, worksheet),
    attempts: item.attempts,
    nextAttemptAt: item.nextAttemptAt,
    lastError: item.lastError,
    lastErrorKind: item.lastErrorKind,
  };
}

/**
 * Build the group shown for a job, using local data when the job is missing.
 */
function createGroup(
  jobId: string,
  job: JobRecord | undefined,
  items: SyncItem[],
): SyncJobGroup {
  return {
    jobId,
    reference: job?.reference ?? jobId,
    site: job?.site.name ?? "Unknown site",
    scheduledAt: job?.scheduledAt ?? "",
    jobStatus: job?.status ?? "queued",
    items,
  };
}

/**
 * Load the outbox joined with jobs and worksheets.
 *
 * @returns the grouped overview for the Sync screen
 */
export async function loadSyncOverview(): Promise<SyncOverview> {
  const [queueItems, jobs, worksheets] = await Promise.all([
    safeList(listQueueItems),
    safeList(listJobs),
    safeList(listWorksheets),
  ]);

  const jobsById = new Map(jobs.map((job) => [job.id, job]));
  const worksheetsById = new Map(
    worksheets.map((worksheet) => [worksheet.jobId, worksheet]),
  );
  const groupsById = new Map<string, SyncJobGroup>();

  for (const item of queueItems) {
    const group = groupsById.get(item.jobId);
    const described = describeItem(item, worksheetsById.get(item.jobId));

    if (group) {
      group.items.push(described);
      continue;
    }

    groupsById.set(
      item.jobId,
      createGroup(item.jobId, jobsById.get(item.jobId), [described]),
    );
  }

  const groups = [...groupsById.values()].sort((a, b) =>
    a.scheduledAt.localeCompare(b.scheduledAt),
  );

  const items = groups.flatMap((group) => group.items);
  const waitingItems = items.filter(
    (item) => item.status === "pending" || item.status === "sending",
  );

  return {
    groups,
    waiting: waitingItems.length,
    failed: items.filter((item) => item.status === "failed").length,
    conflict: items.filter((item) => item.status === "conflict").length,
    totalItems: items.length,
    totalBytes: items.reduce((total, item) => total + item.sizeBytes, 0),
    waitingBytes: waitingItems.reduce(
      (total, item) => total + item.sizeBytes,
      0,
    ),
  };
}

/**
 * One job whose local worksheet conflicts with the office's copy.
 */
export interface ConflictSummary {
  jobId: string;
  reference: string;
  site: string;
  scheduledAt: string;
  mine: {
    technician: string;
    van: string;
    completedAt?: string;
    checksAnswered: number;
    failedChecks: number;
    partsUsed: string[];
    photos: number;
    signature: string | undefined;
  };
  other: {
    technician: string;
    completedAt: string;
  };
}

/**
 * Load every job in `conflict` state together with the local worksheet and
 * the data the office has about the other technician's copy.
 */
export async function loadConflicts(): Promise<ConflictSummary[]> {
  // Demo-only fixture: never imported nor called in production.
  if (isDemoConflictEnabled()) {
    try {
      const { seedDemoConflictIfNeeded } = await import(
        "@/lib/demo/conflict"
      );
      await seedDemoConflictIfNeeded();
    } catch {
      // Never block the conflict list because the demo seed failed.
    }
  }

  const [jobs, worksheets, cached] = await Promise.all([
    safeList(listJobs),
    safeList(listWorksheets),
    readTodayCache(),
  ]);

  const worksheetsByJob = new Map(worksheets.map((w) => [w.jobId, w]));
  const technician = cached?.day?.technician;

  return jobs
    .filter((job) => job.status === "conflict" && job.conflictWith)
    .map((job) => {
      const draft = worksheetsByJob.get(job.id);
      const answered = draft
        ? Object.values(draft.checks).filter((a) => a.result !== undefined)
            .length
        : 0;
      const failed = draft
        ? Object.values(draft.checks).filter((a) => a.result === "fail")
            .length
        : 0;
      const parts = draft ? draft.parts.map((p) => `${p.label} ×${p.quantity}`) : [];
      const photos = draft ? draft.photos.length : 0;
      const signature = draft?.signature?.signedBy;

      let completedAt: string | undefined;
      if (draft?.startedAt && draft?.stoppedAt) {
        completedAt = `${formatTime(draft.startedAt)} – ${formatTime(draft.stoppedAt)}`;
      } else if (draft?.stoppedAt) {
        completedAt = formatTime(draft.stoppedAt);
      }

      return {
        jobId: job.id,
        reference: job.reference,
        site: job.site.name,
        scheduledAt: job.scheduledAt,
        mine: {
          technician: technician?.name ?? "You",
          van: technician?.van ?? "",
          completedAt,
          checksAnswered: answered,
          failedChecks: failed,
          partsUsed: parts,
          photos,
          signature,
        },
        other: {
          technician: job.conflictWith?.technician ?? "Unknown",
          completedAt: job.conflictWith
            ? formatTime(job.conflictWith.completedAt)
            : "",
        },
      };
    });
}
