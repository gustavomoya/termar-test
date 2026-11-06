import Link from "next/link";
import type { JobRecord } from "@/lib/db";
import { formatTime, plantLabel } from "@/lib/today";
import { ConnectionControls } from "@/components/shared/ConnectionControls";

interface WorksheetHeaderProps {
  job: JobRecord;
  online: boolean;
  savedAt?: string;
  readOnly: boolean;
}

export function WorksheetHeader({
  job,
  online,
  savedAt,
  readOnly,
}: WorksheetHeaderProps) {
  return (
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
              {job.reference} · {plantLabel(job.plantType)}
            </div>
            <div className="truncate text-lg font-semibold">
              {job.site.name}
            </div>
          </div>
        </div>
        <ConnectionControls online={online} />
      </div>

      {job.status === "conflict" ? (
        <div className="flex items-center gap-3 border-b border-danger-border bg-danger-soft px-4 py-3 text-sm font-medium text-danger">
          <span aria-hidden="true">!</span>
          <span className="grow">
            This job was completed twice. Resolve it from the sync screen.
          </span>
          <Link href="/sync" className="underline underline-offset-4">
            See what
          </Link>
        </div>
      ) : job.status === "synced" ? (
        <div className="flex items-center gap-3 border-b border-success-border bg-success-soft px-4 py-3 text-sm font-medium text-success">
          <span aria-hidden="true">✓</span>
          <span className="grow">
            {readOnly
              ? "At the office. This worksheet can no longer be changed."
              : savedAt
                ? `At the office. New work saved on this tablet at ${formatTime(savedAt)}.`
                : "At the office. No worksheet is stored on this tablet yet."}
          </span>
        </div>
      ) : savedAt ? (
        <div className="flex items-center gap-3 border-b border-success-border bg-success-soft px-4 py-3 text-sm font-medium text-success">
          <span aria-hidden="true">✓</span>
          <span className="grow">
            Saved on this tablet at {formatTime(savedAt)}. It will be sent
            automatically.
          </span>
        </div>
      ) : (
        <div className="flex items-center gap-3 border-b border-info-border bg-info-soft px-4 py-3 text-sm font-medium text-info">
          <span aria-hidden="true">✓</span>
          <span className="grow">
            Your work is saved on this tablet automatically.
          </span>
        </div>
      )}
    </header>
  );
}
