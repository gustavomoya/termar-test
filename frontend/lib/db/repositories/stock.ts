import { nowLocalIso } from "../../time";
import { getDB } from "@/lib/db/idb";
import type { StoredStockItem, VanStockItem } from "@/lib/db";

/**
 * Get the van stock
 */
export async function listStock(): Promise<StoredStockItem[]> {
  const db = await getDB();
  return db.getAll("stock");
}

/**
 * Replace the cached van stock with the latest snapshot
 *
 * @param items the stock items to store
 */
export async function replaceStock(
  items: VanStockItem[],
): Promise<StoredStockItem[]> {
  const cachedAt = nowLocalIso();
  const stored = items.map((item) => ({ ...item, cachedAt }));
  const db = await getDB();
  const tx = db.transaction("stock", "readwrite");
  await tx.store.clear();
  await Promise.all(stored.map((item) => tx.store.put(item)));
  await tx.done;
  return stored;
}
