import type { ConflictWith } from "@/lib/db";

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
 * The office already has another technician's worksheet for this job. The
 * upload must stop and the technician has to choose what to do.
 */
export class ConflictError extends Error {
  readonly status = 409;
  readonly conflictWith: ConflictWith;

  constructor(
    message: string,
    conflictWith: ConflictWith,
  ) {
    super(message);
    this.name = "ConflictError";
    this.conflictWith = conflictWith;
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
