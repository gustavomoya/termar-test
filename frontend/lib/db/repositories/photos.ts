import { getDB } from "@/lib/db/idb";
import type { PhotoRecord } from "@/lib/db";

/**
 * Get a photo by id
 *
 * @param id the photo identifier
 */
export async function getPhoto(id: string): Promise<PhotoRecord | undefined> {
  const db = await getDB();
  return db.get("photos", id);
}

/**
 * Get every photo captured for a job.
 *
 * @param jobId the job identifier
 */
export async function listPhotosByJob(jobId: string): Promise<PhotoRecord[]> {
  const db = await getDB();
  return db.getAllFromIndex("photos", "by-jobId", jobId);
}

/**
 * Create or replace a photo.
 *
 * @param photo the photo record to persist
 */
export async function putPhoto(photo: PhotoRecord): Promise<void> {
  const db = await getDB();
  await db.put("photos", photo);
}

/**
 * Remove a photo from the tablet.
 *
 * @param id the photo identifier
 */
export async function deletePhoto(id: string): Promise<void> {
  const db = await getDB();
  await db.delete("photos", id);
}

/**
 * Remove every photo captured for a job.
 *
 * @param jobId the job identifier
 */
export async function deletePhotosByJob(jobId: string): Promise<void> {
  const db = await getDB();
  const photos = await listPhotosByJob(jobId);

  await Promise.all(photos.map((photo) => db.delete("photos", photo.id)));
}

/**
 * Mark every photo of a job as received by the office.
 *
 * @param jobId the job identifier
 */
export async function markPhotosUploaded(jobId: string): Promise<void> {
  const db = await getDB();
  const photos = await listPhotosByJob(jobId);

  await Promise.all(
    photos.map((photo) =>
      db.put("photos", { ...photo, uploaded: true } satisfies PhotoRecord),
    ),
  );
}
