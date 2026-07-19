/**
 * Integration: imageLoader pipeline
 *
 * validateFile and computeWorkingCopyDimensions are tested in isolation in
 * imageLoader.test.ts. These tests verify they compose correctly across the
 * realistic end-to-end path: a File arrives, passes validation, and the
 * working-copy dimensions that would be created are consistent with what the
 * rest of the pipeline (bitmapToOriginalScale in ViewTransform, etc.) expects.
 */
import { describe, it, expect } from "vitest";
import {
  validateFile,
  computeWorkingCopyDimensions,
  checkImageQuality,
} from "@/utils/imageLoader";

function makeFile(name: string, type: string, sizeBytes = 100): File {
  return new File([new Uint8Array(sizeBytes)], name, { type });
}

const MB = 1024 * 1024;

// ---------------------------------------------------------------------------
// validateFile → computeWorkingCopyDimensions
// ---------------------------------------------------------------------------
describe("imageLoader pipeline: accepted file → working copy dimensions", () => {
  it("a small accepted image stays at its original dimensions", () => {
    const file = makeFile("photo.jpg", "image/jpeg");
    expect(() => validateFile(file)).not.toThrow();

    const dims = computeWorkingCopyDimensions(800, 600);
    expect(dims.needsResize).toBe(false);
    expect(dims.width).toBe(800);
    expect(dims.height).toBe(600);
  });

  it("a large accepted image is downscaled and the scale ratio is consistent", () => {
    const file = makeFile("bigphoto.png", "image/png");
    expect(() => validateFile(file)).not.toThrow();

    const ORIG_W = 4032;
    const ORIG_H = 3024;
    const dims = computeWorkingCopyDimensions(ORIG_W, ORIG_H);

    expect(dims.needsResize).toBe(true);
    // bitmapToOriginalScale used in ViewTransform must equal original/working
    const scaleX = ORIG_W / dims.width;
    const scaleY = ORIG_H / dims.height;
    // Uniform scale (aspect ratio preserved)
    expect(scaleX).toBeCloseTo(scaleY, 5);
    // Long side is exactly 1600
    expect(Math.max(dims.width, dims.height)).toBe(1600);
  });

  it("the scale from computeWorkingCopyDimensions matches what ViewTransform expects", () => {
    // ViewTransform.bitmapToOriginalScale = originalWidth / workingWidth
    // This must equal the inverse of the ratio used in computeWorkingCopyDimensions
    const ORIG_W = 3200;
    const ORIG_H = 2400;
    const dims = computeWorkingCopyDimensions(ORIG_W, ORIG_H);

    const bitmapToOriginalScale = ORIG_W / dims.width;
    // A point at (dims.width/2, dims.height/2) in working coords should
    // map to (ORIG_W/2, ORIG_H/2) in original coords
    const originalX = (dims.width / 2) * bitmapToOriginalScale;
    const originalY = (dims.height / 2) * bitmapToOriginalScale;

    expect(originalX).toBeCloseTo(ORIG_W / 2, 1);
    expect(originalY).toBeCloseTo(ORIG_H / 2, 1);
  });
});

// ---------------------------------------------------------------------------
// validateFile → checkImageQuality
// ---------------------------------------------------------------------------
describe("imageLoader pipeline: validate then quality-check", () => {
  it("a valid file that is also large enough produces no warnings", () => {
    const file = makeFile("passport.jpg", "image/jpeg");
    expect(() => validateFile(file)).not.toThrow();
    expect(checkImageQuality(1200, 1600).warnings).toHaveLength(0);
  });

  it("a valid file that is too small surfaces a quality warning", () => {
    const file = makeFile("tiny.jpg", "image/jpeg");
    expect(() => validateFile(file)).not.toThrow();
    const q = checkImageQuality(200, 150);
    expect(q.tooSmall).toBe(true);
    expect(q.warnings.length).toBeGreaterThan(0);
  });

  it("an invalid file type is rejected before quality checks are even needed", () => {
    const file = makeFile("photo.gif", "image/gif");
    expect(() => validateFile(file)).toThrow();
    // Quality check is never reached for rejected files — the pipeline
    // short-circuits. We just confirm validateFile throws here.
  });

  it("a file at exactly the 20 MB limit passes validation", () => {
    const file = makeFile("big.jpg", "image/jpeg", 20 * MB);
    expect(() => validateFile(file)).not.toThrow();
  });

  it("a file one byte over the 20 MB limit is rejected", () => {
    const file = makeFile("toobig.jpg", "image/jpeg", 20 * MB + 1);
    expect(() => validateFile(file)).toThrow();
  });
});

// ---------------------------------------------------------------------------
// computeWorkingCopyDimensions aspect-ratio consistency
// ---------------------------------------------------------------------------
describe("imageLoader pipeline: aspect ratio preserved through resize", () => {
  it("portrait images preserve aspect ratio", () => {
    const { width, height } = computeWorkingCopyDimensions(2000, 4000);
    expect(width / height).toBeCloseTo(2000 / 4000, 3);
  });

  it("landscape images preserve aspect ratio", () => {
    const { width, height } = computeWorkingCopyDimensions(4000, 2000);
    expect(width / height).toBeCloseTo(4000 / 2000, 3);
  });

  it("square images stay square", () => {
    const { width, height } = computeWorkingCopyDimensions(3000, 3000);
    expect(width).toBe(height);
  });

  it("images already within the limit are not resized", () => {
    const { needsResize, width, height } = computeWorkingCopyDimensions(1200, 900);
    expect(needsResize).toBe(false);
    expect(width).toBe(1200);
    expect(height).toBe(900);
  });
});
