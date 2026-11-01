import Link from "next/link";
import type { JobRecord, JobSyncStatus } from "@/lib/db";
import { formatTime, plantLabel, statusLabel } from "@/lib/today";

interface JobCardProps {
  job: JobRecord;
}

const STATUS_STYLE: Record<
  JobSyncStatus,
  { bg: string; text: string; border: string }
> = {
  synced: {
    bg: "bg-success-soft",
    text: "text-success",
    border: "var(--color-success)",
  },
  queued: {
    bg: "bg-warning-soft",
    text: "text-warning",
    border: "var(--color-warning)",
  },
  conflict: {
    bg: "bg-danger-soft",
    text: "text-danger",
    border: "var(--color-danger)",
  },
  failed: {
    bg: "bg-danger-soft",
    text: "text-danger",
    border: "var(--color-danger)",
  },
  pending: {
    bg: "bg-neutral-soft",
    text: "text-ink-muted",
    border: "var(--color-border-strong)",
  },
};

export function JobCard({ job }: JobCardProps) {
  const style = STATUS_STYLE[job.status] ?? STATUS_STYLE.pending;

  return (
    <Link
      href={`/jobs/${job.id}`}
      style={{ borderLeftColor: style.border }}
      className="block bg-surface border border-border border-l-4 rounded-lg shadow-sm p-4 mb-3 min-h-[96px] text-ink hover:border-primary-border hover:no-underline transition-colors"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="text-xl font-semibold tabular-nums leading-none">
            {formatTime(job.scheduledAt)}
          </div>
          <div className="text-base font-semibold mt-1">{job.site.name}</div>
          <div className="text-md text-ink-secondary mt-1">{job.task}</div>
        </div>
        <div className="text-right">
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-transparent ${style.bg} ${style.text} text-xs font-semibold`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-current" aria-hidden="true"></span>
            {statusLabel(job.status)}
          </span>
          <div className="text-sm text-ink-secondary mt-1">
            {job.estimatedMinutes} min · {plantLabel(job.plantType)}
          </div>
        </div>
      </div>
      <div className="mt-3 px-3 py-2 bg-surface-sunken rounded-md text-sm text-ink-secondary">
        {job.site.address} · {job.site.access}
      </div>
    </Link>
  );
}
