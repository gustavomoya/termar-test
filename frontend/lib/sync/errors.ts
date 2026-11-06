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

/**
 * The job no longer exists at the office. Retrying cannot succeed, but the
 * worksheet stays on the tablet so the technician never loses their work.
 */
export class JobGoneError extends Error {
  readonly status = 404;

  constructor(message = "This job no longer exists at the office.") {
    super(message);
    this.name = "JobGoneError";
  }
}
