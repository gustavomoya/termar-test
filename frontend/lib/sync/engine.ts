import { ApiError, NetworkError } from "@/lib/api/client";
import { setJobStatus, uploadWorksheet } from "@/lib/api/worksheet";
import { getQueueItem, getWorksheet, listQueueItems } from "@/lib/db";
import type { ConflictWith, QueueItem } from "@/lib/db";
import {
  markWorksheetPhotosUploaded,
  prepareWorksheetUpload,
} from "@/lib/services/worksheet";
import { MAX_TOTAL_PHOTO_UPLOAD_BYTES } from "@/lib/worksheet/photos";
import {
  advanceToStatus,
  markQueueConflict,
  markQueueFailed,
  markQueueSending,
  markQueueSent,
  scheduleQueueRetry,
} from "@/lib/sync/outbox";
import { ConflictError, JobGoneError, RejectedError } from "@/lib/sync/errors";
import { nowLocalIso } from "@/lib/time";

const MAX_SYNC_ATTEMPTS = 7;
const BASE_RETRY_DELAY_MS = 1000;
const MAX_RETRY_DELAY_MS = 60_000;

/**
 * Result of one run of the sync engine
 */
export interface SyncRunResult {
  attempted: number;
  synced: number;
  failed: number;
  retrying: number;
  conflicts: number;
}

type JobOutcome = "synced" | "failed" | "retrying" | "offline" | "conflict" | "skipped";

let activeRun: Promise<SyncRunResult> | undefined;

/**
 * Calculate the delay before the next attempt using exponential backoff
 *
 * @param attempts number of attempts already made
 *
 * @returns delay in milliseconds, capped at one minute
 */
function retryDelayMs(attempts: number): number {
  return Math.min(
    MAX_RETRY_DELAY_MS,
    BASE_RETRY_DELAY_MS * 2 ** Math.max(0, attempts - 1),
  );
}

/**
 * Whether a queue item is ready to be processed now
 *
 * Stale "sending" items are retried after the app is reopened.
 *
 * @param item the queue item
 * @param now  current timestamp in milliseconds
 */
function isDue(item: QueueItem, now: number): boolean {
  if (item.status !== "pending" && item.status !== "sending") return false;
  if (!item.nextAttemptAt) return true;

  return new Date(item.nextAttemptAt).getTime() <= now;
}

/**
 * Order queue items by their next attempt time, falling back to creation time
 */
function compareQueueItems(a: QueueItem, b: QueueItem): number {
  return (a.nextAttemptAt ?? a.createdAt).localeCompare(
    b.nextAttemptAt ?? b.createdAt,
  );
}

/**
 * Errors that must not be retried
 *
 * HTTP 4xx responses are rejected (except timeout and rate limit); 409 will be
 * treated as a conflict in the conflict phase
 */
function isRejected(error: unknown): boolean {
  if (error instanceof RejectedError || error instanceof JobGoneError) {
    return true;
  }

  return (
    error instanceof ApiError &&
    error.status >= 400 &&
    error.status < 500 &&
    error.status !== 408 &&
    error.status !== 429 &&
    error.status !== 409
  );
}

/**
 * Read data from a 409 response body
 *
 * @param error the API error with status 409
 *
 * @returns the conflict metadata, or undefined when the body is not usable
 */
function conflictWithFrom(error: ApiError): ConflictWith | undefined {
  if (!error.body || typeof error.body !== "object") return undefined;

  const body = error.body as {
    conflictWith?: unknown;
    technician?: unknown;
    completedAt?: unknown;
  };
  const candidate =
    body.conflictWith && typeof body.conflictWith === "object"
      ? (body.conflictWith as Record<string, unknown>)
      : (body as Record<string, unknown>);

  if (
    typeof candidate.technician === "string" &&
    typeof candidate.completedAt === "string"
  ) {
    return {
      technician: candidate.technician,
      completedAt: candidate.completedAt,
    };
  }

  return undefined;
}

/**
 * Process every pending step for one job until it is synced or fails
 *
 * @param jobId the job identifier
 *
 * @returns the outcome of the job
 */
