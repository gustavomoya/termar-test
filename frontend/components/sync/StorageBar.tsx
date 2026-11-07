"use client";

import type { StorageUsage } from "@/lib/services/sync";
import { formatBytes } from "@/lib/format";

interface StorageBarProps {
  storage: StorageUsage;
}

/**
 * Space used on the tablet, measured with the Storage API.
 *
 * The bar is deliberately text-first: the technician has to be able to read
 * "42 MB of 50 MB" even when the colour is hard to see under boiler-room light.
 */
export function StorageBar({ storage }: StorageBarProps) {
  const { usageBytes, quotaBytes, estimated } = storage;
  const percent =
    quotaBytes > 0
      ? Math.min(100, Math.round((usageBytes / quotaBytes) * 100))
      : 0;
  const almostFull = percent >= 90;

  return (
    <section className="overflow-hidden rounded-lg border border-border bg-surface shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-b border-border px-4 py-3">
        <span className="text-base font-semibold">
          Space used on this tablet
        </span>
        <strong className={almostFull ? "text-danger" : undefined}>
          {formatBytes(usageBytes)} of {formatBytes(quotaBytes)}
        </strong>
      </div>

      <div className="p-4">
        <div
          role="progressbar"
          aria-label="Space used on this tablet"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent}
          className="h-2 overflow-hidden rounded-full bg-surface-sunken"
        >
          <div
            className={`h-full rounded-full ${
              almostFull ? "bg-danger" : "bg-primary"
            }`}
            style={{ width: `${percent}%` }}
          />
        </div>

        {almostFull ? (
          <p className="mt-2 text-sm font-medium text-danger">
            This tablet is almost full. Photos are the large ones — delete a few
            before the next job.
          </p>
        ) : (
          <p className="mt-2 text-xs text-ink-muted">
            Photos are the large ones. On a two-day route this fills up.
          </p>
        )}

        {estimated && (
          <p className="mt-1 text-xs text-ink-muted">
            This tablet does not report its real capacity, so 50 MB is the
            conservative estimate.
          </p>
        )}
      </div>
    </section>
  );
}
