import { beforeEach, describe, expect, it, vi } from "vitest";
import { fetchDay, fetchJobs } from "@/lib/api/today";
import { fetchTemplate, fetchVanStock } from "@/lib/api/worksheet";
import {
  getDayInfo,
  getTemplate,
  listJobs,
  listStock,
  putJobs,
  putQueueItem,
  putWorksheet,
  setDayInfo,
} from "@/lib/db";
import { loadToday, readTodayCache, refreshToday } from "@/lib/services/today";
import {
  makeDay,
  makeJob,
  makeQueueItem,
  makeStock,
  makeTemplate,
  makeWorksheet,
} from "@/lib/test/factories";
import { resetDB } from "@/lib/test/db";

vi.mock("@/lib/api/today", () => ({
  fetchDay: vi.fn(),
  fetchJobs: vi.fn(),
}));

vi.mock("@/lib/api/worksheet", () => ({
  fetchTemplate: vi.fn(),
  fetchVanStock: vi.fn(),
}));

vi.mock("@/lib/demo/flags", () => ({
  isDemoConflictEnabled: () => false,
}));

const fetchDayMock = vi.mocked(fetchDay);
const fetchJobsMock = vi.mocked(fetchJobs);
const fetchTemplateMock = vi.mocked(fetchTemplate);
const fetchVanStockMock = vi.mocked(fetchVanStock);

describe("today service", () => {
  beforeEach(async () => {
    await resetDB();
    fetchDayMock.mockResolvedValue(makeDay());
    fetchJobsMock.mockResolvedValue([]);
    fetchTemplateMock.mockResolvedValue(makeTemplate());
    fetchVanStockMock.mockResolvedValue([makeStock()]);
  });

  describe("readTodayCache", () => {
    it("returns null when no day has been cached", async () => {
      expect(await readTodayCache()).toBeNull();
    });

    it("returns the cached day, jobs and pending count", async () => {
      const day = makeDay();
      const jobs = [
        makeJob({ id: "job-2", scheduledAt: "2026-11-08T10:00:00" }),
        makeJob({ id: "job-1", scheduledAt: "2026-11-08T09:00:00" }),
      ];
      await setDayInfo(day);
      await putJobs(jobs);
      await putQueueItem(makeQueueItem({ jobId: "job-1" }));

      const snapshot = await readTodayCache();

      expect(snapshot?.day).toEqual(day);
      expect(snapshot?.jobs.map((job) => job.id)).toEqual(["job-1", "job-2"]);
      expect(snapshot?.pendingCount).toBe(1);
    });
  });

  describe("refreshToday", () => {
    it("merges remote jobs with local work and caches the catalogue", async () => {
      const remoteQueued = makeJob({
        id: "job-queued",
        scheduledAt: "2026-11-08T10:00:00",
        plantType: "gas_boiler",
      });
      const remoteNew = makeJob({
        id: "job-new",
        scheduledAt: "2026-11-08T11:00:00",
        plantType: "chiller",
      });
      const localQueued = makeJob({
        id: "job-queued",
        status: "queued",
        localOnly: true,
        queuedItems: 1,
      });
      const localDraftOnly = makeJob({
        id: "job-draft",
        status: "failed",
        localOnly: true,
        scheduledAt: "2026-11-08T08:00:00",
      });
      const localEmpty = makeJob({ id: "job-empty", localOnly: true });

      fetchDayMock.mockResolvedValue(makeDay());
      fetchJobsMock.mockResolvedValue([remoteQueued, remoteNew]);
      fetchTemplateMock.mockImplementation(async (plantType) =>
        makeTemplate({ plantType }),
      );
      fetchVanStockMock.mockResolvedValue([makeStock()]);

      await putJobs([localQueued, localDraftOnly, localEmpty]);
      await putWorksheet(makeWorksheet({ jobId: "job-draft" }));
      await putQueueItem(makeQueueItem({ jobId: "job-queued" }));

      const snapshot = await refreshToday();

      expect(snapshot.jobs.map((job) => job.id)).toEqual([
        "job-draft",
        "job-queued",
        "job-new",
      ]);
      expect(snapshot.jobs.find((job) => job.id === "job-queued")).toMatchObject({
        status: "queued",
        localOnly: true,
        queuedItems: 1,
      });
      expect(snapshot.jobs.find((job) => job.id === "job-draft")).toMatchObject({
        status: "failed",
        localOnly: true,
      });
      expect(snapshot.jobs.some((job) => job.id === "job-empty")).toBe(false);
      expect(snapshot.pendingCount).toBe(1);

      expect((await listJobs()).map((job) => job.id)).toEqual([
        "job-draft",
        "job-queued",
        "job-new",
      ]);
      expect((await getDayInfo())?.technician.name).toBe("Ana Torres");
      expect(await getTemplate("gas_boiler")).toMatchObject({
        plantType: "gas_boiler",
      });
      expect(await getTemplate("chiller")).toMatchObject({
        plantType: "chiller",
      });
      expect(await listStock()).toHaveLength(1);
      expect(fetchTemplateMock).toHaveBeenCalledTimes(2);
      expect(fetchVanStockMock).toHaveBeenCalledTimes(1);
    });

    it("still returns the snapshot when the catalogue requests fail", async () => {
      fetchJobsMock.mockResolvedValue([makeJob({ id: "job-1" })]);
      fetchTemplateMock.mockRejectedValue(new Error("offline"));
      fetchVanStockMock.mockRejectedValue(new Error("offline"));

      const snapshot = await refreshToday();

      expect(snapshot.jobs.map((job) => job.id)).toEqual(["job-1"]);
      expect(await getTemplate("gas_boiler")).toBeUndefined();
      expect(await listStock()).toEqual([]);
    });
  });

  describe("loadToday", () => {
    it("returns the network snapshot when the API works", async () => {
      fetchJobsMock.mockResolvedValue([makeJob({ id: "job-1" })]);

      const result = await loadToday();

      expect(result.source).toBe("network");
      expect(result.jobs.map((job) => job.id)).toEqual(["job-1"]);
    });

    it("falls back to the cache when the API fails", async () => {
      await setDayInfo(makeDay());
      await putJobs([makeJob({ id: "cached-job" })]);
      fetchDayMock.mockRejectedValue(new Error("offline"));

      const result = await loadToday();

      expect(result.source).toBe("cache");
      expect(result.jobs.map((job) => job.id)).toEqual(["cached-job"]);
    });

    it("rethrows the network error when there is no cache", async () => {
      const error = new Error("offline");
      fetchDayMock.mockRejectedValue(error);

      await expect(loadToday()).rejects.toBe(error);
    });
  });
});
