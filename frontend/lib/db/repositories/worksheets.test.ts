import { beforeEach, describe, expect, it } from "vitest";
import {
  deleteWorksheet,
  getWorksheet,
  listWorksheets,
  markWorksheetPhotosUploaded,
  putWorksheet,
} from "@/lib/db/repositories/worksheets";
import { FIXED_NOW, makeWorksheet } from "@/lib/test/factories";
import { resetDB } from "@/lib/test/db";

describe("worksheets repository", () => {
  beforeEach(async () => {
    await resetDB();
  });

  it("lists and deletes worksheets", async () => {
    await putWorksheet(makeWorksheet({ jobId: "job-1" }));
    await putWorksheet(makeWorksheet({ jobId: "job-2" }));

    expect((await getWorksheet("job-1"))?.jobId).toBe("job-1");
    expect((await listWorksheets()).map((draft) => draft.jobId).sort()).toEqual([
      "job-1",
      "job-2",
    ]);

    await deleteWorksheet("job-1");

    expect(await getWorksheet("job-1")).toBeUndefined();
    expect(await listWorksheets()).toHaveLength(1);
  });

  it("marks every worksheet photo as uploaded", async () => {
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
          {
            id: "photo-2",
            caption: "Pipes",
            capturedAt: FIXED_NOW,
            uploaded: false,
          },
        ],
      }),
    );

    await markWorksheetPhotosUploaded("job-1");

    const draft = await getWorksheet("job-1");
    expect(draft?.photos.map((photo) => photo.uploaded)).toEqual([true, true]);
  });

  it("does nothing when the worksheet does not exist", async () => {
    await expect(
      markWorksheetPhotosUploaded("missing"),
    ).resolves.toBeUndefined();
  });
});
