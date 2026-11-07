/**
 * Whether an IndexedDB write failed because the tablet ran out of space.
 *
 * Chromium throws a DOMException named `QuotaExceededError`; Firefox and older
 * WebViews use different codes, so the name, the legacy code and the message
 * are all checked.
 */
export function isQuotaExceededError(error: unknown): boolean {
  if (typeof DOMException !== "undefined" && error instanceof DOMException) {
    return (
      error.name === "QuotaExceededError" ||
      error.name === "NS_ERROR_DOM_QUOTA_REACHED" ||
      error.code === 22 ||
      error.code === 1014
    );
  }

  return (
    error instanceof Error &&
    /quota|storage.*full|space/i.test(`${error.name} ${error.message}`)
  );
}

/**
 * Message shown when a write fails because the tablet is full.
 *
 * It always makes clear that the worksheet in progress has not been lost.
 */
export const QUOTA_EXCEEDED_MESSAGE =
  "This tablet is full. Your work is still on screen. Delete a few photos, then try again.";
