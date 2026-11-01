import Link from "next/link";

interface ActionBarProps {
  pendingCount: number;
  nextJob?: {
    id: string;
    time: string;
    site: string;
  };
}

export function ActionBar({ pendingCount, nextJob }: ActionBarProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-surface shadow-lg">
      <div className="mx-auto flex max-w-[880px] items-center gap-3 px-4 py-3">
        <Link
          href="/sync"
          className="flex min-h-[48px] shrink-0 items-center justify-center rounded-md border border-border-strong bg-surface px-4 py-2 text-md font-medium text-ink hover:bg-surface-hover"
        >
          Sync ({pendingCount})
        </Link>
        {nextJob ? (
          <Link
            href={`/jobs/${nextJob.id}`}
            className="flex min-h-[48px] flex-1 items-center justify-center rounded-md bg-primary px-5 py-2 text-base font-medium text-ink-inverse hover:bg-primary-hover"
          >
            Start next job — {nextJob.time} {nextJob.site}
          </Link>
        ) : (
          <button
            type="button"
            disabled
            className="min-h-[48px] flex-1 rounded-md bg-primary px-5 py-2 text-base font-medium text-ink-inverse disabled:cursor-not-allowed disabled:opacity-50"
          >
            No jobs left today
          </button>
        )}
      </div>
    </div>
  );
}
