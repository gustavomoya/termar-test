import { getDB } from "@/lib/db/idb";
import type { WorksheetDraft } from "@/lib/db";

/**
 * Get worksheet by job
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
 * Save a worksheet
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

/**
 * Remove a worksheet
 *
 * @param jobId the job identifier
 */
export async function deleteWorksheet(jobId: string): Promise<void> {
  const db = await getDB();
  await db.delete("worksheets", jobId);
}

/**
 * Mark the photos referenced by a worksheet as received by the office
 *
 * Uses one transaction so a background upload cannot overwrite edits made at
 * the same time
 *
 * @param jobId the job identifier
 */
export async function markWorksheetPhotosUploaded(
  jobId: string,
): Promise<void> {
  const db = await getDB();
  const transaction = db.transaction("worksheets", "readwrite");
  const draft = await transaction.store.get(jobId);

  if (draft) {
    await transaction.store.put({
      ...draft,
      photos: draft.photos.map((photo) => ({ ...photo, uploaded: true })),
    });
  }

  await transaction.done;
}
