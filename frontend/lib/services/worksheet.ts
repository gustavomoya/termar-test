import { ApiError } from "@/lib/api/client";
import {
  fetchJob,
  fetchTemplate,
  fetchVanStock,
  fetchWorksheet,
  type RemoteWorksheet,
  type RemoteWorksheetPhoto,
} from "@/lib/api/worksheet";
import {
  getJob,
  getQueueItem,
  getTemplate,
  getWorksheet,
  listPhotosByJob,
  listStock,
  listWorksheets,
  markPhotosUploaded,
  markWorksheetPhotosUploaded as markStoredWorksheetPhotosUploaded,
  putJobs,
  putTemplate,
  putWorksheet,
  replaceStock,
  type CheckAnswer,
  type ChecklistTemplate,
  type JobRecord,
  type PartUsed,
  type PhotoRecord,
  type QueueItem,
  type StoredStockItem,
  type StoredTemplate,
  type VanStockItem,
  type WorksheetDraft,
  type WorksheetPhotoMeta,
} from "@/lib/db";
import { blobToDataUrl } from "@/lib/worksheet/photos";
import { nowLocalIso } from "@/lib/time";

export interface WorksheetSnapshot {
  job: JobRecord;
  template: StoredTemplate;
  stock: StoredStockItem[];
  stockUsage: Record<string, number>;
  draft: WorksheetDraft;
  photos: PhotoRecord[];
  readOnly: boolean;
  savedAt?: string;
}

/**
 * Result of an operation that is allowed to fail without aborting the load.
 */
type Settled<T> =
  | { ok: true; value: T }
  | { ok: false; error: unknown };

/**
 * Settled results for a named group of promises.
 */
type SettledTasks<T extends Record<string, Promise<unknown>>> = {
  [K in keyof T]: Settled<Awaited<T[K]>>;
};

/**
 * Resolve a promise into a tagged result, allowing a failed read to be
 * handled without rejecting the whole batch.
 *
 * @param promise the promise to resolve
 * @returns a tagged result with the value or the error
 */
async function settle<T>(promise: Promise<T>): Promise<Settled<T>> {
  try {
    return { ok: true, value: await promise };
  } catch (error) {
    return { ok: false, error };
  }
}

/**
 * Run several named promises in parallel and return each outcome under its
 * original key.
 *
 * @param tasks named promises to settle
 *
 * @returns the outcomes keyed by the original task names
 */
async function settleAll<T extends Record<string, Promise<unknown>>>(
  tasks: T,
): Promise<SettledTasks<T>> {
  const entries = Object.entries(tasks) as [keyof T, Promise<unknown>][];
  const results = await Promise.all(
    entries.map(async ([key, task]) => [key, await settle(task)] as const),
  );

  // Object.fromEntries loses the key-value relationship, so restore it.
  return Object.fromEntries(results) as SettledTasks<T>;
}

/**
 * Return the value of a successful settled result, or undefined on failure.
 *
 * @param result the settled result to unwrap
 * @returns the settled value, or undefined when the task failed
 */
function settledValue<T>(result: Settled<T>): T | undefined {
  return result.ok ? result.value : undefined;
}

/**
 * Create a new worksheet draft seeded from the checklist template.
 *
 * @param jobId         the job identifier
 * @param templateItems checklist items used to seed the answers
 *
 * @returns a new draft for the job
 */
function createInitialDraft(
  jobId: string,
  templateItems: ChecklistTemplate["items"] = [],
): WorksheetDraft {
  const checks: Record<string, CheckAnswer> = {};

  for (const item of templateItems) {
    checks[item.id] = {
      result: undefined,
      value: undefined,
      note: undefined,
      updatedAt: nowLocalIso(),
    };
  }

  return {
    jobId,
    accumulatedMs: 0,
    checks,
    parts: [],
    photos: [],
    updatedAt: nowLocalIso(),
  };
}

/**
 * Keep only the metadata of a remote photo
 */
