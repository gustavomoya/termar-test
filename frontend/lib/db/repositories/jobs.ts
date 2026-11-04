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
 * Get job by id.
 *
 * @param id the job identifier
 */
export async function getJob(id: string): Promise<JobRecord | undefined> {
  const db = await getDB();
  return db.get("jobs", id);
}

/**
 * Update a job without replacing the fields that are not provided.
 *
 * @param jobId the job identifier
 * @param patch the fields to update
 *
 * @returns the updated job, or undefined when the job does not exist
 */
export async function patchJob(
  jobId: string,
  patch: Partial<Omit<JobRecord, "id">>,
): Promise<JobRecord | undefined> {
  const db = await getDB();
  const tx = db.transaction("jobs", "readwrite");
  const current = await tx.store.get(jobId);
  if (!current) {
    await tx.done;
    return undefined;
  }

  const next = { ...current, ...patch };
  await tx.store.put(next);
  await tx.done;
  return next;
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
