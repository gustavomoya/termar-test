import { getDB } from "@/lib/db/idb";
import type { JobRecord } from "@/lib/db";

/**
 * Get all jobs from the database, ordered by their scheduled date.
 * 
 * @returns A promise that resolves to an array of JobRecord objects.
 */
export async function listJobs(): Promise<JobRecord[]> {
  const db = await getDB();
  return db.getAllFromIndex("jobs", "by-scheduledAt");
}

/**
 * Inserts multiple jobs in the database.
 * 
 * @param jobs  the list of jobs
 */
export async function putJobs(jobs: JobRecord[]): Promise<void> {
  if (jobs.length === 0) return;

  const db = await getDB();
  const tx = db.transaction("jobs", "readwrite");
  await Promise.all(jobs.map((job) => tx.store.put(job)));
  await tx.done;
}

/**
 * Replaces all existing jobs with the provided jobs.
 * Clears the jobs store before inserting the new items.
 * 
 * @param jobs the list of jobs
 */
export async function replaceJobs(jobs: JobRecord[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction("jobs", "readwrite");
  await tx.store.clear();
  await Promise.all(jobs.map((job) => tx.store.put(job)));
  await tx.done;
}
