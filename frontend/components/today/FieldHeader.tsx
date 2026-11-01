import Link from "next/link";
import type { DayInfo } from "@/lib/db";
import { formatDay } from "@/lib/today";

interface FieldHeaderProps {
  day: DayInfo;
  online: boolean;
  pendingCount: number;
}

export function FieldHeader({ day, online, pendingCount }: FieldHeaderProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-surface">
      <div className="flex min-h-[60px] items-center justify-between gap-3 px-4 py-3">
        <div>
          <div className="text-sm text-ink-secondary">{formatDay(day.day)}</div>
          <div className="text-lg font-semibold">
            {day.technician.name} · {day.technician.van}
          </div>
        </div>
        <Link
          href="/sync"
          className={`inline-flex min-h-[48px] items-center gap-2 rounded-full border px-3 font-semibold text-sm ${
            online
              ? "border-success-border bg-success-soft text-success"
              : "border-warning-border bg-warning-soft text-warning"
          }`}
        >
          <span
            className="h-2 w-2 rounded-full bg-current"
            aria-hidden="true"
          ></span>
          {online ? "Online" : "No signal"}
        </Link>
      </div>
      {pendingCount > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 border-b border-warning-border bg-warning-soft text-warning text-sm font-medium">
          <span aria-hidden="true">⤓</span>
          <span className="grow">
            {pendingCount} items are saved on this tablet and will be sent as soon
            as you have signal.
          </span>
          <Link
            href="/sync"
            className="underline underline-offset-4 hover:no-underline"
          >
            See what
          </Link>
        </div>
      )}
    </header>
  );
}
