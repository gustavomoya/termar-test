export const NETWORK_SIMULATION_ENABLED =
  process.env.NEXT_PUBLIC_DEMO_NETWORK === "true";

let simulatedOffline = false;

export function isNetworkSimulationEnabled(): boolean {
  return NETWORK_SIMULATION_ENABLED;
}

export function isSimulatedOffline(): boolean {
  return simulatedOffline;
}

export function setSimulatedOffline(value: boolean): void {
  simulatedOffline = value;
}
