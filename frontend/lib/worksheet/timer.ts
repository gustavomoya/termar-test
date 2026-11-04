import type { WorksheetDraft } from "@/lib/db";

/**
 * Calculates the total time spent on the job, in milliseconds
 *
 * @param draft the draft worksheet containing the timer data
 * @param now   the current time in milliseconds
 *
 * @returns the total milliseconds spent on the job
 */
export function elapsedMs(
  draft: WorksheetDraft,
  now: number = Date.now(),
): number {
  const running = draft.runningSince
    ? Math.max(0, now - new Date(draft.runningSince).getTime())
    : 0;

  return Math.max(0, draft.accumulatedMs + running);
}

/**
 * Formats a duration in milliseconds
 *
 * @param ms time in milliseconds
 *
 * @returns a string with hours and minutes, for example "2h 15m"
 */
export function formatDuration(ms: number): string {
  const totalMinutes = Math.floor(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return `${hours}h ${minutes}m`;
}
