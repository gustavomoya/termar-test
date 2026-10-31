import { deleteDB as deleteIndexedDB, openDB, type IDBPDatabase } from "idb";
import { DB_NAME, DB_VERSION, runMigrations, type TermarDB } from "./schema";

let dbPromise: Promise<IDBPDatabase<TermarDB>> | null = null;

/**
 * Opens the IndexedDB database or returns the existing connection promise.
 * Runs pending database migrations when an upgrade is required.
 */
export function getDB(): Promise<IDBPDatabase<TermarDB>> {
  if (!dbPromise) {
    dbPromise = openDB<TermarDB>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion, newVersion) {
        runMigrations(db, oldVersion, newVersion);
      },
      blocking() {
        void closeDB();
      },
      terminated() {
        dbPromise = null;
      },
    }).catch((error: unknown) => {
      dbPromise = null;
      throw error;
    });
  }

  return dbPromise;
}

/**
 * Closes the current database connection
 */
export async function closeDB(): Promise<void> {
  const pending = dbPromise;
  if (!pending) return;

  dbPromise = null;
  const db = await pending.catch(() => null);
  db?.close();
}

/**
 * Closes the current database connection and deletes the IndexedDB database
 */
export async function deleteDB(): Promise<void> {
  await closeDB();
  await deleteIndexedDB(DB_NAME);
}
