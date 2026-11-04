"use client";

import { useEffect, useState } from "react";
import { useWorksheetStore } from "@/lib/stores/worksheetStore";
import { formatTime } from "@/lib/today";
import { elapsedMs, formatDuration } from "@/lib/worksheet/timer";
import { Section } from "@/components/worksheet/Section";
import {
  primaryButtonClass,
  secondaryButtonClass,
} from "@/components/worksheet/styles";

export function TimerSection() {
  const draft = useWorksheetStore((state) => state.draft);
  const readOnly = useWorksheetStore((state) => state.readOnly);
  const startTimer = useWorksheetStore((state) => state.startTimer);
  const stopTimer = useWorksheetStore((state) => state.stopTimer);
  const resumeTimer = useWorksheetStore((state) => state.resumeTimer);
  const restartTimer = useWorksheetStore((state) => state.restartTimer);
  const flush = useWorksheetStore((state) => state.flush);

  const [now, setNow] = useState(() => Date.now());
  const running = Boolean(draft?.runningSince);

  useEffect(() => {
    if (!running) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [running]);

  useEffect(() => {
    if (!running) return;
    const interval = setInterval(() => {
      void flush();
    }, 10000);
    return () => clearInterval(interval);
  }, [running, flush]);

  if (!draft) return null;

  const start = () => {
    setNow(Date.now());
    startTimer();
  };

  const resume = () => {
    setNow(Date.now());
    resumeTimer();
  };

  const restart = () => {
    setNow(Date.now());
    restartTimer();
  };

  const time = formatDuration(elapsedMs(draft, now));

  return (
    <Section
      title="Time on site"
      aside={
        <span className="rounded-full border border-info-border bg-info-soft px-2.5 py-1 text-sm font-semibold text-info">
          Billed
        </span>
      }
    >
      <div className="space-y-4 p-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div
              className="text-3xl font-bold leading-none tabular-nums"
              aria-live="off"
            >
              {time}
            </div>
            <div className="mt-1 text-sm text-ink-secondary">
              {draft.startedAt
                ? `Started ${formatTime(draft.startedAt)}`
                : "Not started"}
              {draft.stoppedAt ? ` · Stopped ${formatTime(draft.stoppedAt)}` : ""}
            </div>
          </div>

          {!readOnly && (
            <div className="flex flex-wrap gap-2">
              {!draft.startedAt && (
                <button
                  type="button"
                  className={primaryButtonClass}
                  onClick={start}
                >
                  Start
                </button>
              )}
              {draft.startedAt && running && (
                <button
                  type="button"
                  className="inline-flex min-h-[48px] items-center justify-center rounded-lg bg-ink px-4 text-md font-medium text-ink-inverse hover:bg-ink-secondary"
                  onClick={stopTimer}
                >
                  Stop
                </button>
              )}
              {draft.startedAt && !running && (
                <>
                  <button
                    type="button"
                    className={primaryButtonClass}
                    onClick={resume}
                  >
                    Resume
                  </button>
                  <button
                    type="button"
                    className={secondaryButtonClass}
                    onClick={restart}
                  >
                    Restart timer
                  </button>
                </>
              )}
            </div>
          )}
        </div>
        <p className="text-sm text-ink-secondary">
          Time keeps counting while you work on other screens.
        </p>
      </div>
    </Section>
  );
}
