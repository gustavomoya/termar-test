import { create } from "zustand";
import type {
  CheckResult,
  JobRecord,
  Signature,
  StoredStockItem,
  StoredTemplate,
  WorksheetDraft,
} from "@/lib/db";
import { loadWorksheet, saveWorksheetDraft } from "@/lib/services/worksheet";
import { nowLocalIso } from "@/lib/time";

/**
 * Checklist result without the measurement variant.
 */
type PassFailResult = Exclude<CheckResult, "measure">;

/**
 * Local worksheet state and actions.
 */
interface WorksheetState {
  job?: JobRecord;
  template?: StoredTemplate;
  stock: StoredStockItem[];
  stockUsage: Record<string, number>;
  draft?: WorksheetDraft;
  readOnly: boolean;
  loading: boolean;
  saving: boolean;
  error?: unknown;
  saveError?: unknown;
  finishErrors: string[];
  lastSavedAt?: string;

  hydrate: (jobId: string) => Promise<void>;
  startTimer: () => void;
  stopTimer: () => void;
  resumeTimer: () => void;
  restartTimer: () => void;
  setCheck: (itemId: string, result: PassFailResult) => void;
  setMeasure: (itemId: string, value: number | undefined) => void;
  setNote: (itemId: string, note: string) => void;
  addPart: (item: StoredStockItem) => void;
  decrementPart: (sku: string) => void;
  removePart: (sku: string) => void;
  setSignature: (signature: Signature) => void;
  clearSignature: () => void;
  finish: () => { ok: boolean; errors: string[] };
  flush: () => Promise<boolean>;
}

