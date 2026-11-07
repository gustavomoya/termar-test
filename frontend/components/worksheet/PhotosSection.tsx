"use client";

import { useEffect, useRef, useState } from "react";
import type { PhotoRecord, WorksheetPhotoMeta } from "@/lib/db";
import { useWorksheetStore } from "@/lib/stores/worksheetStore";
import { Section } from "@/components/worksheet/Section";
import { MAX_PHOTOS } from "@/lib/worksheet/photos";

/**
 * Create and revoke an object URL for a photo thumbnail.
 *
 * The URL is created inside the effect (not in useMemo) so React Strict Mode's
 * mount → cleanup → remount cycle gets a fresh URL instead of revoking the only
 * one and leaving the <img> broken.
 *
 * @param blob the thumbnail binary
 */
function useObjectUrl(blob: Blob | undefined): string | undefined {
  const [url, setUrl] = useState<string>();

  useEffect(() => {
    if (!blob) {
      const timer = setTimeout(() => setUrl(undefined), 0);
      return () => clearTimeout(timer);
    }

    const next = URL.createObjectURL(blob);
    // Defer the state update so it is not a synchronous write inside the
    // effect; Strict Mode's mount → cleanup → remount cycle still gets a
    // fresh URL because the cleanup revokes the previous one.
    const timer = setTimeout(() => setUrl(next), 0);

    return () => {
      clearTimeout(timer);
      URL.revokeObjectURL(next);
    };
  }, [blob]);

  return url;
}

function PhotoTile({
  meta,
  record,
  readOnly,
}: {
  meta: WorksheetPhotoMeta;
  record?: PhotoRecord;
  readOnly: boolean;
}) {
  const removePhoto = useWorksheetStore((state) => state.removePhoto);
  const thumbUrl = useObjectUrl(record?.thumbBlob);

  const status = meta.uploaded
    ? { label: "Sent", className: "bg-success-soft text-success" }
    : { label: "On tablet", className: "bg-warning-soft text-warning" };

  return (
    <li className="flex flex-col overflow-hidden rounded-md border border-border bg-surface">
      <div
        className="relative flex aspect-[4/3] items-end overflow-hidden bg-[linear-gradient(135deg,#cbd2dc_0%,#9aa4b2_55%,#7d8794_100%)] p-2"
      >
        {thumbUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={thumbUrl}
            alt={meta.caption}
            className="absolute inset-0 h-full w-full object-cover"
          />
        )}
        {thumbUrl && (
          <span
            aria-hidden="true"
            className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/60 to-transparent"
          />
        )}
        <span
          className="relative z-10 text-xs leading-tight text-white [text-shadow:0_1px_3px_rgba(0,0,0,0.6)]"
        >
          {meta.caption}
        </span>
        <span
          className={`absolute right-2 top-2 z-10 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${status.className}`}
        >
          <span
            aria-hidden="true"
            className="h-1.5 w-1.5 rounded-full bg-current"
          />
          {status.label}
        </span>
        {!readOnly && (
          <button
            type="button"
            onClick={() => void removePhoto(meta.id)}
            aria-label={`Delete photo ${meta.caption}`}
            className="absolute left-2 top-2 z-10 inline-flex h-12 w-12 items-center justify-center rounded-full bg-black/55 text-xl text-white hover:bg-black/75"
          >
            ×
          </button>
        )}
      </div>
    </li>
  );
}

export function PhotosSection() {
  const draft = useWorksheetStore((state) => state.draft);
  const photos = useWorksheetStore((state) => state.photos);
  const readOnly = useWorksheetStore((state) => state.readOnly);
  const photoBusy = useWorksheetStore((state) => state.photoBusy);
  const photoError = useWorksheetStore((state) => state.photoError);
  const addPhoto = useWorksheetStore((state) => state.addPhoto);

  const inputRef = useRef<HTMLInputElement>(null);

  if (!draft) return null;

  const records = new Map(photos.map((photo) => [photo.id, photo]));
  const sent = draft.photos.filter((photo) => photo.uploaded).length;
  const atLimit = draft.photos.length >= MAX_PHOTOS;

  return (
    <Section
      title="Photos"
      aside={
        <span className="text-sm text-ink-secondary">
          {draft.photos.length} on this tablet, {sent} sent
        </span>
      }
    >
      <div className="p-4">
        {photoError && (
          <p
            role="alert"
            className="mb-3 rounded-md border border-danger-border bg-danger-soft px-3 py-2 text-sm text-danger"
          >
            {photoError}
          </p>
        )}

        <ul className="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(160px,1fr))]">
          {!readOnly && (
            <li className="aspect-[4/3]">
              <input
                ref={inputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="sr-only"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  event.target.value = "";
                  if (file) void addPhoto(file);
                }}
              />
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                disabled={photoBusy || atLimit}
                className="flex h-full w-full flex-col items-center justify-center gap-1 rounded-md border-2 border-dashed border-border-strong bg-surface text-md font-semibold text-ink-secondary hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-50"
              >
                <span aria-hidden="true" className="text-2xl">
                  ＋
                </span>
                {photoBusy
                  ? "Saving…"
                  : atLimit
                    ? "Photo limit reached"
                    : "Take photo"}
              </button>
            </li>
          )}

          {draft.photos.map((meta) => (
            <PhotoTile
              key={meta.id}
              meta={meta}
              record={records.get(meta.id)}
              readOnly={readOnly}
            />
          ))}
        </ul>

        <p className="mt-3 text-sm text-ink-secondary">
          {atLimit
            ? `This tablet can send up to ${MAX_PHOTOS} photos per job. Delete one to take another.`
            : `You can add up to ${MAX_PHOTOS} photos per job in this demo.`}
        </p>
      </div>
    </Section>
  );
}
