/**
 * Error for sync items that should not be retried (for example, a missing
 * local worksheet or an invalid payload).
 */
export class RejectedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RejectedError";
  }
}
