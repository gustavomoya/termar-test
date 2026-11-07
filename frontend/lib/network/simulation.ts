export const NETWORK_SIMULATION_ENABLED =
  process.env.NEXT_PUBLIC_DEMO_NETWORK === "true";

export const SIMULATED_OFFLINE_STORAGE_KEY = "termar:simulated-offline";

let simulatedOffline = false;

export function isNetworkSimulationEnabled(): boolean {
  return NETWORK_SIMULATION_ENABLED;
}

/**
 * Read the demo's simulated-offline flag from localStorage.
 *
 * The value is shared between tabs and survives a reload, so the demo behaves
 * like a real loss of signal instead of resetting on every navigation.
 */
export function readStoredSimulatedOffline(): boolean {
  if (!NETWORK_SIMULATION_ENABLED || typeof window === "undefined") {
    return false;
  }

  try {
    return window.localStorage.getItem(SIMULATED_OFFLINE_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

export function isSimulatedOffline(): boolean {
  return simulatedOffline;
}

export function setSimulatedOffline(value: boolean): void {
  simulatedOffline = value;

  if (!NETWORK_SIMULATION_ENABLED || typeof window === "undefined") return;

  try {
    window.localStorage.setItem(
      SIMULATED_OFFLINE_STORAGE_KEY,
      value ? "true" : "false",
    );
  } catch {
    // Private mode or a full quota should not break the demo.
  }
}
