"use client";

import { useEffect } from "react";
import { useNetworkStore } from "@/lib/stores/networkStore";
import { readStoredSimulatedOffline } from "@/lib/network/simulation";

export function useOnlineStatus(): boolean {
  const online = useNetworkStore((state) => state.online);
  const setSimulatedOffline = useNetworkStore(
    (state) => state.setSimulatedOffline,
  );

  useEffect(() => {
    setSimulatedOffline(readStoredSimulatedOffline());
  }, [setSimulatedOffline]);

  return online;
}
