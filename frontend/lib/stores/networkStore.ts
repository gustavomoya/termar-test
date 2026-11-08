import { create } from "zustand";
import {
  isSimulatedOffline,
  setSimulatedOffline as setSimulationOffline,
} from "@/lib/network/simulation";
import { nowLocalIso } from "@/lib/time";

interface NetworkState {
  online: boolean;
  nativeOnline: boolean;
  simulatedOffline: boolean;
  heartbeat: string | undefined;

  setOnline: (online: boolean) => void;
  setReachable: (reachable: boolean) => void;
  setSimulatedOffline: (offline: boolean) => void;
  tick: () => void;
}

export const useNetworkStore = create<NetworkState>((set, get) => ({
  online: !isSimulatedOffline(),
  nativeOnline: true,
  simulatedOffline: isSimulatedOffline(),
  heartbeat: undefined,

  setOnline: (online) =>
    set({
      nativeOnline: online,
      online: online && !get().simulatedOffline,
    }),

  setReachable: (reachable) =>
    set({
      online: reachable && !get().simulatedOffline,
    }),

  setSimulatedOffline: (offline) => {
    if (get().simulatedOffline === offline) return;

    setSimulationOffline(offline);

    // Re-read the browser signal when the switch changes
    const nativeOnline =
      typeof navigator === "undefined" ? get().nativeOnline : navigator.onLine;

    set({
      nativeOnline,
      simulatedOffline: offline,
      online: nativeOnline && !offline,
    });
  },

  tick: () => set({ heartbeat: nowLocalIso() }),
}));
