import { beforeEach, describe, expect, it } from "vitest";
import {
  clearQueue,
  deleteQueueItem,
  getQueueItem,
  listQueueItems,
  listQueueItemsByStatus,
  putQueueItem,
} from "@/lib/db/repositories/queue";
import { makeQueueItem } from "@/lib/test/factories";
import { resetDB } from "@/lib/test/db";

describe("queue repository", () => {
  beforeEach(async () => {
    await resetDB();
  });

  it("stores a queue item per job and replaces it on put", async () => {
    await putQueueItem(makeQueueItem({ jobId: "job-1", status: "pending" }));
    await putQueueItem(makeQueueItem({ jobId: "job-1", status: "failed" }));

    expect(await listQueueItems()).toHaveLength(1);
    expect((await getQueueItem("job-1"))?.status).toBe("failed");
  });

  it("lists items by status", async () => {
    await putQueueItem(makeQueueItem({ jobId: "job-1", status: "pending" }));
    await putQueueItem(makeQueueItem({ jobId: "job-2", status: "pending" }));
    await putQueueItem(makeQueueItem({ jobId: "job-3", status: "conflict" }));

    expect(
      (await listQueueItemsByStatus("pending"))
        .map((item) => item.jobId)
        .sort(),
    ).toEqual(["job-1", "job-2"]);
    expect(await listQueueItemsByStatus("failed")).toEqual([]);
  });

  it("deletes one item or the whole queue", async () => {
    await putQueueItem(makeQueueItem({ jobId: "job-1" }));
    await putQueueItem(makeQueueItem({ jobId: "job-2" }));

    await deleteQueueItem("job-1");
    expect(await getQueueItem("job-1")).toBeUndefined();
    expect(await listQueueItems()).toHaveLength(1);

    await clearQueue();
    expect(await listQueueItems()).toEqual([]);
  });
});
