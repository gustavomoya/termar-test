import { create } from "zustand";
import type { DayInfo, JobRecord } from "@/lib/db";
import { readTodayCache, loadToday } from "@/lib/data/today";

interface DayState {
  day: DayInfo | undefined;
  jobs: JobRecord[];
  source: "network" | "cache" | undefined;
  loading: boolean;
  error: unknown | undefined;

  hydrate: () => Promise<void>;
  refresh: () => Promise<void>;
}

export const useDayStore = create<DayState>((set) => ({
  day: undefined,
  jobs: [],
  source: undefined,
  loading: false,
  error: undefined,

  hydrate: async () => {
    const cached = await readTodayCache();
    if (cached) {
      set({
        day: cached.day,
        jobs: cached.jobs,
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
        source: result.source,
        loading: false,
        error: undefined,
      });
    } catch (error) {
      set({ loading: false, error });
    }
  },
}));
