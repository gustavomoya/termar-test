import { deleteDB } from "@/lib/db/idb";

export async function resetDB(): Promise<void> {
  await deleteDB();
}
