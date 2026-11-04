import type {
  ChecklistItem,
  ChecklistTemplate,
  WorksheetDraft,
} from "@/lib/db";

/**
 * Determines whether a checklist item has a valid response
 *
 * For items of type "measure," an item is considered answered if it has a finite numeric value.
 * For other types, an item is considered answered if it has a result (pass / fail / N/A).
 *
 * @param item   checklist item
 * @param draft  worksheet draft containing the responses
 *
 * @returns true if the item has been answered
 */
export function isAnswered(
  item: ChecklistItem,
  draft: WorksheetDraft,
): boolean {
  const answer = draft.checks[item.id];
  if (!answer) return false;

  if (item.type === "measure") {
    return typeof answer.value === "number" && Number.isFinite(answer.value);
  }

  return (
    answer.result === "pass" ||
    answer.result === "fail" ||
    answer.result === "na"
  );
}

/**
 * Counts how many items from the template have been answered in the worksheet draft
 *
 * @param template the checklist template
 * @param draft    the worksheet draft
 *
 * @returns number of items answered
 */
export function answeredCount(
  template: ChecklistTemplate,
  draft: WorksheetDraft,
): number {
  return template.items.filter((item) => isAnswered(item, draft)).length;
}

/**
 * Determines whether a measured value falls outside the item's expected range
 *
 * Applies only to items of type "measure". Returns false if there is no value,
 * if the value is not a finite number, or if the item does not define any limits.
 *
 * @param item  measurement item with optional min and max limits
 * @param value value the measured value
 *
 * @returns true if the value is below the minimum or above the maximum
 */
export function isOutOfRange(
  item: ChecklistItem,
  value: number | undefined,
): boolean {
  if (item.type !== "measure" || typeof value !== "number") return false;
  if (!Number.isFinite(value)) return false;
  if (typeof item.min === "number" && value < item.min) return true;
  if (typeof item.max === "number" && value > item.max) return true;

  return false;
}

/**
 * Validates that the job can be completed
 * Rules:
 * - The timer must have been started and stopped.
 * - At least one item in the checklist must be answered.
 * - A client signature must be present.
 * - Items marked as "fail" require a note.
 * - Items of type "measure" that are out of range require a note.
 *
 * @param template the checklist template
 * @param draft    the worksheet draft
 *
 * @returns the validation result
 */
export function validateFinish(
  template: ChecklistTemplate,
  draft: WorksheetDraft,
): { ok: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!draft.startedAt) {
    errors.push("Start the timer before finishing the job.");
  } else if (draft.runningSince) {
    errors.push("Stop the timer before finishing the job.");
  }

  if (answeredCount(template, draft) === 0) {
    errors.push("Answer at least one check before finishing.");
  }

  if (!draft.signature) {
    errors.push("The customer must sign before finishing.");
  }

  for (const item of template.items) {
    const answer = draft.checks[item.id];
    if (!answer) continue;

    if (answer.result === "fail" && !answer.note?.trim()) {
      errors.push(`Add a note for "${item.label}".`);
    }

    if (
      answer.result === "measure" &&
      isOutOfRange(item, answer.value) &&
      !answer.note?.trim()
    ) {
      errors.push(`Add a note for "${item.label}" (outside range).`);
    }
  }

  return { ok: errors.length === 0, errors };
}