function mapRemotePhoto(photo: RemoteWorksheetPhoto): WorksheetPhotoMeta {
  return {
    id: photo.id,
    caption: photo.caption,
    capturedAt: photo.capturedAt,
    uploaded: photo.uploaded,
    ...(photo.sizeBytes ? { sizeBytes: photo.sizeBytes } : {}),
  };
}

/**
 * Map a worksheet received from the backend to the local draft worksheet.
 * Template items are seeded first and then overwritten with remote answers.
 *
 * @param jobId          the job identifier
 * @param remote         the worksheet returned by the API
 * @param stock          van stock used to enrich part labels and units
 * @param templateItems  checklist items used to seed unanswered checks
 *
 * @returns the worksheet in local draft format
 */
function mapRemoteWorksheetToDraft(
  jobId: string,
  remote: RemoteWorksheet,
  stock: StoredStockItem[],
  templateItems: ChecklistTemplate["items"] = [],
): WorksheetDraft {
  const updatedAt = nowLocalIso();
  const checks: Record<string, CheckAnswer> = {};

  // Init checks for all template items
  for (const item of templateItems) {
    checks[item.id] = {
      result: undefined,
      value: undefined,
      note: undefined,
      updatedAt,
    };
  }

  // Overwrite with the remote values, if they exist
  for (const check of remote.checks ?? []) {
    checks[check.id] = {
      result: check.result,
      value: check.value,
      note: check.note,
      updatedAt,
    };
  }

  const parts: PartUsed[] = (remote.parts ?? []).map((part) => {
    const item = stock.find((entry) => entry.sku === part.sku);
    return {
      sku: part.sku,
      label: item?.label ?? part.sku,
      unit: item?.unit ?? "",
      quantity: part.quantity,
    };
  });

  const accumulatedMs =
    remote.startedAt && remote.stoppedAt
      ? Math.max(
          0,
          new Date(remote.stoppedAt).getTime() -
            new Date(remote.startedAt).getTime(),
        )
      : 0;

  return {
    jobId,
    startedAt: remote.startedAt,
    accumulatedMs,
    stoppedAt: remote.stoppedAt,
    checks,
    parts,
    photos: (remote.photos ?? []).map(mapRemotePhoto),
    signature: remote.signature
      ? {
          signedBy: remote.signature.signedBy,
          signedAt: remote.signature.signedAt,
          dataUrl: remote.signature.dataUrl,
        }
      : undefined,
    updatedAt,
  };
}

/**
 * Map a local worksheet to the payload accepted by the backend.
 * Unanswered checks are omitted; measured values, notes, photos and the
 * signature (including its data URL) are included when present.
 *
 * @param draft the local worksheet
 *
 * @returns the worksheet payload for the PUT request
 */
export function mapDraftToRemoteWorksheet(
  draft: WorksheetDraft,
  conflict?: RemoteWorksheet["conflict"],
): RemoteWorksheet {
  const checks: RemoteWorksheet["checks"] = [];

  for (const [id, answer] of Object.entries(draft.checks)) {
    if (!answer.result) continue;

    checks.push({
      id,
      result: answer.result,
      value: answer.value,
      note: answer.note,
    });
  }

  return {
    jobId: draft.jobId,
    ...(draft.startedAt ? { startedAt: draft.startedAt } : {}),
    ...(draft.stoppedAt ? { stoppedAt: draft.stoppedAt } : {}),
    checks,
    parts: draft.parts.map((part) => ({
      sku: part.sku,
      quantity: part.quantity,
    })),
    ...(draft.photos.length
      ? { photos: draft.photos.map((photo) => ({ ...photo })) }
      : {}),
    ...(draft.signature
      ? {
          signature: {
            signedBy: draft.signature.signedBy,
            signedAt: draft.signature.signedAt,
            captured: true,
            ...(draft.signature.dataUrl
              ? { dataUrl: draft.signature.dataUrl }
              : {}),
          },
        }
      : {}),
    ...(conflict ? { conflict } : {}),
  };
}

/**
 * Calculate how many units of each SKU are used across all local drafts,
 * including the worksheet currently being loaded.
 *
 * @param drafts   every draft stored on db
 * @param current  the draft being loaded
 *
 * @returns the used quantity per SKU
 */
