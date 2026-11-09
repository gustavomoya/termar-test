import type {
  ArchivedWorksheet,
  ChecklistTemplate,
  DayInfo,
  JobRecord,
  PhotoRecord,
  QueueItem,
  VanStockItem,
  WorksheetDraft,
} from "@/lib/db";

export const FIXED_NOW = "2026-11-08T09:00:00";

export function makeDay(overrides: Partial<DayInfo> = {}): DayInfo {
  return {
    product: "Termar Servicios",
    technician: {
      id: "tech-1",
      name: "Ana Torres",
      van: "VAN-01",
    },
    day: "2026-11-08",
    note: "",
    ...overrides,
  };
}

export function makeJob(overrides: Partial<JobRecord> = {}): JobRecord {
  return {
    id: "job-1",
    reference: "TER-001",
    scheduledAt: "2026-11-08T09:00:00",
    estimatedMinutes: 60,
    priority: "normal",
    status: "pending",
    plantType: "gas_boiler",
    site: {
      name: "Central Office",
      address: "1 Main Street",
      access: "Reception",
      contact: "Ana",
      phone: "555-0100",
    },
    task: "Annual service",
    localOnly: false,
    cachedAt: "2026-11-08T08:00:00",
    ...overrides,
  };
}

export function makeWorksheet(
  overrides: Partial<WorksheetDraft> = {},
): WorksheetDraft {
  return {
    jobId: "job-1",
    accumulatedMs: 0,
    checks: {},
    parts: [],
    photos: [],
    updatedAt: FIXED_NOW,
    ...overrides,
  };
}

export function makeQueueItem(overrides: Partial<QueueItem> = {}): QueueItem {
  return {
    jobId: "job-1",
    step: "worksheet",
    status: "pending",
    attempts: 0,
    createdAt: FIXED_NOW,
    updatedAt: FIXED_NOW,
    ...overrides,
  };
}

export function makePhoto(overrides: Partial<PhotoRecord> = {}): PhotoRecord {
  return {
    id: "photo-1",
    jobId: "job-1",
    caption: "Boiler",
    capturedAt: FIXED_NOW,
    mime: "image/jpeg",
    width: 10,
    height: 10,
    sizeBytes: 5,
    blob: new Blob(["hello"], { type: "image/jpeg" }),
    thumbBlob: new Blob(["thumb"], { type: "image/jpeg" }),
    uploaded: false,
    ...overrides,
  };
}

export function makeTemplate(
  overrides: Partial<ChecklistTemplate> = {},
): ChecklistTemplate {
  return {
    plantType: "gas_boiler",
    label: "Gas boiler",
    items: [
      {
        id: "check-1",
        label: "Gas pressure",
        type: "measure",
        unit: "bar",
        min: 1,
        max: 3,
      },
      {
        id: "check-2",
        label: "Flue condition",
        type: "passfail",
      },
    ],
    ...overrides,
  };
}

export function makeStock(overrides: Partial<VanStockItem> = {}): VanStockItem {
  return {
    sku: "FIL-001",
    label: "Gas filter",
    unit: "pcs",
    onVan: 4,
    ...overrides,
  };
}

export function makeArchive(
  overrides: Partial<ArchivedWorksheet> = {},
): ArchivedWorksheet {
  return {
    id: "archive-1",
    jobId: "job-1",
    reference: "TER-001",
    site: "Central Office",
    side: "mine",
    resolution: "keep_mine",
    technician: "Ana Torres",
    archivedAt: FIXED_NOW,
    ...overrides,
  };
}
