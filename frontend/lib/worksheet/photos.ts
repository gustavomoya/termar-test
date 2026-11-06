/**
 * Client-side photo pipeline: read the camera image, orient it, scale it down,
 * compress it and generate a small thumbnail for the grid.
 *
 * The helper backend caps request bodies at ~10 MB, so the number of photos and
 * their encoded size are limited here before they reach the outbox.
 */

export const MAX_PHOTOS = 4;
export const MAX_PHOTO_BYTES = 1_500_000;
export const MAX_TOTAL_PHOTO_UPLOAD_BYTES = 8_000_000;

const MAX_IMAGE_DIMENSION = 1920;
const THUMB_MAX_DIMENSION = 320;
const THUMB_QUALITY = 0.7;

export interface ProcessedPhoto {
  blob: Blob;
  thumbBlob: Blob;
  width: number;
  height: number;
  sizeBytes: number;
  mime: string;
}

interface CanvasSource {
  image: CanvasImageSource;
  width: number;
  height: number;
  close?: () => void;
}

function toBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
          return;
        }
        reject(new Error("Could not process this photo."));
      },
      type,
      quality,
    );
  });
}

function fitWithin(width: number, height: number, max: number) {
  const scale = Math.min(1, max / Math.max(width, height));
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

async function decodeImage(file: File): Promise<CanvasSource> {
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(file, {
        imageOrientation: "from-image",
      });
      return {
        image: bitmap,
        width: bitmap.width,
        height: bitmap.height,
        close: () => bitmap.close(),
      };
    } catch {
      // Fall back to an <img> for formats the browser can decode but
      // createImageBitmap cannot.
    }
  }

  const url = URL.createObjectURL(file);

  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = () =>
        reject(new Error("Could not read this photo. Try a JPEG or PNG."));
      element.src = url;
    });

    return {
      image,
      width: image.naturalWidth,
      height: image.naturalHeight,
      close: () => URL.revokeObjectURL(url),
    };
  } catch (error) {
    URL.revokeObjectURL(url);
    throw error;
  }
}

function drawScaled(
  source: CanvasSource,
  canvas: HTMLCanvasElement,
  max: number,
): { width: number; height: number } {
  const size = fitWithin(source.width, source.height, max);
  canvas.width = size.width;
  canvas.height = size.height;

  const context = canvas.getContext("2d");
  if (!context) throw new Error("Could not process this photo.");

  context.drawImage(source.image, 0, 0, size.width, size.height);

  return size;
}

/**
 * Compress a camera image with a hard size budget
 *
 * The first attempt uses the design's 1920 px / JPEG 0.8. If that is still
 * larger than the per-photo budget, quality is lowered before resolution so
 * the photo stays legible for the invoice discussion.
 */
export async function processPhoto(file: File): Promise<ProcessedPhoto> {
  if (!file.type.startsWith("image/")) {
    throw new Error("That file is not a photo.");
  }

  const source = await decodeImage(file);

  try {
    const main = document.createElement("canvas");
    drawScaled(source, main, MAX_IMAGE_DIMENSION);

    const attempts: Array<{ max: number; quality: number }> = [
      { max: MAX_IMAGE_DIMENSION, quality: 0.8 },
      { max: MAX_IMAGE_DIMENSION, quality: 0.6 },
      { max: MAX_IMAGE_DIMENSION, quality: 0.5 },
      { max: 1280, quality: 0.7 },
      { max: 1024, quality: 0.6 },
      { max: 800, quality: 0.5 },
    ];

    let blob: Blob | undefined;
    for (const attempt of attempts) {
      if (attempt.max !== MAX_IMAGE_DIMENSION) {
        drawScaled(source, main, attempt.max);
      }

      blob = await toBlob(main, "image/jpeg", attempt.quality);
      if (blob.size <= MAX_PHOTO_BYTES) break;
    }

    if (!blob) throw new Error("Could not process this photo.");

    const thumb = document.createElement("canvas");
    drawScaled(source, thumb, THUMB_MAX_DIMENSION);
    const thumbBlob = await toBlob(thumb, "image/jpeg", THUMB_QUALITY);

    return {
      blob,
      thumbBlob,
      width: main.width,
      height: main.height,
      sizeBytes: blob.size,
      mime: "image/jpeg",
    };
  } finally {
    source.close?.();
  }
}

/**
 * Convert a Blob into a data URL for the worksheet upload
 */
export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }
      reject(new Error("Could not read the photo."));
    };
    reader.onerror = () => reject(new Error("Could not read the photo."));
    reader.readAsDataURL(blob);
  });
}

/**
 * Estimate the size of a Blob once encoded as base64 (plus the data URL prefix)
 */
export function estimatedDataUrlBytes(bytes: number): number {
  return Math.ceil((bytes * 4) / 3) + 32;
}

/**
 * Build a default caption from the camera file name
 */
export function captionFromFile(file: File): string {
  const name = file.name.replace(/\.[^.]+$/, "").trim();
  return name || "Photo";
}

/**
 * Generate a stable photo identifier. crypto.randomUUID is available in the
 * Chromium versions the app targets; the fallback keeps the demo working
 */
export function newPhotoId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `photo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
