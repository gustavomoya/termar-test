import type { DayInfo, JobRecord } from "@/lib/db";
import { apiFetch } from "./client";

export type RemoteJob = Omit<JobRecord, "cachedAt">;

/**
 * Get the info corresponding to the current technician's work day.
 */
export function fetchDay(): Promise<DayInfo> {
  return apiFetch<DayInfo>("/api/day");
}

/**
 * Get the list of jobs scheduled for the day
 */
export function fetchJobs(): Promise<RemoteJob[]> {
  return apiFetch<RemoteJob[]>("/api/jobs");
}
