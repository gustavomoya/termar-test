import { create } from "zustand";
import type { DayInfo, JobRecord } from "@/lib/db";
import {
  readTodayCache,
  loadToday,
  type TodaySnapshot,
} from "@/lib/services/today";

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

export const useDayStore = create<DayState>((set) => {
  const applyCache = (cached: TodaySnapshot | null) => {
    if (!cached) return;

    set({
      day: cached.day,
      jobs: cached.jobs,
      pendingCount: cached.pendingCount,
      source: "cache",
      error: undefined,
    });
  };

  const loadFromNetwork = async () => {
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
  };

  return {
    day: undefined,
    jobs: [],
    pendingCount: 0,
    source: undefined,
    loading: false,
    error: undefined,

    hydrate: async () => {
      const cached = await readTodayCache()
      applyCache(cached);
      await loadFromNetwork();
    },

    refresh: loadFromNetwork,

    /**
     * Reload the day and jobs from db without calling the network.
     */
    reloadFromCache: async () => {
      applyCache(await readTodayCache());
    },
  };
});
