import { create } from "zustand";
import {
  loadSyncOverview,
  loadConflicts,
  type ConflictSummary,
  type SyncOverview,
} from "@/lib/services/sync";
import { readTodayCache } from "@/lib/services/today";
import {
  deleteQueueItem,
  deleteWorksheet,
  getJob,
  getWorksheet,
  isQuotaExceededError,
  patchJob,
  putArchivedWorksheet,
  QUOTA_EXCEEDED_MESSAGE,
  type ArchivedWorksheet,
  type ConflictResolution,
  type JobRecord,
  type QueueConflictResolution,
  type WorksheetDraft,
} from "@/lib/db";
import { enqueueStatus, enqueueWorksheet, retryQueueItem } from "@/lib/sync/outbox";
import { flushQueue } from "@/lib/sync/engine";
import { useDayStore } from "@/lib/stores/dayStore";
import { useNetworkStore } from "@/lib/stores/networkStore";
import { nowLocalIso } from "@/lib/time";

export type ConflictDecision = "mine" | "other" | "both";

interface SyncState {
  overview?: SyncOverview;
  conflicts: ConflictSummary[];
  loading: boolean;
  sending: boolean;
  error?: unknown;
  sendError?: string;

  hydrate: () => Promise<void>;
  refresh: () => Promise<void>;
  retryJob: (jobId: string) => Promise<void>;
  sendNow: () => Promise<void>;
  resolveConflict: (jobId: string, decision: ConflictDecision) => Promise<void>;
}

const TIMEOUT_MS = 8000;

function withTimeout<T>(promise: Promise<T>): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(
        () => reject(new Error("Timed out reading the sync queue")),
        TIMEOUT_MS,
      ),
    ),
  ]);
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

/**
 * Store one side of a resolved conflict in the local archive.
 *
 * The discarded worksheet is never deleted silently: it stays on the tablet
 * together with who wrote it and how the conflict was resolved.
 */
async function archiveSide(
  job: JobRecord,
  side: ArchivedWorksheet["side"],
  resolution: ConflictResolution,
  worksheet: WorksheetDraft | undefined,
): Promise<void> {
  const archivedAt = nowLocalIso();
  const technician =
    side === "mine"
      ? (await readTodayCache())?.day.technician.name ?? "This technician"
      : job.conflictWith?.technician ?? "Unknown";

  const entry: ArchivedWorksheet = {
    id: `${job.id}:${side}:${archivedAt}`,
    jobId: job.id,
    reference: job.reference,
    site: job.site.name,
    side,
    resolution,
    technician,
    ...(worksheet?.stoppedAt
      ? { completedAt: worksheet.stoppedAt }
      : job.conflictWith
        ? { completedAt: job.conflictWith.completedAt }
        : {}),
    ...(worksheet ? { worksheet } : {}),
    ...(job.conflictWith ? { conflictWith: job.conflictWith } : {}),
    archivedAt,
  };

  await putArchivedWorksheet(entry);
}

