import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api/client";
import {
  fetchJob,
  fetchTemplate,
  fetchVanStock,
  fetchWorksheet,
} from "@/lib/api/worksheet";
import {
  getJob,
  getTemplate,
  getWorksheet,
  listPhotosByJob,
  listStock,
  putJobs,
  putPhoto,
  putTemplate,
  putWorksheet,
  replaceStock,
} from "@/lib/db";
import {
  loadWorksheet,
  mapDraftToRemoteWorksheet,
  markWorksheetPhotosUploaded,
  prepareWorksheetUpload,
  saveWorksheetDraft,
} from "@/lib/services/worksheet";
import { blobToDataUrl } from "@/lib/worksheet/photos";
import {
  FIXED_NOW,
  makeJob,
  makePhoto,
  makeStock,
  makeTemplate,
  makeWorksheet,
} from "@/lib/test/factories";
import { resetDB } from "@/lib/test/db";

vi.mock("@/lib/api/worksheet", () => ({
  fetchJob: vi.fn(),
  fetchTemplate: vi.fn(),
  fetchVanStock: vi.fn(),
  fetchWorksheet: vi.fn(),
}));

vi.mock("@/lib/worksheet/photos", () => ({
  blobToDataUrl: vi.fn(),
}));

vi.mock("@/lib/demo/flags", () => ({
  isDemoConflictEnabled: () => false,
}));

const fetchJobMock = vi.mocked(fetchJob);
const fetchTemplateMock = vi.mocked(fetchTemplate);
const fetchVanStockMock = vi.mocked(fetchVanStock);
const fetchWorksheetMock = vi.mocked(fetchWorksheet);
const blobToDataUrlMock = vi.mocked(blobToDataUrl);

