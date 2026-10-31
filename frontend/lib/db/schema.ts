import type { DBSchema, IDBPDatabase } from "idb";

export const DB_NAME = "termar-field";
export const DB_VERSION = 1;

export type PlantType = "gas_boiler" | "chiller";
export type JobPriority = "low" | "normal" | "high";
export type JobSyncStatus =
  | "pending"
  | "queued"
  | "synced"
  | "conflict"
  | "failed";

export interface Technician {
  id: string;
  name: string;
  van: string;
}

export interface DayInfo {
  product: string;
  technician: Technician;
  day: string;
  note: string;
}

export interface Site {
  name: string;
  address: string;
  access: string;
  contact: string;
  phone: string;
}

export interface ConflictWith {
  technician: string;
  completedAt: string;
}

export interface JobRecord {
  id: string;
  reference: string;
  scheduledAt: string;
  estimatedMinutes: number;
  priority: JobPriority;
  status: JobSyncStatus;
  plantType: PlantType;
  site: Site;
  task: string;
  localOnly: boolean;
  syncedAt?: string;
  queuedItems?: number;
  conflictWith?: ConflictWith;
  cachedAt: string;
}

export type MetaKey = "day";

export interface MetaRecord {
  key: MetaKey;
  value: DayInfo;
  updatedAt: string;
}

export interface TermarDB extends DBSchema {
  jobs: {
    key: string;
    value: JobRecord;
    indexes: {
      "by-scheduledAt": string;
    };
  };
  meta: {
    key: MetaKey;
    value: MetaRecord;
  };
}

type Migration = (db: IDBPDatabase<TermarDB>) => void;

const migrations: Record<number, Migration> = {
  1: (db) => {
    const jobs = db.createObjectStore("jobs", { keyPath: "id" });
    jobs.createIndex("by-scheduledAt", "scheduledAt");
    db.createObjectStore("meta", { keyPath: "key" });
  },
};

export function runMigrations(
  db: IDBPDatabase<TermarDB>,
  oldVersion: number,
  newVersion: number | null,
) {
  const target = newVersion ?? DB_VERSION;

  for (let version = oldVersion + 1; version <= target; version += 1) {
    migrations[version]?.(db);
  }
}
