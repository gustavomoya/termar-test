import type {
  CheckResult,
  ChecklistTemplate,
  JobSyncStatus,
  PlantType,
  QueueConflictResolution,
  VanStockItem,
} from "@/lib/db";
import { ApiError, apiFetch } from "./client";
import type { RemoteJob } from "./today";

export interface RemoteWorksheetCheck {
  id: string;
  result: CheckResult;
  value?: number;
  note?: string;
}

export interface RemoteWorksheetPart {
  sku: string;
  quantity: number;
}

export interface RemoteWorksheetPhoto {
  id: string;
  caption: string;
  capturedAt: string;
  uploaded: boolean;
}

export interface RemoteWorksheetSignature {
  signedBy: string;
  signedAt: string;
  captured?: boolean;
  dataUrl?: string;
}

export interface RemoteWorksheetConflict {
  resolution: QueueConflictResolution;
  otherTechnician?: string;
  otherCompletedAt?: string;
  note?: string;
}

export interface RemoteWorksheet {
  jobId: string;
  startedAt?: string;
  stoppedAt?: string;
  checks: RemoteWorksheetCheck[];
  parts: RemoteWorksheetPart[];
  photos?: RemoteWorksheetPhoto[];
  signature?: RemoteWorksheetSignature;
  conflict?: RemoteWorksheetConflict;
}

interface RemoteTemplate {
  label: string;
  items: ChecklistTemplate["items"];
}

/**
 * Get one job by its identifier.
 */
export function fetchJob(id: string): Promise<RemoteJob> {
  return apiFetch<RemoteJob>(`/api/jobs/${encodeURIComponent(id)}`);
}

/**
 * Get the checklist template for a plant type.
 */
export async function fetchTemplate(
  plantType: PlantType,
): Promise<ChecklistTemplate> {
  const template = await apiFetch<RemoteTemplate>(
    `/api/checklist-templates/${encodeURIComponent(plantType)}`,
  );
  return { plantType, ...template };
}

/**
 * Get what is currently on the van.
 */
export function fetchVanStock(): Promise<VanStockItem[]> {
  return apiFetch<VanStockItem[]>("/api/van-stock");
}

/**
 * Save (create or replace) a job's worksheet on the backend.
 */
export function uploadWorksheet(
  id: string,
  worksheet: RemoteWorksheet,
): Promise<RemoteWorksheet> {
  return apiFetch<RemoteWorksheet>(
    `/api/jobs/${encodeURIComponent(id)}/worksheet`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(worksheet),
    },
  );
}

/**
 * Update a job's sync status on the backend.
 */
export function setJobStatus(
  id: string,
  status: JobSyncStatus,
): Promise<RemoteJob> {
  return apiFetch<RemoteJob>(
    `/api/jobs/${encodeURIComponent(id)}/status`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    },
  );
}

/**
 * Get the saved worksheet for a job, or null when the office has none yet.
 */
export async function fetchWorksheet(
  id: string,
): Promise<RemoteWorksheet | null> {
  try {
    return await apiFetch<RemoteWorksheet>(
      `/api/jobs/${encodeURIComponent(id)}/worksheet`,
    );
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
}
