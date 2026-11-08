import { apiFetch } from "@/lib/api/client";
import { isSimulatedOffline } from "@/lib/network/simulation";

const PROBE_TIMEOUT_MS = 5000;

/**
 * Check whether the backend is reachable with a real request.
 *
 * `navigator.onLine` only tells us whether the tablet has a network interface;
 * it does not prove that the API can be reached. The heartbeat and the demo
 * switch use this probe so "Online" means the app can actually sync.
 */
export async function probeBackend(): Promise<boolean> {
  if (isSimulatedOffline()) return false;

  try {
    await apiFetch("/api/day", { cache: "no-store" }, PROBE_TIMEOUT_MS);
    return true;
  } catch {
    return false;
  }
}
