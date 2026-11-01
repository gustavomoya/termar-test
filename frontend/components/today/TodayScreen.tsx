'use client';

import { useEffect } from "react";
import { useDayStore } from "@/lib/stores/dayStore";
import { useNetworkStore } from "@/lib/stores/networkStore";
import {
  formatTime,
  nextJob,
  pendingItemCount,
  shortSite,
} from "@/lib/today";
import { FieldHeader } from "./FieldHeader";
import { JobList } from "./JobList";
import { ActionBar } from "./ActionBar";

export function TodayScreen() {
  const { day, jobs, error, hydrate, refresh } = useDayStore();
  const { online, setOnline } = useNetworkStore();

  useEffect(() => {
    setOnline(navigator.onLine);
    hydrate();

    const handleOnline = () => {
      setOnline(true);
      refresh();
    };
    const handleOffline = () => setOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [hydrate, refresh, setOnline]);

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

  const pendingCount = pendingItemCount(jobs);
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
