import Link from "next/link";
import type { DayInfo } from "@/lib/db";
import { formatDay } from "@/lib/today";
import { ConnectionControls } from "@/components/shared/ConnectionControls";

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
          <h1 className="text-lg font-semibold">
            {day.technician.name} · {day.technician.van}
          </h1>
        </div>
        <ConnectionControls online={online} />
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
