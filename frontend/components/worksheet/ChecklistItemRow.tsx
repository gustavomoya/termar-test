"use client";

import { useState } from "react";
import type {
  CheckAnswer,
  CheckResult,
  ChecklistItem,
} from "@/lib/db";
import { useWorksheetStore } from "@/lib/stores/worksheetStore";
import { isOutOfRange } from "@/lib/worksheet/validation";
import { inputClass, textareaClass } from "@/components/worksheet/styles";

type PassFailResult = Exclude<CheckResult, "measure">;

interface ChecklistItemRowProps {
  item: ChecklistItem;
  answer?: CheckAnswer;
  number: number;
  total: number;
  readOnly: boolean;
}

const triBase =
  "inline-flex min-h-[48px] items-center justify-center rounded-lg border px-2 text-md font-semibold disabled:cursor-not-allowed disabled:opacity-50";

const triActive: Record<PassFailResult, string> = {
  pass: "border-success bg-success text-ink-inverse",
  fail: "border-danger bg-danger text-ink-inverse",
  na: "border-ink-secondary bg-ink-secondary text-ink-inverse",
};

const triInactive =
  "border-border-strong bg-surface text-ink-secondary hover:bg-surface-hover";

const triLabels: Record<PassFailResult, string> = {
  pass: "Pass",
  fail: "Fail",
  na: "N/A",
};

export function ChecklistItemRow({
  item,
  answer,
  number,
  total,
  readOnly,
}: ChecklistItemRowProps) {
  const setCheck = useWorksheetStore((state) => state.setCheck);
  const setMeasure = useWorksheetStore((state) => state.setMeasure);
  const setNote = useWorksheetStore((state) => state.setNote);

  const [measureValue, setMeasureValue] = useState(
    answer?.value !== undefined ? String(answer.value) : "",
  );

  const outOfRange =
    item.type === "measure" &&
    answer?.value !== undefined &&
    isOutOfRange(item, answer.value);

  const noteRequired = answer?.result === "fail" || outOfRange;
  const showNote =
    noteRequired || answer?.result === "na" || Boolean(answer?.note);

  const commitMeasure = (raw: string) => {
    const normalized = raw.replace(",", ".").trim();
    const parsed = Number(normalized);

    if (!normalized || !Number.isFinite(parsed)) {
      setMeasureValue("");
      setMeasure(item.id, undefined);
      return;
    }

    setMeasureValue(String(parsed));
    setMeasure(item.id, parsed);
  };

  const rowTone =
    answer?.result === "fail"
      ? "bg-danger-soft"
      : outOfRange
        ? "bg-warning-soft"
        : "";

  return (
    <div
      className={`border-b border-border p-4 last:border-b-0 ${rowTone}`}
    >
      <div className="flex gap-3">
        <span className="w-10 shrink-0 pt-0.5 text-sm font-semibold text-ink-muted">
          {number}/{total}
        </span>

        <div className="min-w-0 grow">
          <div className="text-base font-medium">{item.label}</div>

          {item.type === "measure" ? (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <input
                type="text"
                inputMode="decimal"
                aria-label={`${item.label} reading`}
                value={measureValue}
                disabled={readOnly}
                onChange={(event) => setMeasureValue(event.target.value)}
                onBlur={(event) => commitMeasure(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") event.currentTarget.blur();
                }}
                aria-invalid={outOfRange && !answer?.note}
                className={`${inputClass} max-w-[140px] text-right tabular-nums`}
              />
              {item.unit && (
                <span className="text-md text-ink-secondary">
                  {item.unit}
                </span>
              )}
              {(item.min !== undefined || item.max !== undefined) && (
                <span className="text-sm text-ink-secondary">
                  Expected {item.min ?? "—"}–{item.max ?? "—"} {item.unit}
                </span>
              )}
              {outOfRange && (
                <span className="rounded-full border border-warning-border bg-surface px-2 py-1 text-sm font-semibold text-warning">
                  Outside range
                </span>
              )}
            </div>
          ) : (
            <div
              role="group"
              aria-label={item.label}
              className="mt-3 grid max-w-[420px] grid-cols-3 gap-2"
            >
              {(["pass", "fail", "na"] as const).map((result) => {
                const active = answer?.result === result;
                return (
                  <button
                    key={result}
                    type="button"
                    aria-pressed={active}
                    disabled={readOnly}
                    onClick={() => setCheck(item.id, result)}
                    className={`${triBase} ${
                      active ? triActive[result] : triInactive
                    }`}
                  >
                    {triLabels[result]}
                  </button>
                );
              })}
            </div>
          )}

          {showNote && (
            <label className="mt-3 block border-t border-dashed border-border pt-3">
              <span className="text-sm font-medium text-ink-secondary">
                Note
                {noteRequired && (
                  <>
                    <span aria-hidden="true" className="text-danger">
                      {" "}
                      *
                    </span>
                    <span className="sr-only"> (required)</span>
                  </>
                )}
              </span>
              <textarea
                value={answer?.note ?? ""}
                disabled={readOnly}
                onChange={(event) => setNote(item.id, event.target.value)}
                placeholder="Tell us what you found"
                aria-required={noteRequired}
                className={`${textareaClass} mt-1`}
              />
            </label>
          )}
        </div>
      </div>
    </div>
  );
}
