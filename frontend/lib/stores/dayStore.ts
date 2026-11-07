import { create } from "zustand";
import type { DayInfo, JobRecord } from "@/lib/db";
import { readTodayCache, loadToday } from "@/lib/services/today";

interface DayState {
  day: DayInfo | undefined;
  jobs: JobRecord[];
  pendingCount: number;
  source: "network" | "cache" | undefined;
  loading: boolean;
  error: unknown | undefined;

  hydrate: () => Promise<void>;
  refresh: () => Promise<void>;
  reloadFromCache: () => Promise<void>;
}

export const useDayStore = create<DayState>((set) => ({
  day: undefined,
  jobs: [],
  pendingCount: 0,
  source: undefined,
  loading: false,
  error: undefined,

  hydrate: async () => {
    const cached = await readTodayCache();
    if (cached) {
      set({
        day: cached.day,
        jobs: cached.jobs,
        pendingCount: cached.pendingCount,
        source: "cache",
        error: undefined,
      });
    }

    set({ loading: true, error: undefined });

    try {
      const result = await loadToday();
      set({
        day: result.day,
        jobs: result.jobs,
        pendingCount: result.pendingCount,
        source: result.source,
        loading: false,
        error: undefined,
      });
    } catch (error) {
      set({ loading: false, error });
    }
  },

  refresh: async () => {
    set({ loading: true, error: undefined });
    try {
      const result = await loadToday();
      set({
        day: result.day,
        jobs: result.jobs,
        pendingCount: result.pendingCount,
        source: result.source,
        loading: false,
        error: undefined,
      });
    } catch (error) {
      set({ loading: false, error });
    }
  },

  /**
   * Reload the day and jobs from db without calling the network.
   */
  reloadFromCache: async () => {
    const cached = await readTodayCache();
    if (!cached) return;

    set({
      day: cached.day,
      jobs: cached.jobs,
      pendingCount: cached.pendingCount,
      source: "cache",
      error: undefined,
    });
  },
}));
