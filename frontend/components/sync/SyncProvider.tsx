"use client";

import { useEffect } from "react";
import { useDayStore } from "@/lib/stores/dayStore";
import { useNetworkStore } from "@/lib/stores/networkStore";
import { flushQueue, getNextSyncAt } from "@/lib/sync/engine";
import { subscribeQueueChanges } from "@/lib/sync/events";
import {
  readStoredSimulatedOffline,
  SIMULATED_OFFLINE_STORAGE_KEY,
} from "@/lib/network/simulation";
import { probeBackend } from "@/lib/network/probe";

const HEARTBEAT_INTERVAL_MS = 30_000;

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
        if (
          result.synced > 0 ||
          result.failed > 0 ||
          result.conflicts > 0
        ) {
          await useDayStore.getState().reloadFromCache();
        }
      } catch {
        // The queue keeps the failed item for the next retry.
      } finally {
        await schedule();
      }
    }

    let probing = false;

    async function probeAndApply() {
      if (probing) return;
      probing = true;

      try {
        const reachable = await probeBackend();
        if (disposed) return;
        useNetworkStore.getState().setReachable(reachable);
      } finally {
        probing = false;
      }
    }

    const handleOnline = () => {
      useNetworkStore.getState().setOnline(true);
      void probeAndApply();
    };

    const handleOffline = () => {
      useNetworkStore.getState().setOnline(false);
    };

    const handleWake = () => {
      if (navigator.onLine) {
        useNetworkStore.getState().setOnline(true);
      }
      void probeAndApply();
    };

    const handleVisibility = () => {
      if (document.visibilityState === "visible") handleWake();
    };

    const handleQueueChange = () => {
      void run();
    };

    // The demo's simulated signal lives in localStorage so every tab and a
    // reload see the same state. Restore it before the first sync attempt.
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== SIMULATED_OFFLINE_STORAGE_KEY) return;
      useNetworkStore
        .getState()
        .setSimulatedOffline(event.newValue === "true");
    };

    useNetworkStore
      .getState()
      .setSimulatedOffline(readStoredSimulatedOffline());
    useNetworkStore.getState().setOnline(navigator.onLine);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("focus", handleWake);
    window.addEventListener("pageshow", handleWake);
    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("storage", handleStorage);
    const unsubscribe = subscribeQueueChanges(handleQueueChange);
    const unsubscribeNetwork = useNetworkStore.subscribe((state, previous) => {
      if (
        state.simulatedOffline !== previous.simulatedOffline &&
        !state.simulatedOffline
      ) {
        void probeAndApply();
      }

      if (state.online === previous.online) return;

      if (!state.online) {
        clearTimer();
        return;
      }

      void run();
    });

    const heartbeat = setInterval(() => {
      if (document.visibilityState === "visible") {
        void probeAndApply();
      }
    }, HEARTBEAT_INTERVAL_MS);

    void probeAndApply();
    void run();

    return () => {
      disposed = true;
      clearTimer();
      clearInterval(heartbeat);
      unsubscribe();
      unsubscribeNetwork();
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("focus", handleWake);
      window.removeEventListener("pageshow", handleWake);
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  return null;
}