export const useSyncStore = create<SyncState>((set, get) => {
  const reload = async () => {
    set({ loading: true, error: undefined });

    try {
      const [overview, conflicts] = await withTimeout(
        Promise.all([loadSyncOverview(), loadConflicts()]),
      );

      set({ overview, conflicts, loading: false });
    } catch (error) {
      set({ loading: false, error });
    }
  };

  const reloadAfterDecision = async () => {
    await Promise.all([reload(), useDayStore.getState().reloadFromCache()]);
  };

  return {
    overview: undefined,
    conflicts: [],
    loading: false,
    sending: false,
    error: undefined,
    sendError: undefined,
    hydrate: reload,
    refresh: reload,

    /**
     * Apply the technician's decision to a conflicted job.
     *
     * The local worksheet is never discarded without being archived first,
     * and no decision closes the conflict if the required local work is
     * missing. If the tablet is offline the decision
     * is persisted and queued for the normal sync engine.
     *
     * @param jobId    the conflicted job
     * @param decision "mine" keeps this tablet's worksheet, "other" accepts
     *                 the office's copy and "both" keeps and sends both sides
     */
    resolveConflict: async (jobId, decision) => {
      // One resolution at a time - the same conflict cannot be archived or enqueued twice.
      if (get().sending) return;

      set({ sending: true, sendError: undefined });

      try {
        // Read the job and the local draft once. The draft is the technician's
        // side of the conflict and the only copy that can be lost here.
        const job = await getJob(jobId);
        if (!job) throw new Error("This job is not on the tablet any more.");

        const draft = await getWorksheet(jobId);
        const now = nowLocalIso();

        // ---------------------------------------------------------------
        // Keep the office's copy
        // ---------------------------------------------------------------
        // The office already has the other technician's worksheet, so nothing is uploaded.
        // Our draft is archived before deletion, then a status-only update
        // is queued to tell the backend the conflict is resolved.
        if (decision === "other") {
          if (draft) {
            await archiveSide(job, "mine", "keep_other", draft);
          }

          // Remove the discarded local work and any pending upload so it can
          // never overwrite the office's copy by accident.
          await deleteWorksheet(jobId);
          await deleteQueueItem(jobId);

          // Mark the job as resolved locally. Clearing conflictWith removes
          // it from the conflict list and from today's conflict counter.
          await patchJob(jobId, {
            status: "synced",
            conflictWith: undefined,
            queuedItems: 0,
            localOnly: false,
            syncedAt: now,
          });

          // Queue a status-only step. Keeping an item in the outbox means a
          // later network refresh cannot resurrect the conflict before the
          // office has been told, even if the tablet is offline right now.
          await enqueueStatus(jobId);

          // If online this reaches the office now; otherwise it stays queued
          // so a later refresh cannot bring the conflict back.
          await flushQueue({ force: true });
          await reloadAfterDecision();
          set({ sending: false });
          return;
        }

        // ---------------------------------------------------------------
        // Keep mine / send both
        // ---------------------------------------------------------------
        // Without a local worksheet there is nothing to keep or upload.
        // Leave the conflict open instead of pretending it was resolved.
        if (!draft) {
          set({
            sending: false,
            sendError:
              "There is no worksheet on this tablet to keep. The conflict is still open.",
          });
          return;
        }

        // The resolution travels with the queued item so the sync engine can
        // annotate the PUT with how the conflict was resolved.
        const resolution: QueueConflictResolution =
          decision === "both" ? "send_both" : "keep_mine";

        // "Send both" keeps our worksheet live and uploads it, but first we
        // archive both sides so nothing is lost if the office decides later.
        if (decision === "both") {
          await archiveSide(job, "mine", resolution, draft);
        }

        // In both remaining decisions the other technician's copy is the one being left out
        // of this upload, so always archive its available metadata. Her full
        // worksheet is not on this tablet, hence no worksheet snapshot here.
        await archiveSide(job, "other", resolution, undefined);

        // Reset the outbox item with the resolution metadata. The engine will
        // upload the draft and then mark the job as synced.
        await enqueueWorksheet(jobId, {
          resolution,
          conflictWith: job.conflictWith,
        });

        // Force an immediate attempt, ignoring any backoff left by earlier
        // failures. Offline is not fatal: the item stays queued with a retry.
        const result = await flushQueue({ force: true });
        await reloadAfterDecision();

        set({
          sending: false,
          // A retry result means the decision is saved on the tablet but the
          // office has not received the worksheet yet; say so explicitly.
          sendError:
            result.retrying > 0
              ? "Could not reach the office. Your worksheet stays on this tablet and will be sent automatically."
              : undefined,
        });
      } catch (error) {
        // Archiving or writing failed: surface the reason and keep the
        // conflict untouched so the technician can try again.
        set({
          sending: false,
          sendError: isQuotaExceededError(error)
            ? QUOTA_EXCEEDED_MESSAGE
            : errorMessage(error, "Could not resolve the conflict."),
        });
      }
    },

    /**
     * Reset a failed upload so the next flush retries the same worksheet.
     *
     * The worksheet itself is never deleted - only the queue item is reset
     * from `failed` back to `pending` with a clean attempt counter, so the
     * technician can keep working on the tablet if the office rejects the
     * upload later.
     *
     * @param jobId the job whose upload failed
     */
    retryJob: async (jobId) => {
      if (get().sending) return;

      set({ sending: true, sendError: undefined });

      try {
        await retryQueueItem(jobId);
        const result = await flushQueue({ force: true });
        await reloadAfterDecision();

        set({
          sending: false,
          sendError:
            result.retrying > 0
              ? "Could not reach the office. Your worksheet stays on this tablet and will be sent automatically."
              : undefined,
        });
      } catch (error) {
        set({
          sending: false,
          sendError: errorMessage(error, "Could not retry the upload."),
        });
      }
    },

    sendNow: async () => {
      if (get().sending) return;

      if (!useNetworkStore.getState().online) {
        set({
          sendError:
            "There is no signal right now. Your work stays on this tablet.",
        });
        return;
      }

      set({ sending: true, sendError: undefined });

      try {
        const result = await flushQueue({ force: true });
        await reloadAfterDecision();

        set({
          sending: false,
          sendError:
            result.retrying > 0
              ? "Could not reach the office. Your work stays on this tablet and will be sent automatically."
              : undefined,
        });
      } catch (error) {
        set({
          sending: false,
          sendError: errorMessage(error, "Could not send right now."),
        });
      }
    },
  };
});
