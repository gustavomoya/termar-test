import { beforeEach, describe, expect, it } from "vitest";
import {
  getJob,
  listJobs,
  patchJob,
  putJobs,
  replaceJobs,
} from "@/lib/db/repositories/jobs";
import { makeJob } from "@/lib/test/factories";
import { resetDB } from "@/lib/test/db";

describe("jobs repository", () => {
  beforeEach(async () => {
    await resetDB();
  });

  it("jobs  are ordered by scheduledAt", async () => {
    const late = makeJob({
      id: "job-late",
      scheduledAt: "2026-11-08T15:00:00",
    });
    const early = makeJob({
      id: "job-early",
      scheduledAt: "2026-11-08T08:00:00",
    });

    await putJobs([late, early]);

    expect((await listJobs()).map((job) => job.id)).toEqual([
      "job-early",
      "job-late",
    ]);
  });

  it("returns a job by id and undefined when it does not exist", async () => {
    await putJobs([makeJob({ id: "job-1" })]);

    expect((await getJob("job-1"))?.reference).toBe("TER-001");
    expect(await getJob("missing")).toBeUndefined();
  });

  it("patches only the provided fields", async () => {
    await putJobs([
      makeJob({
        id: "job-1",
        status: "pending",
        reference: "TER-001",
      }),
    ]);

    const updated = await patchJob("job-1", {
      status: "queued",
      queuedItems: 1,
    });

    expect(updated).toMatchObject({
      id: "job-1",
      status: "queued",
      queuedItems: 1,
      reference: "TER-001",
    });
    expect((await getJob("job-1"))?.status).toBe("queued");
  });

  it("returns undefined when patching a missing job", async () => {
    expect(await patchJob("missing", { status: "synced" })).toBeUndefined();
  });

  it("replaces every stored job", async () => {
    await putJobs([makeJob({ id: "old" })]);

    await replaceJobs([
      makeJob({ id: "new-1" }),
      makeJob({ id: "new-2" }),
    ]);

    expect((await listJobs()).map((job) => job.id).sort()).toEqual([
      "new-1",
      "new-2",
    ]);
  });

  it("ignores an empty batch", async () => {
    await expect(putJobs([])).resolves.toBeUndefined();
    expect(await listJobs()).toEqual([]);
  });
});
