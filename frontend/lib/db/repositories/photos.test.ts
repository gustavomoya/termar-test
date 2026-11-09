import { beforeEach, describe, expect, it } from "vitest";
import {
  deletePhoto,
  deletePhotosByJob,
  getPhoto,
  listPhotosByJob,
  markPhotosUploaded,
  putPhoto,
} from "@/lib/db/repositories/photos";
import { makePhoto } from "@/lib/test/factories";
import { resetDB } from "@/lib/test/db";

describe("photos repository", () => {
  beforeEach(async () => {
    await resetDB();
  });

  it("stores and reads photos by id", async () => {
    await putPhoto(makePhoto({ id: "photo-1" }));

    const photo = await getPhoto("photo-1");
    expect(photo?.caption).toBe("Boiler");
    expect(photo?.blob).toBeInstanceOf(Blob);
  });

  it("lists only the photos of a job", async () => {
    await putPhoto(makePhoto({ id: "photo-1", jobId: "job-1" }));
    await putPhoto(makePhoto({ id: "photo-2", jobId: "job-1" }));
    await putPhoto(makePhoto({ id: "photo-3", jobId: "job-2" }));

    expect(
      (await listPhotosByJob("job-1")).map((photo) => photo.id).sort(),
    ).toEqual(["photo-1", "photo-2"]);
  });

  it("deletes one photo or every photo of a job", async () => {
    await putPhoto(makePhoto({ id: "photo-1", jobId: "job-1" }));
    await putPhoto(makePhoto({ id: "photo-2", jobId: "job-1" }));
    await putPhoto(makePhoto({ id: "photo-3", jobId: "job-2" }));

    await deletePhoto("photo-1");
    expect(await getPhoto("photo-1")).toBeUndefined();

    await deletePhotosByJob("job-1");
    expect(await listPhotosByJob("job-1")).toEqual([]);
    expect(await listPhotosByJob("job-2")).toHaveLength(1);
  });

  it("marks every photo of a job as uploaded", async () => {
    await putPhoto(makePhoto({ id: "photo-1", jobId: "job-1" }));
    await putPhoto(makePhoto({ id: "photo-2", jobId: "job-1" }));

    await markPhotosUploaded("job-1");

    expect(
      (await listPhotosByJob("job-1")).every((photo) => photo.uploaded),
    ).toBe(true);
  });
});