async function processJob(jobId: string): Promise<JobOutcome> {
  let item = await getQueueItem(jobId);

  while (item) {
    const claimed = await markQueueSending(jobId);
    if (!claimed) return "skipped";

    try {
      if (claimed.step === "worksheet") {
        const draft = await getWorksheet(jobId);
        if (!draft) throw new RejectedError("Worksheet not found");

        const conflict = claimed.resolution
          ? {
              resolution: claimed.resolution,
              ...(claimed.conflictWith
                ? {
                    otherTechnician: claimed.conflictWith.technician,
                    otherCompletedAt: claimed.conflictWith.completedAt,
                  }
                : {}),
              note:
                claimed.resolution === "send_both"
                  ? "Both worksheets were kept; the office has to decide."
                  : "The technician kept this worksheet for the conflicted job.",
            }
          : undefined;

        const payload = await prepareWorksheetUpload(jobId, conflict);
        if (JSON.stringify(payload).length > MAX_TOTAL_PHOTO_UPLOAD_BYTES) {
          throw new RejectedError(
            "There are too many photos to send in one worksheet. Open the job and remove some photos.",
          );
        }

        await uploadWorksheet(jobId, payload);
        await markWorksheetPhotosUploaded(jobId);

        const advanced = await advanceToStatus(jobId);
        if (!advanced) return "skipped";

        item = advanced;
        continue;
      }

      await setJobStatus(jobId, "synced");
      await markQueueSent(jobId);

      return "synced";
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        const conflictWith =
          conflictWithFrom(error) ??
          claimed.conflictWith ?? {
            technician: "Another technician",
            completedAt: nowLocalIso(),
          };
        const conflict = new ConflictError(error.message, conflictWith);
        await markQueueConflict(jobId, conflict.conflictWith);
        return "conflict";
      }

      const syncError =
        error instanceof ApiError && error.status === 404
          ? new JobGoneError()
          : error;

      if (isRejected(syncError) || claimed.attempts >= MAX_SYNC_ATTEMPTS) {
        await markQueueFailed(jobId, syncError);
        return "failed";
      }

      const nextAttemptAt = new Date(
        Date.now() + retryDelayMs(claimed.attempts),
      ).toISOString();
      await scheduleQueueRetry(jobId, syncError, nextAttemptAt);

      return syncError instanceof NetworkError ? "offline" : "retrying";
    }
  }

  return "skipped";
}

/**
 * Flush every queue item that is due right now, sequentially
 *
 * If the connection is lost, the run stops after the first network failure so
 * the remaining jobs do not burn their retry attempts
 *
 * @returns a summary of the run
 */
async function runQueue(force: boolean): Promise<SyncRunResult> {
  const now = Date.now();
  const items = await listQueueItems();
  const jobIds = [
    ...new Set(
      items
        .filter(
          (item) =>
            (item.status === "pending" || item.status === "sending") &&
            (force || isDue(item, now)),
        )
        .sort(compareQueueItems)
        .map((item) => item.jobId),
    ),
  ];

  const result: SyncRunResult = {
    attempted: 0,
    synced: 0,
    failed: 0,
    retrying: 0,
    conflicts: 0,
  };

  for (const jobId of jobIds) {
    result.attempted += 1;
    const outcome = await processJob(jobId);

    if (outcome === "synced") result.synced += 1;
    if (outcome === "failed") result.failed += 1;
    if (outcome === "retrying") result.retrying += 1;
    if (outcome === "conflict") result.conflicts += 1;

    if (outcome === "offline") {
      result.retrying += 1;
      break;
    }
  }

  return result;
}

/**
 * Get the earliest time at which a queued item should be retried
 *
 * @returns an ISO timestamp, or undefined when nothing is pending
 */
export async function getNextSyncAt(): Promise<string | undefined> {
  const now = new Date().toISOString();
  const times = (await listQueueItems())
    .filter((item) => item.status === "pending" || item.status === "sending")
    .map((item) => item.nextAttemptAt ?? now)
    .sort();

  return times[0];
}

/**
 * Run the sync engine, sharing the active run when called concurrently.
 *
 * @param options.force ignore the backoff timer so a manual attempt can be made
 *
 * @returns the summary of the current run
 */
export function flushQueue(
  options: { force?: boolean } = {},
): Promise<SyncRunResult> {
  if (activeRun) return activeRun;

  const run = runQueue(options.force ?? false).finally(() => {
    if (activeRun === run) activeRun = undefined;
  });
  activeRun = run;

  return run;
}
