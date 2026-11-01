import type { JobRecord } from "@/lib/db";
import { JobCard } from "./JobCard";
import { dayStats } from "@/lib/today";

interface JobListProps {
  jobs: JobRecord[];
}

export function JobList({ jobs }: JobListProps) {
  const stats = dayStats(jobs);
  const rows = [
    { label: "Sent to the office", value: stats.synced, color: "ink" as const },
    {
      label: "Waiting on this tablet",
      value: stats.queued,
      color: "warning" as const,
    },
    {
      label: "Need your decision",
      value: stats.conflict,
      color: "danger" as const,
    },
  ];

  return (
    <>
      <div className="grid grid-cols-3 gap-3 mb-4 max-[520px]:grid-cols-1">
        {rows.map((row) => (
          <div
            key={row.label}
            className="px-4 py-3 bg-surface border border-border rounded-lg shadow-sm flex flex-col gap-2"
          >
            <span className="text-sm text-ink-secondary font-medium">
              {row.label}
            </span>
            <span
              className={`text-xl font-semibold tabular-nums ${
                row.color === "warning"
                  ? "text-warning"
                  : row.color === "danger"
                    ? "text-danger"
                    : "text-ink"
              }`}
            >
              {row.value}
            </span>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-3 mb-3 mt-5 text-sm font-semibold uppercase tracking-wider text-ink-muted">
        Today&apos;s jobs
        <div className="flex-1 h-[1px] bg-border"></div>
      </div>
      <div>{jobs.map((job) => <JobCard key={job.id} job={job} />)}</div>
    </>
  );
}
