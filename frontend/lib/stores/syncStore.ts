import { create } from "zustand";
import {
  loadSyncOverview,
  loadConflicts,
  type ConflictSummary,
  type SyncOverview,
} from "@/lib/services/sync";

interface SyncState {
  overview?: SyncOverview;
  conflicts: ConflictSummary[];
  loading: boolean;
  sending: boolean;
  error?: unknown;
  sendError?: string;

  hydrate: () => Promise<void>;
  refresh: () => Promise<void>;
}

const TIMEOUT_MS = 8000;

function withTimeout<T>(promise: Promise<T>): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Timed out reading the sync queue")), TIMEOUT_MS),
    ),
  ]);
}

export const useSyncStore = create<SyncState>((set, get) => {
  const reload = async () => {
    set({ loading: true, error: undefined });

    try {
      const [overview, conflicts] = await withTimeout(
        Promise.all([loadSyncOverview(), loadConflicts()]),
      );

      set({ overview, conflicts, loading: false });
    } catch (error) {
      set({ loading: false, error });
    }
  };



  return {
    overview: undefined,
    conflicts: [],
    loading: false,
    sending: false,
    error: undefined,
    sendError: undefined,
    hydrate: reload,
    refresh: reload,
  };
});
