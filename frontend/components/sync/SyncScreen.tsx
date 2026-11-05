import Link from "next/link";
import { PageContainer } from "@/components/layout/PageContainer";

/**
 * Sync screen
 */
export function SyncScreen() {

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
        </div>
      </header>

      <main className="flex-1 space-y-4 p-4 pb-[112px]">
        <section className="overflow-hidden rounded-lg border border-border bg-surface shadow-sm">
          <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
                  <span className="text-base font-semibold">
                    Waiting to be sent
                  </span>
            <span className="text-sm text-ink-secondary">
                    5 items waiting on this
                    tablet
                  </span>
          </div>
        </section>
      </main>
    </PageContainer>
);
}
