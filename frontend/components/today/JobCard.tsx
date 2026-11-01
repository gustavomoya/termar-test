import Link from "next/link";
import type { JobRecord } from "@/lib/db";
import { formatTime, plantLabel, statusLabel } from "@/lib/today";

interface JobCardProps {
  job: JobRecord;
}

const STATUS_COLOR: Record<
  string,
  { bg: string; text: string }
> = {
  synced: { bg: "bg-success-soft", text: "text-success" },
  queued: { bg: "bg-warning-soft", text: "text-warning" },
  conflict: { bg: "bg-danger-soft", text: "text-danger" },
  pending: { bg: "bg-neutral-soft", text: "text-ink-muted" },
};

export function JobCard({ job }: JobCardProps) {
  const color = STATUS_COLOR[job.status] ?? STATUS_COLOR.pending;

  return (
    <Link
      href={`/jobs/${job.id}`}
      className="block bg-surface border border-border rounded-lg shadow-sm p-4 mb-3 min-h-[96px] text-ink hover:border-primary-border hover:no-underline transition-colors"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="text-xl font-semibold tabular-nums leading-none">
            {formatTime(job.scheduledAt)}
          </div>
          <div className="text-base font-semibold mt-1">{job.site.name}</div>
          <div className="text-xs text-ink-secondary mt-1">{job.task}</div>
        </div>
        <div className="text-right">
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-transparent ${color.bg} ${color.text} text-xs font-semibold`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-current" aria-hidden="true"></span>
            {statusLabel(job.status)}
          </span>
          <div className="text-xs text-ink-secondary mt-1">
            {job.estimatedMinutes} min · {plantLabel(job.plantType)}
          </div>
        </div>
      </div>
      <div className="mt-3 px-3 py-2 bg-surface-sunken rounded-md text-xs text-ink-secondary">
        {job.site.address} · {job.site.access}
      </div>
    </Link>
  );
}
