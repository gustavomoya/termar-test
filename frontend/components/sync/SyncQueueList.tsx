import type { QueueItemStatus } from "@/lib/db";
import type { SyncJobGroup, SyncItem } from "@/lib/services/sync";
import { formatBytes } from "@/lib/format";
import { formatTime } from "@/lib/today";

const STEP_ICON: Record<string, string> = {
  worksheet: "▤",
  status: "✓",
};

const STATUS_META: Record<
  QueueItemStatus,
  { label: string; className: string }
> = {
  pending: {
    label: "Waiting for signal",
    className: "border-warning-border bg-warning-soft text-warning",
  },
  sending: {
    label: "Sending now",
    className: "border-info-border bg-info-soft text-info",
  },
  failed: {
    label: "Could not send",
    className: "border-danger-border bg-danger-soft text-danger",
  },
  conflict: {
    label: "Needs your decision",
    className: "border-danger-border bg-danger-soft text-danger",
  },
  sent: {
    label: "At the office",
    className: "border-success-border bg-success-soft text-success",
  },
};

interface QueueRowItem extends SyncItem {
  jobId: string;
  reference: string;
}

interface SyncQueueListProps {
  groups: SyncJobGroup[];
  waiting: number;
  waitingBytes: number;
}

function attemptsLabel(attempts: number): string {
  if (attempts === 0) return "Not tried yet";

  return `${attempts} attempt${attempts === 1 ? "" : "s"}`;
}

function SyncQueueRow({ item }: { item: QueueRowItem }) {
  const status = STATUS_META[item.status];

  return (
    <li className="flex items-start gap-3 px-4 py-3">
      <span
        className="grid h-11 w-11 shrink-0 place-items-center rounded-md bg-surface-sunken text-lg text-ink-secondary"
        aria-hidden="true"
      >
        {STEP_ICON[item.step] ?? "•"}
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
          <span className="text-md font-medium">{item.label}</span>
          <span
            className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold ${status.className}`}
          >
            <span
              className="h-1.5 w-1.5 rounded-full bg-current"
              aria-hidden="true"
            />
            {status.label}
          </span>
        </div>

        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-sm text-ink-secondary">
          <span>{item.reference}</span>
          <span>{formatBytes(item.sizeBytes)}</span>
          <span>{attemptsLabel(item.attempts)}</span>
          {item.status === "pending" && item.nextAttemptAt && (
            <span>Next try {formatTime(item.nextAttemptAt)}</span>
          )}
        </div>

        {item.lastError && item.status !== "pending" && (
          <p
            role="status"
            className="mt-2 rounded-md bg-danger-soft px-3 py-2 text-sm text-danger"
          >
            {item.lastError}
          </p>
        )}
      </div>
    </li>
  );
}

/**
 * The outbound queue grouped by job. Every row says what is still on this
 * tablet, how much it weighs, how many times it was tried and why it is not
 * at the office yet.
 */
export function SyncQueueList({
  groups,
  waiting,
  waitingBytes,
}: SyncQueueListProps) {
  const items: QueueRowItem[] = groups.flatMap((group) =>
    group.items.map((item) => ({
      ...item,
      jobId: group.jobId,
      reference: group.reference,
    })),
  );

  if (items.length === 0) return null;

  const title = waiting > 0 ? "Waiting to be sent" : "Could not be sent";
  const summary =
    waiting > 0
      ? `${waiting} ${waiting === 1 ? "item" : "items"} waiting · ${formatBytes(waitingBytes)} on this tablet`
      : `${items.length} ${items.length === 1 ? "item" : "items"} still on this tablet`;

  return (
    <section className="overflow-hidden rounded-lg border border-border bg-surface shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-b border-border px-4 py-3">
        <span className="text-base font-semibold">{title}</span>
        <span className="text-sm text-ink-secondary">{summary}</span>
      </div>

      <ul className="divide-y divide-border">
        {items.map((item) => (
          <SyncQueueRow key={`${item.jobId}-${item.step}`} item={item} />
        ))}
      </ul>
    </section>
  );
}
