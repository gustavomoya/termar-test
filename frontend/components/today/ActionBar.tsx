import Link from "next/link";

interface ActionBarProps {
  online: boolean;
  pendingCount: number;
  nextJob?: {
    time: string;
    site: string;
  };
}

export function ActionBar({ online, pendingCount, nextJob }: ActionBarProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-surface shadow-lg">
      <div className="mx-auto flex max-w-[880px] items-center gap-3 px-4 py-3">
        <Link
          href="/sync"
          className={`flex min-h-[48px] shrink-0 items-center justify-center rounded-lg border px-4 py-2 text-base font-medium ${
            online
              ? "border-transparent bg-surface-hover text-ink hover:bg-surface-hover"
              : "border-warning-border bg-warning-soft text-warning"
          }`}
        >
          {online ? `Sync (${pendingCount})` : "No signal"}
        </Link>
        <button
          className="min-h-[48px] flex-1 rounded-lg bg-primary px-5 py-2 text-base font-medium text-ink-inverse hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
          disabled={!nextJob}
        >
          {nextJob
            ? `Start next job — ${nextJob.time} ${nextJob.site}`
            : "No jobs left today"}
        </button>
      </div>
    </div>
  );
}
