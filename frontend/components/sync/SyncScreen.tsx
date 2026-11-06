"use client";

import Link from "next/link";
import { PageContainer } from "@/components/layout/PageContainer";
import {useOnlineStatus} from "@/lib/hooks/useOnlineStatus";
import {ConnectionControls} from "@/components/shared/ConnectionControls";
import {useSyncStore} from "@/lib/stores/syncStore";
import {useEffect} from "react";
import {ConflictsList} from "@/components/sync/ConflictSection";
import {SyncQueueList} from "@/components/sync/SyncQueueList";
import {primaryButtonClass, secondaryButtonClass} from "@/components/worksheet/styles";

/**
 * Sync screen
 */
export function SyncScreen() {
  const online = useOnlineStatus();
  const overview = useSyncStore((state) => state.overview);
  const conflicts = useSyncStore((state) => state.conflicts);
  const loading = useSyncStore((state) => state.loading);
  const error = useSyncStore((state) => state.error);
  const sendError = useSyncStore((state) => state.sendError);
  const hydrate = useSyncStore((state) => state.hydrate);
  const retryJob = useSyncStore((state) => state.retryJob);
  const sendNow = useSyncStore((state) => state.sendNow);
  const sending = useSyncStore((state) => state.sending);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  const groups = overview?.groups ?? [];
  const waiting = overview?.waiting ?? 0;
  const waitingBytes = overview?.waitingBytes ?? 0;
  const failed = overview?.failed ?? 0;
  const conflict = conflicts.length;
  const hasWork = waiting + failed + conflict > 0;

  return (
      <PageContainer>
        <header className="sticky top-0 z-30 border-b border-border bg-surface">
          <div className="flex min-h-[60px] items-center justify-between gap-3 px-4 py-3">
            <div className="flex min-w-0 items-center gap-2">
              <Link
                  href="/"
                  aria-label="Back to today's jobs"
                  className="inline-flex min-h-[48px] min-w-[48px] shrink-0 items-center justify-center rounded-lg text-xl text-ink-secondary hover:bg-surface-sunken"
              >
                ←
              </Link>
              <div className="min-w-0">
                <div className="truncate text-sm text-ink-secondary">
                  Your work
                </div>
                <div className="truncate text-lg font-semibold">
                  What has been sent
                </div>
              </div>
            </div>
            <ConnectionControls online={online}/>
          </div>
        </header>

        <main className="flex-1 space-y-4 p-4 pb-[112px]">
          {error && !overview ? (
              <div className="rounded-lg border border-danger-border bg-danger-soft p-4 text-sm text-danger">
                <p className="font-medium">Could not read the sync queue.</p>
                <button
                    type="button"
                    onClick={() => void hydrate()}
                    className="mt-3 min-h-[48px] text-sm underline underline-offset-4"
                >
                  Try again
                </button>
              </div>
          ) : !overview && loading ? (
              <div className="rounded-lg border border-border bg-surface p-4 text-sm text-ink-secondary">
                Loading what is on this tablet…
              </div>
          ) : hasWork ? (
              <>
                {sendError && (
                    <div
                        role="alert"
                        className="rounded-lg border border-danger-border bg-danger-soft px-4 py-3 text-sm text-danger"
                    >
                      {sendError}
                    </div>
                )}
                {conflict > 0 && <ConflictsList/>}
                <SyncQueueList
                    groups={groups}
                    waiting={waiting}
                    waitingBytes={waitingBytes}
                    onRetry={retryJob}
                />
              </>
          ) : (
              <div className="rounded-lg border border-success-border bg-success-soft p-4 text-sm text-success">
                Everything is at the office. There is nothing waiting on this
                tablet.
              </div>
          )}

          <div className="rounded-lg border border-info-border bg-info-soft px-4 py-3 text-sm text-info">
            Nothing here is lost if the tablet is switched off, runs out of
            battery, or is closed. Everything is sent by itself the moment the
            van has signal.
          </div>
        </main>

        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface shadow-[0_-2px_12px_rgba(16,24,40,0.08)]">
          <div className="mx-auto flex w-full max-w-[880px] gap-2 p-4">
            <Link href="/" className={secondaryButtonClass}>
              Back to jobs
            </Link>
            <button
                type="button"
                onClick={() => void sendNow()}
                disabled={!online || sending || waiting === 0}
                className={`${primaryButtonClass} flex-1`}
            >
              {!online
                  ? "Try sending now — no signal"
                  : sending
                      ? "Sending…"
                      : "Try sending now"}
            </button>
          </div>
        </div>
      </PageContainer>
  );
}
