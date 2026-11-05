import { useSyncStore } from "@/lib/stores/syncStore";
import type { ConflictSummary } from "@/lib/services/sync";

interface ConflictSectionProps {
  conflict: ConflictSummary;
  sending: boolean;
  onResolve: (jobId: string, decision: "mine" | "other" | "both") => void;
}

/**
 * One job completed twice, waiting for the technician to decide which
 * worksheet is the real one. Shown with color + text together.
 */
export function ConflictSection({
  conflict,
  sending,
  onResolve,
}: ConflictSectionProps) {
  const { mine, other } = conflict;
  const parts = mine.partsUsed.length > 0 ? mine.partsUsed.join(", ") : "None";

  return (
    <section
      className="overflow-hidden rounded-lg border border-border bg-surface shadow-sm"
      style={{ borderColor: "var(--color-danger-border)" }}
    >
      <div
        className="flex items-center justify-between gap-3 border-b border-border px-4 py-3"
        style={{
          background: "var(--color-danger-soft)",
          borderBottomColor: "var(--color-danger-border)",
        }}
      >
        <span className="text-base font-semibold text-danger">
          One job was done twice
        </span>
        <span className="text-xs font-semibold border border-danger-border text-danger rounded-full px-2 py-0.5 uppercase tracking-wider">
          Needs your decision
        </span>
      </div>

      <div className="px-4 py-3 text-sm text-ink-secondary">
        <p className="mb-2">
          <strong>{conflict.reference} · {conflict.site}</strong>. While you
          were underground the office reassigned this job to{" "}
          <strong>{other.technician}</strong>, and she filled it in too.
          Nothing has been sent. Choose which worksheet is the real one — or
          send both and let the office decide.
        </p>
        <p className="text-xs text-ink-muted">
          For {other.technician}&apos;s worksheet only the data available to this
          tablet is shown; everything else is “—”.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
        <div className="border border-border rounded-lg p-4">
          <h3 className="text-md font-semibold mb-2">Yours</h3>
          <div className="text-sm text-secondary mb-3">
            {mine.technician} · {mine.van}
          </div>
          <dl className="divide-y divide-border text-sm">
            <div className="pt-3 text-ink-secondary">
              <dt className="mb-1">Completed</dt>
              <dd className="text-ink font-medium">
                {mine.completedAt ?? "—"}
              </dd>
            </div>
            <div className="pt-3 text-ink-secondary">
              <dt className="mb-1">Checks answered</dt>
              <dd className="text-ink font-medium">{mine.checksAnswered}</dd>
            </div>
            <div className="pt-3 text-ink-secondary">
              <dt className="mb-1">Failed checks</dt>
              <dd className="text-ink font-medium">{mine.failedChecks}</dd>
            </div>
            <div className="pt-3 text-ink-secondary">
              <dt className="mb-1">Parts used</dt>
              <dd className="text-ink font-medium">{parts}</dd>
            </div>
            <div className="pb-3 text-ink-secondary">
              <dt className="mb-1">Photos</dt>
              <dd className="text-ink font-medium">{mine.photos}</dd>
              <dt className="mt-2 mb-1">Signature</dt>
              <dd className="text-ink font-medium">
                {mine.signature ?? "Not signed"}
              </dd>
            </div>
          </dl>
          <button
            type="button"
            disabled={sending}
            onClick={() => onResolve(conflict.jobId, "mine")}
            className="mt-4 inline-flex min-h-[48px] items-center justify-center rounded-lg bg-primary px-4 py-2 text-base font-medium text-ink-inverse hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Keep mine
          </button>
        </div>

        <div className="border border-border rounded-lg p-4">
          <h3 className="text-md font-semibold mb-2">{other.technician}</h3>
          <div className="text-sm text-secondary mb-3">
            The office&apos;s copy
          </div>
          <dl className="divide-y divide-border text-sm">
            <div className="pt-3 text-ink-secondary">
              <dt className="mb-1">Completed</dt>
              <dd className="text-ink font-medium">{other.completedAt}</dd>
            </div>
            <div className="pt-3 text-ink-secondary">
              <dt className="mb-1">Checks answered</dt>
              <dd className="text-ink-muted font-medium">—</dd>
            </div>
            <div className="pt-3 text-ink-secondary">
              <dt className="mb-1">Failed checks</dt>
              <dd className="text-ink-muted font-medium">—</dd>
            </div>
            <div className="pt-3 text-ink-secondary">
              <dt className="mb-1">Parts used</dt>
              <dd className="text-ink-muted font-medium">—</dd>
            </div>
            <div className="pb-3 text-ink-secondary">
              <dt className="mb-1">Photos</dt>
              <dd className="text-ink-muted font-medium">—</dd>
              <dt className="mt-2 mb-1">Signature</dt>
              <dd className="text-ink-muted font-medium">—</dd>
            </div>
          </dl>
          <button
            type="button"
            disabled={sending}
            onClick={() => onResolve(conflict.jobId, "other")}
            className="mt-4 inline-flex min-h-[48px] items-center justify-center rounded-lg border border-border-strong bg-surface px-4 py-2 text-base font-medium text-ink hover:bg-surface-hover disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Keep {other.technician.split(" ")[0]}&apos;s
          </button>
        </div>
      </div>

      <div className="px-4 pb-4 pt-2">
        <button
          type="button"
          disabled={sending}
          onClick={() => onResolve(conflict.jobId, "both")}
          className="w-full inline-flex min-h-[48px] items-center justify-center rounded-lg border border-border-strong bg-surface px-4 py-2 text-base font-medium text-ink hover:bg-surface-hover disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Send both and let the office decide
        </button>
      </div>
    </section>
  );
}

/**
 * Sync conflicts that need a human decision before anything is overwritten.
 */
export function ConflictsList() {
  const conflicts = useSyncStore((state) => state.conflicts);
  const sending = useSyncStore((state) => state.sending);

  if (conflicts.length === 0) return null;

  return (
    <>
      {conflicts.map((conflict) => (
        <ConflictSection
          key={conflict.jobId}
          conflict={conflict}
          sending={sending}
          onResolve={(jobId, decision) =>
            void function (){}
          }
        />
      ))}
    </>
  );
}