describe("worksheet service", () => {
  beforeEach(async () => {
    await resetDB();
    fetchJobMock.mockResolvedValue(makeJob({ id: "job-1" }));
    fetchTemplateMock.mockResolvedValue(makeTemplate());
    fetchVanStockMock.mockResolvedValue([makeStock()]);
    fetchWorksheetMock.mockResolvedValue(null);
    blobToDataUrlMock.mockResolvedValue("data:image/jpeg;base64,AAA");
  });

  describe("mapDraftToRemoteWorksheet", () => {
    it("maps answered checks, parts, photos, signature and conflict", () => {
      const draft = makeWorksheet({
        jobId: "job-1",
        startedAt: "2026-11-08T09:00:00",
        stoppedAt: "2026-11-08T09:30:00",
        checks: {
          "check-1": {
            result: "measure",
            value: 2,
            note: "Within range",
            updatedAt: FIXED_NOW,
          },
          "check-2": {
            result: undefined,
            updatedAt: FIXED_NOW,
          },
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
            uploaded: false,
            sizeBytes: 5,
          },
        ],
        signature: {
          signedBy: "Ana Torres",
          signedAt: FIXED_NOW,
          dataUrl: "data:image/png;base64,AAA",
        },
      });

      const remote = mapDraftToRemoteWorksheet(draft, {
        resolution: "keep_mine",
        note: "Mine is complete",
      });

      expect(remote).toStrictEqual({
        jobId: "job-1",
        startedAt: "2026-11-08T09:00:00",
        stoppedAt: "2026-11-08T09:30:00",
        checks: [
          {
            id: "check-1",
            result: "measure",
            value: 2,
            note: "Within range",
          },
        ],
        parts: [{ sku: "FIL-001", quantity: 2 }],
        photos: [
          {
            id: "photo-1",
            caption: "Boiler",
            capturedAt: FIXED_NOW,
            uploaded: false,
            sizeBytes: 5,
          },
        ],
        signature: {
          signedBy: "Ana Torres",
          signedAt: FIXED_NOW,
          captured: true,
          dataUrl: "data:image/png;base64,AAA",
        },
        conflict: {
          resolution: "keep_mine",
          note: "Mine is complete",
        },
      });
    });

    it("omits optional sections when they are empty", () => {
      const remote = mapDraftToRemoteWorksheet(
        makeWorksheet({ jobId: "job-2" }),
      );

      expect(remote).toStrictEqual({
        jobId: "job-2",
        checks: [],
        parts: [],
      });
    });
  });

  describe("saveWorksheetDraft", () => {
    it("updates updatedAt and persists the draft", async () => {
      const saved = await saveWorksheetDraft(
        makeWorksheet({
          jobId: "job-1",
          updatedAt: "2000-01-01T00:00:00",
        }),
      );

      expect(saved.updatedAt).not.toBe("2000-01-01T00:00:00");
      expect(await getWorksheet("job-1")).toEqual(saved);
    });
  });

  describe("prepareWorksheetUpload", () => {
    it("embeds the photo binary as a data URL", async () => {
      await putWorksheet(
        makeWorksheet({
          jobId: "job-1",
          photos: [
            {
              id: "photo-1",
              caption: "Boiler",
              capturedAt: FIXED_NOW,
              uploaded: false,
              sizeBytes: 5,
            },
          ],
        }),
      );
      await putPhoto(makePhoto({ id: "photo-1", jobId: "job-1" }));

      const remote = await prepareWorksheetUpload("job-1");

      expect(remote.photos).toStrictEqual([
        {
          id: "photo-1",
          caption: "Boiler",
          capturedAt: FIXED_NOW,
          uploaded: false,
          sizeBytes: 5,
          dataUrl: "data:image/jpeg;base64,AAA",
        },
      ]);
      expect(blobToDataUrlMock).toHaveBeenCalledWith(expect.any(Blob));
    });

    it("returns the mapped worksheet when there are no photos", async () => {
      await putWorksheet(makeWorksheet({ jobId: "job-1" }));

      const remote = await prepareWorksheetUpload("job-1");

      expect(remote).toStrictEqual({
        jobId: "job-1",
        checks: [],
        parts: [],
      });
    });

    it("throws when the worksheet does not exist", async () => {
      await expect(prepareWorksheetUpload("missing")).rejects.toThrow(
        "Worksheet not found",
      );
    });
  });

  describe("markWorksheetPhotosUploaded", () => {
    it("marks both the worksheet metadata and the stored photos", async () => {
      await putWorksheet(
        makeWorksheet({
          jobId: "job-1",
          photos: [
            {
              id: "photo-1",
              caption: "Boiler",
              capturedAt: FIXED_NOW,
              uploaded: false,
            },
          ],
        }),
      );
      await putPhoto(makePhoto({ id: "photo-1", jobId: "job-1" }));

      await markWorksheetPhotosUploaded("job-1");

      expect((await getWorksheet("job-1"))?.photos[0].uploaded).toBe(true);
      expect((await listPhotosByJob("job-1"))[0].uploaded).toBe(true);
    });
  });

  describe("loadWorksheet", () => {
    it("keeps local work and its sync status over the remote job", async () => {
      const localJob = makeJob({
        id: "job-1",
        status: "queued",
        localOnly: true,
        queuedItems: 1,
        conflictWith: {
          technician: "Luis",
          completedAt: "2026-11-08T11:00:00",
        },
      });
      const localDraft = makeWorksheet({
        jobId: "job-1",
        updatedAt: "2026-11-08T09:10:00",
        checks: {
          "check-1": {
            result: "pass",
            updatedAt: FIXED_NOW,
          },
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
            uploaded: false,
          },
        ],
      });
      await putJobs([localJob]);
      await putWorksheet(localDraft);
      await putWorksheet(
        makeWorksheet({
          jobId: "job-2",
          parts: [
            {
              sku: "FIL-001",
              label: "Gas filter",
              unit: "pcs",
              quantity: 1,
            },
          ],
        }),
      );
      await putPhoto(makePhoto({ id: "photo-1", jobId: "job-1" }));

      fetchJobMock.mockResolvedValue(
        makeJob({ id: "job-1", status: "pending" }),
      );

      const snapshot = await loadWorksheet("job-1");

      expect(snapshot.draft).toEqual(localDraft);
      expect(snapshot.savedAt).toBe(localDraft.updatedAt);
      expect(snapshot.job).toMatchObject({
        status: "queued",
        localOnly: true,
        queuedItems: 1,
        conflictWith: localJob.conflictWith,
      });
      expect(snapshot.readOnly).toBe(false);
      expect(snapshot.stockUsage).toEqual({ "FIL-001": 3 });
      expect(snapshot.photos.map((photo) => photo.id)).toEqual(["photo-1"]);
      expect(snapshot.template.cachedAt).toBeTruthy();
      expect(snapshot.stock[0].cachedAt).toBeTruthy();
      expect((await getJob("job-1"))?.status).toBe("queued");
    });

    it("maps and persists a remote worksheet when there is no local draft", async () => {
      fetchJobMock.mockResolvedValue(
        makeJob({ id: "job-1", status: "pending" }),
      );
      fetchWorksheetMock.mockResolvedValue({
        jobId: "job-1",
        startedAt: "2026-11-08T09:00:00",
        stoppedAt: "2026-11-08T09:30:00",
        checks: [{ id: "check-1", result: "pass" }],
        parts: [{ sku: "FIL-001", quantity: 2 }],
        photos: [
          {
            id: "photo-remote",
            caption: "Remote",
            capturedAt: FIXED_NOW,
            uploaded: true,
            sizeBytes: 10,
          },
        ],
        signature: {
          signedBy: "Ana Torres",
          signedAt: FIXED_NOW,
          dataUrl: "data:image/png;base64,AAA",
        },
      });

      const snapshot = await loadWorksheet("job-1");

      expect(snapshot.draft.checks["check-1"]).toMatchObject({
        result: "pass",
      });
      expect(snapshot.draft.checks["check-2"]).toMatchObject({
        result: undefined,
      });
      expect(snapshot.draft.accumulatedMs).toBe(30 * 60 * 1000);
      expect(snapshot.draft.parts).toEqual([
        {
          sku: "FIL-001",
          label: "Gas filter",
          unit: "pcs",
          quantity: 2,
        },
      ]);
      expect(snapshot.draft.photos).toEqual([
        {
          id: "photo-remote",
          caption: "Remote",
          capturedAt: FIXED_NOW,
          uploaded: true,
          sizeBytes: 10,
        },
      ]);
      expect(snapshot.draft.signature).toEqual({
        signedBy: "Ana Torres",
        signedAt: FIXED_NOW,
        dataUrl: "data:image/png;base64,AAA",
      });
      expect(snapshot.savedAt).toBe(snapshot.draft.updatedAt);
      expect(await getWorksheet("job-1")).toEqual(snapshot.draft);
      expect(snapshot.stockUsage).toEqual({ "FIL-001": 2 });
      expect(snapshot.readOnly).toBe(false);
    });

    it("rethrows a 404 from the job endpoint even when a local job exists", async () => {
      await putJobs([makeJob({ id: "job-1" })]);
      fetchJobMock.mockRejectedValue(
        new ApiError("not found", 404, "http://localhost/api/jobs/job-1"),
      );

      await expect(loadWorksheet("job-1")).rejects.toBeInstanceOf(ApiError);
    });

    it("falls back to the local job, template and stock when offline", async () => {
      await putJobs([
        makeJob({ id: "job-1", status: "queued", plantType: "gas_boiler" }),
      ]);
      const cachedTemplate = await putTemplate(makeTemplate());
      await replaceStock([makeStock()]);
      fetchJobMock.mockRejectedValue(new Error("offline"));
      fetchTemplateMock.mockRejectedValue(new Error("offline"));
      fetchVanStockMock.mockRejectedValue(new Error("offline"));
      fetchWorksheetMock.mockRejectedValue(new Error("offline"));

      const snapshot = await loadWorksheet("job-1");

      expect(snapshot.job.id).toBe("job-1");
      expect(snapshot.template).toEqual(cachedTemplate);
      expect(snapshot.stock.map((item) => item.sku)).toEqual(["FIL-001"]);
      expect(snapshot.draft.checks["check-1"]).toMatchObject({
        result: undefined,
      });
      expect(snapshot.readOnly).toBe(false);
      expect(await getTemplate("gas_boiler")).toEqual(cachedTemplate);
      expect((await listStock()).map((item) => item.sku)).toEqual(["FIL-001"]);
    });

    it("marks a synced worksheet as read-only", async () => {
      await putJobs([makeJob({ id: "job-1", status: "synced" })]);
      await putWorksheet(makeWorksheet({ jobId: "job-1" }));
      fetchJobMock.mockResolvedValue(
        makeJob({ id: "job-1", status: "pending" }),
      );

      const snapshot = await loadWorksheet("job-1");

      expect(snapshot.job.status).toBe("synced");
      expect(snapshot.readOnly).toBe(true);
    });
  });
});
