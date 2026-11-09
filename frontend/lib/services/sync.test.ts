import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  listJobs,
  putJobs,
  putQueueItem,
  putWorksheet,
  setDayInfo,
} from "@/lib/db";
import {
  FALLBACK_STORAGE_QUOTA_BYTES,
  loadConflicts,
  loadStorageUsage,
  loadSyncOverview,
} from "@/lib/services/sync";
import { formatTime } from "@/lib/today";
import {
  FIXED_NOW,
  makeDay,
  makeJob,
  makeQueueItem,
  makeWorksheet,
} from "@/lib/test/factories";
import { resetDB } from "@/lib/test/db";

vi.mock("@/lib/demo/flags", () => ({
  isDemoConflictEnabled: () => false,
}));

describe("sync service", () => {
  beforeEach(async () => {
    await resetDB();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe("loadStorageUsage", () => {
    it("uses the browser storage estimate when available", async () => {
      vi.stubGlobal("navigator", {
        storage: {
          estimate: vi
            .fn()
            .mockResolvedValue({ usage: 1_234, quota: 5_678 }),
        },
      });

      expect(await loadStorageUsage()).toEqual({
        usageBytes: 1_234,
        quotaBytes: 5_678,
        estimated: false,
      });
    });

    it("falls back when the Storage API is unavailable", async () => {
      vi.stubGlobal("navigator", {});

      expect(await loadStorageUsage()).toEqual({
        usageBytes: 0,
        quotaBytes: FALLBACK_STORAGE_QUOTA_BYTES,
        estimated: true,
      });
    });

    it("falls back when the estimate request fails", async () => {
      vi.stubGlobal("navigator", {
        storage: {
          estimate: vi.fn().mockRejectedValue(new Error("not supported")),
        },
      });

      expect(await loadStorageUsage()).toEqual({
        usageBytes: 0,
        quotaBytes: FALLBACK_STORAGE_QUOTA_BYTES,
        estimated: true,
      });
    });
  });

  describe("loadSyncOverview", () => {
    it("groups queued work by job and counts each status", async () => {
      await putJobs([
        makeJob({
          id: "job-1",
          reference: "TER-001",
          scheduledAt: "2026-11-08T10:00:00",
        }),
        makeJob({
          id: "job-2",
          reference: "TER-002",
          scheduledAt: "2026-11-08T09:00:00",
        }),
      ]);
      await putWorksheet(
        makeWorksheet({
          jobId: "job-1",
          checks: {
            "check-1": { result: "pass", updatedAt: FIXED_NOW },
            "check-2": { result: "fail", updatedAt: FIXED_NOW },
            "check-3": { result: undefined, updatedAt: FIXED_NOW },
          },
          parts: [
            {
              sku: "FIL-001",
              label: "Gas filter",
              unit: "pcs",
              quantity: 2,
            },
            {
              sku: "FIL-002",
              label: "Seal",
              unit: "pcs",
              quantity: 1,
            },
          ],
          photos: [
            {
              id: "photo-1",
              caption: "Boiler",
              capturedAt: FIXED_NOW,
              uploaded: false,
              sizeBytes: 100,
            },
          ],
          signature: { signedBy: "Ana Torres", signedAt: FIXED_NOW },
        }),
      );
      await putQueueItem(
        makeQueueItem({
          jobId: "job-1",
          step: "worksheet",
          status: "pending",
          attempts: 2,
          nextAttemptAt: "2026-11-08T10:05:00",
        }),
      );
      await putQueueItem(
        makeQueueItem({
          jobId: "job-2",
          step: "status",
          status: "failed",
          lastError: "Server error",
          lastErrorKind: "server",
        }),
      );
      await putQueueItem(
        makeQueueItem({
          jobId: "job-missing",
          step: "worksheet",
          status: "conflict",
        }),
      );

      vi.stubGlobal("navigator", {
        storage: {
          estimate: vi
            .fn()
            .mockResolvedValue({ usage: 10, quota: 100 }),
        },
      });

      const overview = await loadSyncOverview();

      expect(overview.groups.map((group) => group.jobId)).toEqual([
        "job-missing",
        "job-2",
        "job-1",
      ]);
      expect(overview.waiting).toBe(1);
      expect(overview.failed).toBe(1);
      expect(overview.conflict).toBe(1);
      expect(overview.totalItems).toBe(3);
      expect(overview.totalBytes).toBeGreaterThan(0);
      expect(overview.waitingBytes).toBeGreaterThan(0);
      expect(overview.storage).toEqual({
        usageBytes: 10,
        quotaBytes: 100,
        estimated: false,
      });

      const worksheetGroup = overview.groups.find(
        (group) => group.jobId === "job-1",
      );
      expect(worksheetGroup?.jobStatus).toBe("pending");
      expect(worksheetGroup?.items[0]).toMatchObject({
        step: "worksheet",
        status: "pending",
        label: "Worksheet · 2 answered",
        detail: "2 parts · 1 photo · signed",
        attempts: 2,
        nextAttemptAt: "2026-11-08T10:05:00",
      });
      expect(worksheetGroup?.items[0].sizeBytes).toBe(
        overview.waitingBytes,
      );

      const statusGroup = overview.groups.find(
        (group) => group.jobId === "job-2",
      );
      expect(statusGroup?.items[0]).toMatchObject({
        step: "status",
        status: "failed",
        label: "Status update",
        detail: undefined,
        lastError: "Server error",
        lastErrorKind: "server",
      });

      const missingGroup = overview.groups.find(
        (group) => group.jobId === "job-missing",
      );
      expect(missingGroup).toMatchObject({
        reference: "job-missing",
        site: "Unknown site",
        scheduledAt: "",
        jobStatus: "queued",
      });
    });
  });

  describe("loadConflicts", () => {
    it("summarizes a conflict with the local worksheet data", async () => {
      await setDayInfo(
        makeDay({
          technician: {
            id: "tech-1",
            name: "Ana Torres",
            van: "VAN-01",
          },
        }),
      );
      await putJobs([
        makeJob({
          id: "job-1",
          status: "conflict",
          reference: "TER-001",
          site: {
            name: "Central Office",
            address: "1 Main Street",
            access: "Reception",
            contact: "Ana",
            phone: "555-0100",
          },
          scheduledAt: "2026-11-08T10:00:00",
          conflictWith: {
            technician: "Luis",
            completedAt: "2026-11-08T11:00:00",
          },
        }),
        makeJob({ id: "job-2", status: "conflict" }),
        makeJob({ id: "job-3", status: "pending" }),
      ]);
      await putWorksheet(
        makeWorksheet({
          jobId: "job-1",
          startedAt: "2026-11-08T09:00:00",
          stoppedAt: "2026-11-08T09:30:00",
          checks: {
            "check-1": { result: "pass", updatedAt: FIXED_NOW },
            "check-2": { result: "fail", updatedAt: FIXED_NOW },
            "check-3": { result: undefined, updatedAt: FIXED_NOW },
          },
          parts: [
            {
              sku: "FIL-001",
              label: "Gas filter",
              unit: "pcs",
              quantity: 2,
            },
          ],
          photos: [
            {
              id: "photo-1",
              caption: "Boiler",
              capturedAt: FIXED_NOW,
              uploaded: true,
            },
            {
              id: "photo-2",
              caption: "Pipes",
              capturedAt: FIXED_NOW,
              uploaded: true,
            },
          ],
          signature: {
            signedBy: "Ana Torres",
            signedAt: FIXED_NOW,
          },
        }),
      );

      const conflicts = await loadConflicts();

      expect(conflicts).toHaveLength(1);
      expect(conflicts[0]).toMatchObject({
        jobId: "job-1",
        reference: "TER-001",
        site: "Central Office",
        scheduledAt: "2026-11-08T10:00:00",
        mine: {
          technician: "Ana Torres",
          van: "VAN-01",
          completedAt: `${formatTime("2026-11-08T09:00:00")} – ${formatTime(
            "2026-11-08T09:30:00",
          )}`,
          checksAnswered: 2,
          failedChecks: 1,
          partsUsed: ["Gas filter ×2"],
          photos: 2,
          signature: "Ana Torres",
        },
        other: {
          technician: "Luis",
          completedAt: formatTime("2026-11-08T11:00:00"),
        },
      });
    });
  });
});
