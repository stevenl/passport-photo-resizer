const MAX_WORKING_DIMENSION = 1600;
const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024; // 20 MB
const SUPPORTED_TYPES = ["image/jpeg", "image/jpg", "image/png"];

export class UnsupportedFormatError extends Error {}
export class FileTooLargeError extends Error {}

export function validateFile(file: File): void {
  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new FileTooLargeError(
      `File is ${(file.size / 1024 / 1024).toFixed(1)} MB; the maximum is 20 MB.`,
    );
  }
  const type = file.type.toLowerCase();
  const isSupported =
    SUPPORTED_TYPES.includes(type) ||
    /\.(jpe?g|png)$/i.test(file.name);
  if (!isSupported) {
    throw new UnsupportedFormatError(
      `"${file.name}" doesn't look like a JPG or PNG. If you have a HEIC photo, export it as JPG from your camera app first.`,
    );
  }
}

/**
 * Pure function: given an image's pixel dimensions, returns the target
 * dimensions for the downscaled working copy (max 1600px on the long side).
 * Exported so it can be unit-tested independently of createImageBitmap.
 */
export function computeWorkingCopyDimensions(
  width: number,
  height: number,
): { width: number; height: number; needsResize: boolean } {
  const longSide = Math.max(width, height);
  if (longSide <= MAX_WORKING_DIMENSION) {
    return { width, height, needsResize: false };
  }
  const ratio = MAX_WORKING_DIMENSION / longSide;
  return {
    width: Math.round(width * ratio),
    height: Math.round(height * ratio),
    needsResize: true,
  };
}

/** Decodes a File into a full-resolution ImageBitmap. Original, never mutated. */
export async function decodeOriginalImage(file: File): Promise<ImageBitmap> {
  return await createImageBitmap(file);
}

/**
 * Creates the downscaled working copy used for preview/detection/interaction,
 * per architecture.md §9.1: working = downscale(original, max 1600px).
 */
export async function createWorkingCopy(
  original: ImageBitmap,
): Promise<ImageBitmap> {
  const { width, height, needsResize } = computeWorkingCopyDimensions(
    original.width,
    original.height,
  );
  if (!needsResize) {
    return await createImageBitmap(original);
  }
  return await createImageBitmap(original, {
    resizeWidth: width,
    resizeHeight: height,
    resizeQuality: "high",
  });
}

export interface ImageQualityCheck {
  tooSmall: boolean;
  warnings: string[];
}

export function checkImageQuality(width: number, height: number): ImageQualityCheck {
  const MIN_DIMENSION = 400;
  const tooSmall = width < MIN_DIMENSION || height < MIN_DIMENSION;
  const warnings: string[] = [];
  if (tooSmall) {
    warnings.push(
      `Image is ${width}×${height}px, which is quite small. For best results use a photo at least ${MIN_DIMENSION}×${MIN_DIMENSION}px.`,
    );
  }
  return { tooSmall, warnings };
}
