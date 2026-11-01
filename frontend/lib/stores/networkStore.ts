import { create } from "zustand";
import { nowLocalIso } from "@/lib/time";

interface NetworkState {
  online: boolean;
  simulado: boolean;
  heartbeat: string | undefined;

  setOnline: (online: boolean) => void;
  setSimulado: (simulado: boolean) => void;
  tick: () => void;
}

export const useNetworkStore = create<NetworkState>((set) => ({
  online: true,
  simulado: false,
  heartbeat: undefined,

  setOnline: (online) => set({ online }),
  setSimulado: (simulado) => set({ simulado }),

  tick: () => set({ heartbeat: nowLocalIso() }),
}));
