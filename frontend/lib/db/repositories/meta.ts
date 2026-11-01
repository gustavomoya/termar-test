import { nowLocalIso } from "@/lib/time";
import { getDB } from "@/lib/db/idb";
import type { DayInfo } from "@/lib/db";

/**
 * Get the stored day information
 * 
 * @returns 
 */
export async function getDayInfo(): Promise<DayInfo | undefined> {
  const db = await getDB();
  const record = await db.get("meta", "day");
  return record?.value;
}

/**
 * Saves the day information in the metadata store.
 * 
 * @param day the day information to save
 */
export async function setDayInfo(day: DayInfo): Promise<void> {
  const db = await getDB();
  await db.put("meta", { key: "day", value: day, updatedAt: nowLocalIso() });
}
