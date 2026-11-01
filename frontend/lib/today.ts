import type { JobRecord, JobSyncStatus, PlantType } from "@/lib/db";

const PLANT_LABEL: Record<PlantType, string> = {
  gas_boiler: "Gas boiler",
  chiller: "Chiller",
};

const STATUS_LABEL: Record<JobSyncStatus, string> = {
  synced: "At the office",
  queued: "On this tablet only",
  conflict: "Needs your decision",
  pending: "Not started",
  failed: "Failed",
};

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDay(isoDate: string): string {
  return new Date(`${isoDate}T00:00:00`)
    .toLocaleDateString("en-GB", {
      weekday: "long",
      day: "numeric",
      month: "long",
    })
    .replace(",", "");
}

export function statusLabel(status: JobSyncStatus): string {
  return STATUS_LABEL[status];
}

export function plantLabel(plantType: PlantType): string {
  return PLANT_LABEL[plantType];
}

export function shortSite(name: string): string {
  const [first] = name.split(/[\s—–-]+/);
  return first || name;
}

export function nextJob(jobs: JobRecord[]): JobRecord | undefined {
  return jobs.find((job) => job.status === "pending" || job.status === "queued");
}

export function dayStats(jobs: JobRecord[]) {
  const counts: Record<JobSyncStatus, number> = {
    pending: 0,
    queued: 0,
    synced: 0,
    conflict: 0,
    failed: 0,
  };

  for (const job of jobs) {
    counts[job.status] += 1;
  }

  return {
    synced: counts.synced,
    queued: counts.queued,
    conflict: counts.conflict,
  };
}

export function pendingItemCount(jobs: JobRecord[]): number {
  return jobs.reduce((total, job) => total + (job.queuedItems ?? 0), 0);
}
