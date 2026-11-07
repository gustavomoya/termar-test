'use client';

import { useEffect } from "react";
import { useDayStore } from "@/lib/stores/dayStore";
import { useOnlineStatus } from "@/lib/hooks/useOnlineStatus";
import {
  formatTime,
  nextJob,
  shortSite,
} from "@/lib/today";
import { FieldHeader } from "./FieldHeader";
import { JobList } from "./JobList";
import { ActionBar } from "./ActionBar";

export function TodayScreen() {
  const { day, jobs, pendingCount, error, hydrate, refresh } = useDayStore();
  const online = useOnlineStatus();

  useEffect(() => {
    hydrate();

    const handleOnline = () => {
      refresh();
    };

    window.addEventListener("online", handleOnline);
    return () => {
      window.removeEventListener("online", handleOnline);
    };
  }, [hydrate, refresh]);

  if (error && !day) {
    return (
      <div className="p-4">
        <div className="flex items-start gap-3 rounded-md border border-danger-border bg-danger-soft px-4 py-3 text-sm text-danger">
          Could not load today&apos;s jobs.
        </div>
        <button
          type="button"
          onClick={() => hydrate()}
          className="mt-4 text-xs text-primary"
        >
          Try again
        </button>
      </div>
    );
  }

  if (!day) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="text-sm text-ink-secondary">Loading today…</div>
      </div>
    );
  }

  const next = nextJob(jobs);

  return (
    <>
      <FieldHeader
        day={day}
        online={online}
        pendingCount={pendingCount}
      />
      <main className="flex-1 p-4 pb-[104px]">
        <JobList jobs={jobs} />
        <div className="mt-4 flex items-start gap-3 px-4 py-3 border border-info-border rounded-md bg-info-soft text-info text-sm">
          You can work through every job here with no signal at all. Nothing is
          sent until the van passes coverage, and nothing is lost if it does not.
        </div>
      </main>
      <ActionBar
        pendingCount={pendingCount}
        nextJob={
          next
            ? {
                id: next.id,
                time: formatTime(next.scheduledAt),
                site: shortSite(next.site.name),
              }
            : undefined
        }
      />
    </>
  );
}
