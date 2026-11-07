"use client";

import { useEffect } from "react";
import { useNetworkStore } from "@/lib/stores/networkStore";
import { readStoredSimulatedOffline } from "@/lib/network/simulation";

export function useOnlineStatus(): boolean {
  const online = useNetworkStore((state) => state.online);
  const setOnline = useNetworkStore((state) => state.setOnline);
  const setSimulatedOffline = useNetworkStore(
    (state) => state.setSimulatedOffline,
  );

  useEffect(() => {
    setSimulatedOffline(readStoredSimulatedOffline());
    setOnline(navigator.onLine);

    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [setOnline, setSimulatedOffline]);

  return online;
}
