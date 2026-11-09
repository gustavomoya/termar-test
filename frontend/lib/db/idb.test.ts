import { beforeEach, describe, expect, it } from "vitest";
import { closeDB, deleteDB, getDB } from "@/lib/db/idb";
import { listJobs, putJobs } from "@/lib/db";
import { makeJob } from "@/lib/test/factories";
import { resetDB } from "@/lib/test/db";

const STORES = [
  "jobs",
  "meta",
  "templates",
  "worksheets",
  "stock",
  "queue",
  "archive",
  "photos",
] as const;

describe("IndexedDB connection", () => {
  beforeEach(async () => {
    await resetDB();
  });

  it("creates every object store on first open", async () => {
    const db = await getDB();

    for (const store of STORES) {
      expect(db.objectStoreNames.contains(store)).toBe(true);
    }
  });

  it("reuses the open connection", async () => {
    const first = await getDB();
    const second = await getDB();

    expect(second).toBe(first);
  });

  it("opens a new connection after closeDB", async () => {
    const first = await getDB();
    await closeDB();
    const second = await getDB();

    expect(second).not.toBe(first);
  });

  it("deletes the database and its data", async () => {
    await putJobs([makeJob({ id: "job-1" })]);
    expect(await listJobs()).toHaveLength(1);

    await deleteDB();

    expect(await listJobs()).toEqual([]);
  });
});
