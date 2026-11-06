import {
  deleteQueueItem,
  getJob,
  getQueueItem,
  patchJob,
  putQueueItem,
  type ConflictWith,
  type QueueErrorKind,
  type QueueItem,
} from "@/lib/db";
import { notifyQueueChanged } from "@/lib/sync/events";
import { nowLocalIso } from "@/lib/time";
import { ApiError, NetworkError } from "@/lib/api/client";
import { JobGoneError, RejectedError } from "@/lib/sync/errors";

interface SyncFailure {
  message: string;
  kind: QueueErrorKind;
}

/**
 * Convert an unknown sync error into a message and a kind that can be stored in
 * the queue. The kind tells the UI which recovery actions are useful.
 *
 * @param error the error raised while syncing
 *
 * @returns a readable message and its category
 */
function describeError(error: unknown): SyncFailure {
  if (error instanceof JobGoneError) {
    return {
      message:
        "This job no longer exists at the office. Your worksheet stays on this tablet.",
      kind: "gone",
    };
  }

  if (error instanceof RejectedError) {
    return { message: error.message, kind: "local" };
  }

  if (error instanceof NetworkError) {
    return {
      message: "Could not reach the office. Your work stays on this tablet.",
      kind: "network",
    };
  }

  if (error instanceof ApiError) {
    if (error.status === 404) {
      return {
        message:
          "This job no longer exists at the office. Your worksheet stays on this tablet.",
        kind: "gone",
      };
    }

    if (error.status >= 500) {
      return {
        message: `The office could not accept this worksheet (HTTP ${error.status}). It stays on this tablet; try again in a moment.`,
        kind: "server",
      };
    }

    return {
      message: `The office rejected this worksheet (HTTP ${error.status}). Open the job, correct it and try again.`,
      kind: "rejected",
    };
  }

  if (error instanceof Error) return { message: error.message, kind: "local" };
  if (typeof error === "string") return { message: error, kind: "local" };

  return { message: "Sync failed", kind: "local" };
}

export interface EnqueueOptions {
  resolution?: QueueItem["resolution"];
  conflictWith?: ConflictWith;
}

/**
 * Add a job to the outbox, or reset its existing item so the latest worksheet
 * is sent again. The job is marked as queued on the db
 *
 * @param jobId   the job identifier
 * @param options how the job was resolved when it came from a conflict
 *
 * @returns the queued item
 */
export async function enqueueWorksheet(
  jobId: string,
  options: EnqueueOptions = {},
): Promise<QueueItem> {
  const job = await getJob(jobId);
  if (!job) throw new Error(`Job ${jobId} not found`);

  const now = nowLocalIso();
  const existing = await getQueueItem(jobId);
  const item: QueueItem = {
    jobId,
    step: "worksheet",
    status: "pending",
    attempts: 0,
    ...(options.resolution ? { resolution: options.resolution } : {}),
    ...(options.conflictWith ? { conflictWith: options.conflictWith } : {}),
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };

  await putQueueItem(item);
  notifyQueueChanged();
  await patchJob(jobId, { status: "queued", queuedItems: 1 });

  return item;
}

/**
 * Queue a status-only update, used when the technician accepts the office's
 * copy of a conflicted job and no worksheet has to be uploaded.
 *
 * @param jobId the job identifier
 *
 * @returns the queued item
 */
export async function enqueueStatus(jobId: string): Promise<QueueItem> {
  const job = await getJob(jobId);
  if (!job) throw new Error(`Job ${jobId} not found`);

  const now = nowLocalIso();
  const existing = await getQueueItem(jobId);
  const item: QueueItem = {
    jobId,
    step: "status",
    status: "pending",
    attempts: 0,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };

  await putQueueItem(item);
  notifyQueueChanged();

  return item;
}

/**
 * Mark the queued item as being sent and count the attempt
 *
 * @param jobId the job identifier
 *
 * @returns the updated item, or undefined when nothing is queued
 */
export async function markQueueSending(
  jobId: string,
): Promise<QueueItem | undefined> {
  const item = await getQueueItem(jobId);
  if (!item) return undefined;

  const now = nowLocalIso();
  const next: QueueItem = {
    ...item,
    status: "sending",
    attempts: item.attempts + 1,
    lastAttemptAt: now,
    nextAttemptAt: undefined,
    updatedAt: now,
  };

  await putQueueItem(next);
  notifyQueueChanged();
  return next;
}

