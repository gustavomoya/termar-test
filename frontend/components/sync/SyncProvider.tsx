"use client";

import { useEffect } from "react";
import { useDayStore } from "@/lib/stores/dayStore";
import { useNetworkStore } from "@/lib/stores/networkStore";
import { flushQueue, getNextSyncAt } from "@/lib/sync/engine";
import { subscribeQueueChanges } from "@/lib/sync/events";

/**
 * Runs the sync engine when the app starts, when the network comes back and
 * when the next queued retry is due. It renders nothing
 */
export function SyncProvider() {
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let disposed = false;

    const clearTimer = () => {
      if (!timer) return;
      clearTimeout(timer);
      timer = undefined;
    };

    async function schedule() {
      if (disposed) return;
      clearTimer();
      if (!useNetworkStore.getState().online) return;

      const next = await getNextSyncAt();
      if (!next || disposed) return;

      const delay = Math.max(0, new Date(next).getTime() - Date.now());
      timer = setTimeout(() => {
        void run();
      }, delay);
    }

    async function run() {
      if (disposed || !useNetworkStore.getState().online) return;

      try {
        const result = await flushQueue();
        if (result.synced > 0 || result.failed > 0) {
          await useDayStore.getState().reloadFromCache();
        }
      } catch {
        // The queue keeps the failed item for the next retry.
      } finally {
        await schedule();
      }
    }

    const handleOnline = () => {
      useNetworkStore.getState().setOnline(true);
      void run();
    };

    const handleOffline = () => {
      useNetworkStore.getState().setOnline(false);
      clearTimer();
    };

    const handleQueueChange = () => {
      void run();
    };

    useNetworkStore.getState().setOnline(navigator.onLine);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    const unsubscribe = subscribeQueueChanges(handleQueueChange);
    const unsubscribeNetwork = useNetworkStore.subscribe((state, previous) => {
      if (state.simulatedOffline === previous.simulatedOffline) return;

      if (state.simulatedOffline) {
        clearTimer();
        return;
      }

      void run();
    });

    void run();

    return () => {
      disposed = true;
      clearTimer();
      unsubscribe();
      unsubscribeNetwork();
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return null;
}
