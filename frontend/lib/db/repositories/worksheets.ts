import { getDB } from "@/lib/db/idb";
import type { WorksheetDraft } from "@/lib/db";

/**
 * Get worksheet by job.
 *
 * @param jobId the job identifier
 */
export async function getWorksheet(
  jobId: string,
): Promise<WorksheetDraft | undefined> {
  const db = await getDB();
  return db.get("worksheets", jobId);
}

/**
 * Save a worksheet.
 *
 * @param draft the worksheet to persist
 */
export async function putWorksheet(draft: WorksheetDraft): Promise<void> {
  const db = await getDB();
  await db.put("worksheets", draft);
}

/**
 * Get the list of worksheets
 */
export async function listWorksheets(): Promise<WorksheetDraft[]> {
  const db = await getDB();
  return db.getAll("worksheets");
}
