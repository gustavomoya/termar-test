import { getDB } from "@/lib/db/idb";
import type { QueueItem, QueueItemStatus } from "@/lib/db";

/**
 * Get a job's queued item
 *
 * @param jobId the job identifier
 */
export async function getQueueItem(
  jobId: string,
): Promise<QueueItem | undefined> {
  const db = await getDB();
  return db.get("queue", jobId);
}

/**
 * Get all queued item
 */
export async function listQueueItems(): Promise<QueueItem[]> {
  const db = await getDB();
  return db.getAll("queue");
}

/**
 * Get all the queued items with a given status
 *
 * @param status the status to filter
 */
export async function listQueueItemsByStatus(
  status: QueueItemStatus,
): Promise<QueueItem[]> {
  const db = await getDB();
  return db.getAllFromIndex("queue", "by-status", status);
}

/**
 * Create or replace a job's queued item.
 *
 * @param item the queue item to persist
 */
export async function putQueueItem(item: QueueItem): Promise<void> {
  const db = await getDB();
  await db.put("queue", item);
}

/**
 * Remove a job's queued item.
 *
 * @param jobId the job identifier
 */
export async function deleteQueueItem(jobId: string): Promise<void> {
  const db = await getDB();
  await db.delete("queue", jobId);
}

/**
 * Remove every queued sync item.
 */
export async function clearQueue(): Promise<void> {
  const db = await getDB();
  await db.clear("queue");
}
