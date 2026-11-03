import { create } from "zustand";
import type {
  CheckResult,
  JobRecord,
  Signature,
  StoredStockItem,
  StoredTemplate,
  WorksheetDraft,
} from "@/lib/db";
import { loadWorksheet } from "@/lib/services/worksheet";

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
  };
});
