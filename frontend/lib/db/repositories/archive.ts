import { getDB } from "@/lib/db/idb";
import type { ArchivedWorksheet } from "@/lib/db";

/**
 * Persist an archived worksheet
 *
 * @param entry the archived worksheet
 */
export async function putArchivedWorksheet(
  entry: ArchivedWorksheet,
): Promise<void> {
  const db = await getDB();
  await db.put("archive", entry);
}

/**
 * Get every archived worksheet, newest first
 */
export async function listArchivedWorksheets(): Promise<ArchivedWorksheet[]> {
  const db = await getDB();
  const entries = await db.getAllFromIndex("archive", "by-archivedAt");
  return entries.reverse();
}

/**
 * Get the archived worksheets for one job
 *
 * @param jobId the job identifier
 */
export async function listArchivedByJob(
  jobId: string,
): Promise<ArchivedWorksheet[]> {
  const db = await getDB();
  return db.getAllFromIndex("archive", "by-jobId", jobId);
}
