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

  setSimulatedOffline: (offline) => {
    setSimulationOffline(offline);
    set({
      simulatedOffline: offline,
      online: get().nativeOnline && !offline,
    });
  },

  tick: () => set({ heartbeat: nowLocalIso() }),
}));