/**
 * Move the item from the worksheet upload to the status update after a
 * successful upload
 *
 * @param jobId the job identifier
 *
 * @returns the updated item, or undefined when nothing is queued
 */
export async function advanceToStatus(
  jobId: string,
): Promise<QueueItem | undefined> {
  const item = await getQueueItem(jobId);
  if (!item) return undefined;

  const now = nowLocalIso();
  const next: QueueItem = {
    ...item,
    step: "status",
    status: "pending",
    attempts: 0,
    lastAttemptAt: undefined,
    nextAttemptAt: undefined,
    lastError: undefined,
    lastErrorKind: undefined,
    updatedAt: now,
  };

  await putQueueItem(next);
  notifyQueueChanged();
  return next;
}

/**
 * Keep the item pending and set the earliest time for the next attempt
 *
 * @param jobId         the job identifier
 * @param error         the error that caused the retry
 * @param nextAttemptAt when the item can be tried again
 *
 * @returns the updated item, or undefined when nothing is queued
 */
export async function scheduleQueueRetry(
  jobId: string,
  error: unknown,
  nextAttemptAt: string,
): Promise<QueueItem | undefined> {
  const item = await getQueueItem(jobId);
  if (!item) return undefined;

  const failure = describeError(error);
  const next: QueueItem = {
    ...item,
    status: "pending",
    lastError: failure.message,
    lastErrorKind: failure.kind,
    nextAttemptAt,
    updatedAt: nowLocalIso(),
  };

  await putQueueItem(next);
  notifyQueueChanged();
  return next;
}

/**
 * Give up on the item after the maximum number of attempts and mark the job
 * as failed on the db
 *
 * @param jobId the job identifier
 * @param error the last error raised while syncing
 *
 * @returns the updated item, or undefined when nothing is queued
 */
export async function markQueueFailed(
  jobId: string,
  error: unknown,
): Promise<QueueItem | undefined> {
  const item = await getQueueItem(jobId);
  if (!item) return undefined;

  const failure = describeError(error);
  const next: QueueItem = {
    ...item,
    status: "failed",
    lastError: failure.message,
    lastErrorKind: failure.kind,
    nextAttemptAt: undefined,
    updatedAt: nowLocalIso(),
  };

  await putQueueItem(next);
  notifyQueueChanged();
  await patchJob(jobId, { status: "failed", queuedItems: 1 });

  return next;
}

export async function retryQueueItem(jobId: string): Promise<QueueItem | undefined> {
  const item = await getQueueItem(jobId);
  if (!item) return undefined;

  const now = nowLocalIso();
  const next: QueueItem = {
    ...item,
    status: "pending",
    attempts: 0,
    lastError: undefined,
    lastErrorKind: undefined,
    nextAttemptAt: undefined,
    updatedAt: now,
  };

  await putQueueItem(next);
  notifyQueueChanged();
  await patchJob(jobId, { status: "queued", queuedItems: 1 });

  return next;
}

/**
 * Mark the item and the job as conflicting so the technician can decide later
 *
 * @param jobId        the job identifier
 * @param conflictWith the technician and time of the other worksheet
 *
 * @returns the updated item, or undefined when nothing is queued
 */
export async function markQueueConflict(
  jobId: string,
  conflictWith: ConflictWith,
): Promise<QueueItem | undefined> {
  const item = await getQueueItem(jobId);
  if (!item) return undefined;

  const next: QueueItem = {
    ...item,
    status: "conflict",
    lastError: undefined,
    lastErrorKind: undefined,
    nextAttemptAt: undefined,
    updatedAt: nowLocalIso(),
  };

  await putQueueItem(next);
  notifyQueueChanged();
  await patchJob(jobId, {
    status: "conflict",
    queuedItems: 1,
    conflictWith,
  });

  return next;
}

/**
 * Clear the queued item after a successful sync and mark the job as synced
 *
 * @param jobId the job identifier
 */
export async function markQueueSent(jobId: string): Promise<void> {
  const now = nowLocalIso();

  await patchJob(jobId, {
    status: "synced",
    queuedItems: 0,
    syncedAt: now,
    localOnly: false,
    conflictWith: undefined,
  });
  await deleteQueueItem(jobId);
  notifyQueueChanged();
}