function calculatePartsUsage(
  drafts: WorksheetDraft[],
  current: WorksheetDraft,
): Record<string, number> {
  const usage: Record<string, number> = {};

  for (const draft of drafts) {
    if (draft.jobId === current.jobId) continue;
    for (const part of draft.parts) {
      usage[part.sku] = (usage[part.sku] ?? 0) + part.quantity;
    }
  }

  for (const part of current.parts) {
    usage[part.sku] = (usage[part.sku] ?? 0) + part.quantity;
  }

  return usage;
}

/**
 * Get a template. Prefer the remote checklist template, cache it when possible, and fall back
 * to the locally cached template or an empty one.
 *
 * @param remote    the settled remote template request
 * @param cached    the template stored on db
 * @param plantType the plant type used for the empty fallback
 *
 * @returns the template to use
 */
async function loadTemplate(
  remote: Settled<ChecklistTemplate>,
  cached: StoredTemplate | undefined,
  plantType: JobRecord["plantType"],
): Promise<StoredTemplate> {
  if (remote.ok) {
    try {
      return await putTemplate(remote.value);
    } catch {
      return { ...remote.value, cachedAt: nowLocalIso() };
    }
  }

  return (
    cached ?? {
      plantType,
      label: plantType,
      items: [],
      cachedAt: nowLocalIso(),
    }
  );
}

/**
 * Get the van stock. Prefer remote van stock, cache it when possible, and fall back to the local
 * snapshot when the request fails.
 *
 * @param remote the settled remote stock request
 * @param cached the stock stored on db
 *
 * @returns the stock snapshot to use
 */
async function loadStock(
  remote: Settled<VanStockItem[]>,
  cached: StoredStockItem[],
): Promise<StoredStockItem[]> {
  if (remote.ok) {
    try {
      return await replaceStock(remote.value);
    } catch {
      const cachedAt = nowLocalIso();
      return remote.value.map((item) => ({ ...item, cachedAt }));
    }
  }

  return cached;
}

/**
 * Choose the worksheet draft to display. Local work always wins; otherwise a
 * remote worksheet is mapped and persisted, and finally an empty draft is
 * returned when neither exists.
 *
 * @param jobId           the job id
 * @param localDraft      the draft stored on the db, if any
 * @param remoteWorksheet the worksheet returned by the API, if any
 * @param stock           van stock used to enrich remote parts
 * @param templateItems   checklist items used to seed the draft
 *
 * @returns the selected draft and its last-saved timestamp, when available
 */
async function resolveWorksheetDraft(
  jobId: string,
  localDraft: WorksheetDraft | undefined,
  remoteWorksheet: RemoteWorksheet | null,
  stock: StoredStockItem[],
  templateItems: ChecklistTemplate["items"],
): Promise<{ draft: WorksheetDraft; savedAt?: string }> {
  if (localDraft) {
    return { draft: localDraft, savedAt: localDraft.updatedAt };
  }

  if (remoteWorksheet) {
    const mapped = mapRemoteWorksheetToDraft(
      jobId,
      remoteWorksheet,
      stock,
      templateItems,
    );

    try {
      const draft = await saveWorksheetDraft(mapped);
      return { draft, savedAt: draft.updatedAt };
    } catch {
      return { draft: mapped, savedAt: mapped.updatedAt };
    }
  }

  return { draft: createInitialDraft(jobId, templateItems) };
}

/**
 * Load everything the worksheet needs: job, template, van stock and the
 * best available local draft. The local draft always wins over the remote
 * one so work done on this tablet is never overwritten.
 */
