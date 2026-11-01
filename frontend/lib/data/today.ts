import { fetchDay, fetchJobs } from "@/lib/api/today";
import {
  getDayInfo,
  listJobs,
  replaceJobs,
  setDayInfo,
  type DayInfo,
  type JobRecord,
} from "@/lib/db";
import { nowLocalIso } from "@/lib/time";

export interface TodaySnapshot {
  day: DayInfo;
  jobs: JobRecord[];
}

export type TodaySource = "network" | "cache";

export interface TodayResult extends TodaySnapshot {
  source: TodaySource;
}

/**
 * Get the day's information stored in IndexedDB
 */
export async function readTodayCache(): Promise<TodaySnapshot | null> {
  const [day, jobs] = await Promise.all([getDayInfo(), listJobs()]);
  if (!day) return null;

  return { day, jobs };
}

/**
 * Get the updated information from the api and replaces the corresponding information in IndexedDB.
 */
export async function refreshToday(): Promise<TodaySnapshot> {
  const [day, remoteJobs] = await Promise.all([fetchDay(), fetchJobs()]);
  const cachedAt = nowLocalIso();
  const jobs: JobRecord[] = remoteJobs
    .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt))
    .map((job) => ({ ...job, cachedAt }));

  await Promise.all([setDayInfo(day), replaceJobs(jobs)]);

  return { day, jobs };
}

/**
 * Loads the day's information for the application.
 * First, it attempts to retrieve updated data from the backend.
 * If it cannot, it attempts to retrieve the latest information stored in IndexedDB.
 */
export async function loadToday(): Promise<TodayResult> {
  try {
    return { ...(await refreshToday()), source: "network" };
  } catch (error) {
    const cached = await readTodayCache();
    if (cached) return { ...cached, source: "cache" };

    throw error;
  }
}
