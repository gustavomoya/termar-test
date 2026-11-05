import type { DBSchema, IDBPDatabase } from "idb";

export const DB_NAME = "termar-field";
export const DB_VERSION = 4;

export type PlantType = "gas_boiler" | "chiller";
export type JobPriority = "low" | "normal" | "high";
export type JobSyncStatus =
  | "pending"
  | "queued"
  | "synced"
  | "conflict"
  | "failed";

export type QueueStep = "worksheet" | "status";

export type QueueItemStatus =
  | "pending"
  | "sending"
  | "sent"
  | "conflict"
  | "failed";

export type ConflictResolution = "keep_mine" | "keep_other" | "send_both";

/**
 * Resolutions that upload a worksheet. "keep_other" is archive-only: the
 * office's copy already exists, so only a status update is queued.
 */
export type QueueConflictResolution = Exclude<
  ConflictResolution,
  "keep_other"
>;

export interface QueueItem {
  jobId: string;
  step: QueueStep;
  status: QueueItemStatus;
  attempts: number;
  lastAttemptAt?: string;
  nextAttemptAt?: string;
  lastError?: string;
  resolution?: QueueConflictResolution;
  conflictWith?: ConflictWith;
  createdAt: string;
  updatedAt: string;
}

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

export type ChecklistItemType = "passfail" | "measure";

export interface ChecklistItem {
  id: string;
  label: string;
  type: ChecklistItemType;
  unit?: string;
  min?: number;
  max?: number;
}

export interface ChecklistTemplate {
  plantType: PlantType;
  label: string;
  items: ChecklistItem[];
}

export interface StoredTemplate extends ChecklistTemplate {
  cachedAt: string;
}

export interface VanStockItem {
  sku: string;
  label: string;
  unit: string;
  onVan: number;
}

export interface StoredStockItem extends VanStockItem {
  cachedAt: string;
}

export type CheckResult = "pass" | "fail" | "na" | "measure";

export interface CheckAnswer {
  result?: CheckResult;
  value?: number;
  note?: string;
  updatedAt: string;
}

export interface PartUsed {
  sku: string;
  label: string;
  unit: string;
  quantity: number;
}

export interface WorksheetPhotoMeta {
  id: string;
  caption: string;
  capturedAt: string;
  uploaded: boolean;
}

export interface Signature {
  signedBy: string;
  signedAt: string;
  dataUrl?: string;
}

export interface WorksheetDraft {
  jobId: string;
  startedAt?: string;
  runningSince?: string;
  accumulatedMs: number;
  stoppedAt?: string;
  checks: Record<string, CheckAnswer>;
  parts: PartUsed[];
  photos: WorksheetPhotoMeta[];
  signature?: Signature;
  finishedAt?: string;
  updatedAt: string;
}

export interface ArchivedWorksheet {
  id: string;
  jobId: string;
  reference: string;
  site: string;
  side: "mine" | "other";
  resolution: ConflictResolution;
  technician: string;
  completedAt?: string;
  worksheet?: WorksheetDraft;
  conflictWith?: ConflictWith;
  archivedAt: string;
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
  templates: {
    key: string;
    value: StoredTemplate;
  };
  worksheets: {
    key: string;
    value: WorksheetDraft;
  };
  stock: {
    key: string;
    value: StoredStockItem;
  };
  queue: {
    key: string;
    value: QueueItem;
    indexes: {
      "by-status": QueueItemStatus;
      "by-nextAttemptAt": string;
    };
  };
  archive: {
    key: string;
    value: ArchivedWorksheet;
    indexes: {
      "by-jobId": string;
      "by-archivedAt": string;
    };
  };
}

type Migration = (db: IDBPDatabase<TermarDB>) => void;

const migrations: Record<number, Migration> = {
  1: (db) => {
    const jobs = db.createObjectStore("jobs", { keyPath: "id" });
    jobs.createIndex("by-scheduledAt", "scheduledAt");
    db.createObjectStore("meta", { keyPath: "key" });
  },
  2: (db) => {
    db.createObjectStore("templates", { keyPath: "plantType" });
    db.createObjectStore("worksheets", { keyPath: "jobId" });
    db.createObjectStore("stock", { keyPath: "sku" });
  },
  3: (db) => {
    const queue = db.createObjectStore("queue", { keyPath: "jobId" });
    queue.createIndex("by-status", "status");
    queue.createIndex("by-nextAttemptAt", "nextAttemptAt");
  },
  4: (db) => {
    const archive = db.createObjectStore("archive", { keyPath: "id" });
    archive.createIndex("by-jobId", "jobId");
    archive.createIndex("by-archivedAt", "archivedAt");
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