export async function loadWorksheet(
  jobId: string,
): Promise<WorksheetSnapshot> {

  // get local data
  let localJob: JobRecord | undefined;
  let localDraft: WorksheetDraft | undefined;
  let localQueue: QueueItem | undefined;
  try {
    [localJob, localDraft, localQueue] = await Promise.all([
      getJob(jobId),
      getWorksheet(jobId),
      getQueueItem(jobId),
    ]);
  } catch {
  }

  // Get job from api
  let remoteJob: JobRecord | undefined;
  try {
    const fetched = await fetchJob(jobId);
    remoteJob = { ...fetched, cachedAt: nowLocalIso() };
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) throw error;
    if (!localJob) throw error;
  }

  // Local work (a draft or a queued item) keeps the sync status known by this
  // tablet. Otherwise a refresh from the office would turn "On this tablet
  // only" back into "Not started" and lock a worksheet that still has work
  const hasLocalWork = Boolean(localDraft) || Boolean(localQueue);
  const job =
    remoteJob && localJob && hasLocalWork
      ? {
          ...remoteJob,
          status: localJob.status,
          localOnly: localJob.localOnly,
          syncedAt: localJob.syncedAt,
          queuedItems: localJob.queuedItems,
          conflictWith: localJob.conflictWith,
        }
      : remoteJob ?? localJob;
  if (!job) throw new Error("Job not found");

  try {
    await putJobs([job]);
  } catch {
  }

  //Remote and local request. Each request is handled separately
  const sources = await settleAll({
    remoteTemplate: fetchTemplate(job.plantType),
    remoteStock: fetchVanStock(),
    remoteWorksheet: fetchWorksheet(jobId),
    localTemplate: getTemplate(job.plantType),
    localStock: listStock(),
    localDrafts: listWorksheets(),
    localPhotos: listPhotosByJob(jobId),
  });

  const template = await loadTemplate(
    sources.remoteTemplate,
    settledValue(sources.localTemplate),
    job.plantType,
  );
  const stock = await loadStock(
    sources.remoteStock,
    settledValue(sources.localStock) ?? [],
  );
  const { draft, savedAt } = await resolveWorksheetDraft(
    jobId,
    localDraft,
    settledValue(sources.remoteWorksheet) ?? null,
    stock,
    template.items,
  );

  const readOnly =
    job.status === "synced" || job.status === "conflict";

  return {
    job,
    template,
    stock,
    stockUsage: calculatePartsUsage(
      settledValue(sources.localDrafts) ?? [],
      draft,
    ),
    draft,
    photos: settledValue(sources.localPhotos) ?? [],
    readOnly,
    savedAt,
  };
}

/**
 * Save a worksheet on db and return the stored copy.
 */
export async function saveWorksheetDraft(
  draft: WorksheetDraft,
): Promise<WorksheetDraft> {
  const next = { ...draft, updatedAt: nowLocalIso() };
  await putWorksheet(next);
  return next;
}

/**
 * Build the payload for the backend, embedding each photo binary as a data URL
 *
 * The helper backend has no photo endpoint, so the images travel inside the
 * worksheet PUT. Photos that exist only in a remote worksheet (never downloaded
 * here) keep their metadata and are sent without binary data
 */
export async function prepareWorksheetUpload(
  jobId: string,
  conflict?: RemoteWorksheet["conflict"],
): Promise<RemoteWorksheet> {
  const [draft, photos] = await Promise.all([
    getWorksheet(jobId),
    listPhotosByJob(jobId),
  ]);

  if (!draft) throw new Error("Worksheet not found");

  const dataUrls = new Map<string, string>();
  await Promise.all(
    photos.map(async (photo) => {
      dataUrls.set(photo.id, await blobToDataUrl(photo.blob));
    }),
  );

  const remote = mapDraftToRemoteWorksheet(draft, conflict);
  if (!remote.photos?.length) return remote;

  return {
    ...remote,
    photos: remote.photos.map((photo) => {
      const dataUrl = dataUrls.get(photo.id);
      return dataUrl ? { ...photo, dataUrl } : photo;
    }),
  };
}

/**
 * Mark the worksheet photos as received by the office after a successful PUT
 */
export async function markWorksheetPhotosUploaded(jobId: string): Promise<void> {
  await Promise.all([
    markPhotosUploaded(jobId),
    markStoredWorksheetPhotosUploaded(jobId),
  ]);
}
