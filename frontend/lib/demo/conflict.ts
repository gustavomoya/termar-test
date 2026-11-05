import {
  getJob,
  getTemplate,
  getWorksheet,
  putWorksheet,
  type CheckAnswer,
  type PartUsed,
  type WorksheetDraft,
} from "@/lib/db";
import { isDemoConflictEnabled } from "@/lib/demo/flags";

export const DEMO_CONFLICT_JOB_ID = "job-88223";

const DEMO_STARTED_AT = "2026-06-30T14:05:00";
const DEMO_STOPPED_AT = "2026-06-30T15:08:00";
const DEMO_DURATION_MS = 63 * 60 * 1000;

/**
 * Build a realistic worksheet for the conflicted job so "Keep mine" has
 * something to keep on a fresh tablet.
 */
async function buildDemoDraft(): Promise<WorksheetDraft | undefined> {
  const job = await getJob(DEMO_CONFLICT_JOB_ID);
  if (!job || job.status !== "conflict") return undefined;

  const template = await getTemplate(job.plantType);
  if (!template) return undefined;

  const checks: Record<string, CheckAnswer> = {};
  for (const item of template.items) {
    if (item.id === "gb-10") {
      checks[item.id] = {
        result: "fail",
        note: "Condensate trap blocked; replaced and drain tested.",
        updatedAt: DEMO_STOPPED_AT,
      };
      continue;
    }

    if (item.type === "measure") {
      const value =
        item.min !== undefined && item.max !== undefined
          ? Number(((item.min + item.max) / 2).toFixed(1))
          : 0;
      checks[item.id] = {
        result: "measure",
        value,
        updatedAt: DEMO_STOPPED_AT,
      };
      continue;
    }

    checks[item.id] = { result: "pass", updatedAt: DEMO_STOPPED_AT };
  }

  const parts: PartUsed[] = [
    {
      sku: "CND-0450",
      label: "Condensate trap",
      unit: "each",
      quantity: 1,
    },
    {
      sku: "SEA-0912",
      label: "Burner gasket set",
      unit: "set",
      quantity: 1,
    },
  ];

  return {
    jobId: job.id,
    startedAt: DEMO_STARTED_AT,
    stoppedAt: DEMO_STOPPED_AT,
    accumulatedMs: DEMO_DURATION_MS,
    checks,
    parts,
    photos: [],
    signature: {
      signedBy: job.site.contact,
      signedAt: DEMO_STOPPED_AT,
    },
    finishedAt: DEMO_STOPPED_AT,
    updatedAt: DEMO_STOPPED_AT,
  };
}

/**
 * Create the local worksheet for the demo conflict once, when enabled.
 *
 * This is a demo-only fixture: the backend serves `job-88223` as a conflict
 * but has no local worksheet for it, so without this there is nothing for
 * "Keep mine" to keep. It never runs unless NEXT_PUBLIC_DEMO_CONFLICT=true
 * and it leaves the backend untouched.
 */
export async function seedDemoConflictIfNeeded(): Promise<void> {
  if (!isDemoConflictEnabled()) return;

  const existing = await getWorksheet(DEMO_CONFLICT_JOB_ID);
  if (existing) return;

  const draft = await buildDemoDraft();
  if (!draft) return;

  await putWorksheet(draft);
}