export const useWorksheetStore = create<WorksheetState>((set, get) => {
  let saveTimer: ReturnType<typeof setTimeout> | undefined;
  // Whether the draft changed since the last successful save.
  let dirty = false;

  /**
   * Save the current worksheet, skipping writes when nothing changed.
   *
   * @returns true when the draft is saved or there is nothing to save
   */
  const persist = async (): Promise<boolean> => {
    const draft = get().draft;
    if (!draft) return false;

    //If nothing has changed, do not write to the database.
    if (!dirty) return true;

    set({ saving: true });
    try {
      const saved = await saveWorksheetDraft(draft);
      if (get().draft === draft) dirty = false;
      set({
        saving: false,
        saveError: undefined,
        lastSavedAt: saved.updatedAt,
      });
      return true;
    } catch (error) {
      set({ saving: false, saveError: error });
      return false;
    }
  };

  /**
   * Schedule a save after the technician stops editing.
   */
  const scheduleSave = () => {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      saveTimer = undefined;
      void persist();
    }, 500);
  };

  /**
   * Update the worksheet draft and schedule a save.
   * No-op when the worksheet is read-only or not loaded.
   *
   * @param updater receives the current worksheet draft and returns the next one
   */
  const updateDraft = (updater: (draft: WorksheetDraft) => WorksheetDraft) => {
    const draft = get().draft;
    if (!draft || get().readOnly) return;

    dirty = true;
    set({
      draft: {
        ...updater(draft),
        finishedAt: undefined,
        updatedAt: nowLocalIso(),
      },
      finishErrors: [],
    });
    scheduleSave();
  };

  return {
    stock: [],
    stockUsage: {},
    readOnly: false,
    loading: false,
    saving: false,
    finishErrors: [],

    /**
     * Load the job, template, stock and best available worksheet for a job.
     *
     * @param jobId the job identifier
     */
    hydrate: async (jobId) => {
      dirty = false;
      set({
        job: undefined,
        template: undefined,
        stock: [],
        stockUsage: {},
        draft: undefined,
        readOnly: false,
        loading: true,
        saving: false,
        error: undefined,
        saveError: undefined,
        finishErrors: [],
        lastSavedAt: undefined,
      });

      try {
        const snapshot = await loadWorksheet(jobId);
        set({
          job: snapshot.job,
          template: snapshot.template,
          stock: snapshot.stock,
          stockUsage: snapshot.stockUsage,
          draft: snapshot.draft,
          readOnly: snapshot.readOnly,
          lastSavedAt: snapshot.savedAt,
          loading: false,
          error: undefined,
        });
      } catch (error) {
        set({ loading: false, error });
      }
    },
    /**
     * Start the site timer if it is not already running.
     */
    startTimer: () => {
      const now = nowLocalIso();
      updateDraft((draft) => {
        if (draft.runningSince) return draft;
        return {
          ...draft,
          startedAt: draft.startedAt ?? now,
          runningSince: now,
          stoppedAt: undefined,
        };
      });
    },

    /**
     * Stop the site timer and accumulate the elapsed time.
     */
    stopTimer: () => {
      const now = Date.now();
      const stoppedAt = nowLocalIso();
      updateDraft((draft) => {
        if (!draft.runningSince) return draft;
        return {
          ...draft,
          accumulatedMs:
              draft.accumulatedMs +
              Math.max(0, now - new Date(draft.runningSince).getTime()),
          runningSince: undefined,
          stoppedAt,
        };
      });
    },

    /**
     * Resume the timer without resetting the accumulated time.
     */
    resumeTimer: () => {
      const now = nowLocalIso();
      updateDraft((draft) => {
        if (draft.runningSince) return draft;
        return {
          ...draft,
          startedAt: draft.startedAt ?? now,
          runningSince: now,
          stoppedAt: undefined,
        };
      });
    },

    /**
     * Reset the timer and start it again from zero.
     */
    restartTimer: () => {
      const now = nowLocalIso();
      updateDraft((draft) => ({
        ...draft,
        startedAt: now,
        runningSince: now,
        accumulatedMs: 0,
        stoppedAt: undefined,
      }));
    },

    /**
     * Save a pass, fail or not-applicable answer for a checklist item.
     *
     * @param itemId the checklist item identifier
     * @param result the selected result
     */
    setCheck: (itemId, result) => {
      const updatedAt = nowLocalIso();
      updateDraft((draft) => {
        const existing = draft.checks[itemId];
        return {
          ...draft,
          checks: {
            ...draft.checks,
            [itemId]: {
              result,
              value: undefined,
              note: result === "pass" ? undefined : existing?.note,
              updatedAt,
            },
          },
        };
      });
    },

    /**
     * Save a measured value. Passing undefined or a non-finite number
     * clears the answer.
     *
     * @param itemId the checklist item identifier
     * @param value  the measured value
     */
    setMeasure: (itemId, value) => {
      const updatedAt = nowLocalIso();
      updateDraft((draft) => {
        const checks = { ...draft.checks };

        if (value === undefined || !Number.isFinite(value)) {
          delete checks[itemId];
        } else {
          checks[itemId] = {
            result: "measure",
            value,
            note: checks[itemId]?.note,
            updatedAt,
          };
        }

        return { ...draft, checks };
      });
    },

    /**
     * Set or clear the note attached to a checklist answer.
     *
     * @param itemId the checklist item identifier
     * @param note   the note text; whitespace-only clears it
     */
    setNote: (itemId, note) => {
      const updatedAt = nowLocalIso();
      updateDraft((draft) => {
        const existing = draft.checks[itemId];
        if (!existing) return draft;

        return {
          ...draft,
          checks: {
            ...draft.checks,
            [itemId]: {
              ...existing,
              note: note.trim() ? note : undefined,
              updatedAt,
            },
          },
        };
      });
    },

    /**
     * Add one unit of a stock item, respecting the quantity available on the van.
     *
     * @param item the stock item to add
     */
    addPart: (item) => {
      const draft = get().draft;
      if (!draft || get().readOnly) return;

      const usage = get().stockUsage;
      const used = usage[item.sku] ?? 0;
      if (used >= item.onVan) return;

      const existing = draft.parts.find((part) => part.sku === item.sku);
      const parts = existing
          ? draft.parts.map((part) =>
              part.sku === item.sku
                  ? { ...part, quantity: part.quantity + 1 }
                  : part,
          )
          : [
            ...draft.parts,
            {
              sku: item.sku,
              label: item.label,
              unit: item.unit,
              quantity: 1,
            },
          ];

      dirty = true;
      set({
        draft: { ...draft, parts, updatedAt: nowLocalIso() },
        stockUsage: { ...usage, [item.sku]: used + 1 },
        finishErrors: [],
      });
      scheduleSave();
    },

    /**
     * Remove one unit of a part, deleting it when its quantity reaches zero.
     *
     * @param sku the part SKU
     */
    decrementPart: (sku) => {
      const draft = get().draft;
      if (!draft || get().readOnly) return;

      const existing = draft.parts.find((part) => part.sku === sku);
      if (!existing) return;

      const usage = get().stockUsage;
      const used = Math.max(0, (usage[sku] ?? 0) - 1);
      const parts =
          existing.quantity <= 1
              ? draft.parts.filter((part) => part.sku !== sku)
              : draft.parts.map((part) =>
                  part.sku === sku
                      ? { ...part, quantity: part.quantity - 1 }
                      : part,
              );

      dirty = true;
      set({
        draft: { ...draft, parts, updatedAt: nowLocalIso() },
        stockUsage: { ...usage, [sku]: used },
        finishErrors: [],
      });
      scheduleSave();
    },

    /**
     * Remove all units of a part from the worksheet.
     *
     * @param sku the part SKU
     */
    removePart: (sku) => {
      const draft = get().draft;
      if (!draft || get().readOnly) return;

      const existing = draft.parts.find((part) => part.sku === sku);
      if (!existing) return;

      const usage = get().stockUsage;
      const used = Math.max(0, (usage[sku] ?? 0) - existing.quantity);

      dirty = true;
      set({
        draft: {
          ...draft,
          parts: draft.parts.filter((part) => part.sku !== sku),
          updatedAt: nowLocalIso(),
        },
        stockUsage: { ...usage, [sku]: used },
        finishErrors: [],
      });
      scheduleSave();
    },

    /**
     * Cancel any pending save and persist immediately.
     *
     * @returns true when the worksheet draft was saved successfully
     */
    flush: async () => {
      if (saveTimer) {
        clearTimeout(saveTimer);
        saveTimer = undefined;
      }
      return persist();
    },
  };
});
