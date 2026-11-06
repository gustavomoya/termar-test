"use client";

import { isNetworkSimulationEnabled } from "@/lib/network/simulation";
import { useNetworkStore } from "@/lib/stores/networkStore";

export function DemoNetworkToggle() {
  const simulatedOffline = useNetworkStore((state) => state.simulatedOffline);
  const setSimulatedOffline = useNetworkStore(
    (state) => state.setSimulatedOffline,
  );

  if (!isNetworkSimulationEnabled()) return null;

  return (
    <label
      title="Demo: pretend this tablet has no signal"
      className={`inline-flex min-h-[48px] cursor-pointer items-center gap-2 rounded-full border px-3 text-xs font-semibold transition-colors ${
        simulatedOffline
          ? "border-warning-border bg-warning-soft text-warning"
          : "border-border-strong bg-surface text-ink-secondary hover:bg-surface-hover"
      }`}
    >
      <input
        type="checkbox"
        role="switch"
        aria-label="Simulate no signal"
        aria-checked={simulatedOffline}
        checked={simulatedOffline}
        onChange={(event) => setSimulatedOffline(event.target.checked)}
        className="peer sr-only"
      />

      <span
        aria-hidden="true"
        className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-primary/30 peer-focus-visible:ring-offset-2 ${
          simulatedOffline ? "bg-warning" : "bg-border-strong"
        }`}
      >
        <span
          className={`h-4 w-4 rounded-full bg-surface shadow-sm transition-transform ${
            simulatedOffline ? "translate-x-4" : "translate-x-0.5"
          }`}
        />
      </span>

      <span className="hidden md:inline">Simulate no signal</span>
    </label>
  );
}
