import { describe, it, expect } from "vitest";
import {
  validateFile,
  checkImageQuality,
  computeWorkingCopyDimensions,
  UnsupportedFormatError,
  FileTooLargeError,
} from "./imageLoader";

// Helper to create a File-like object without needing a real browser File
function makeFile(name: string, type: string, sizeBytes: number): File {
  // File constructor is available in Node 18+ via the global scope
  const blob = new Blob([new Uint8Array(sizeBytes)], { type });
  return new File([blob], name, { type });
}

const MB = 1024 * 1024;

// ---------------------------------------------------------------------------
// validateFile
// ---------------------------------------------------------------------------
describe("validateFile", () => {
  describe("file size", () => {
    it("accepts a file exactly at the 20 MB limit", () => {
      expect(() => validateFile(makeFile("photo.jpg", "image/jpeg", 20 * MB))).not.toThrow();
    });

    it("throws FileTooLargeError for a file one byte over 20 MB", () => {
      expect(() => validateFile(makeFile("photo.jpg", "image/jpeg", 20 * MB + 1))).toThrow(
        FileTooLargeError,
      );
    });

    it("includes the actual size in MB in the error message", () => {
      try {
        validateFile(makeFile("photo.jpg", "image/jpeg", 21 * MB));
      } catch (e) {
        expect((e as Error).message).toMatch(/21\.0 MB/);
      }
    });
  });

  describe("file format — accepted by MIME type", () => {
    it("accepts image/jpeg", () => {
      expect(() => validateFile(makeFile("photo.jpg", "image/jpeg", 100))).not.toThrow();
    });
    it("accepts image/jpg", () => {
      expect(() => validateFile(makeFile("photo.jpg", "image/jpg", 100))).not.toThrow();
    });
    it("accepts image/png", () => {
      expect(() => validateFile(makeFile("photo.png", "image/png", 100))).not.toThrow();
    });
    it("is case-insensitive for MIME type", () => {
      expect(() => validateFile(makeFile("photo.jpg", "IMAGE/JPEG", 100))).not.toThrow();
    });
  });

  describe("file format — accepted by extension fallback", () => {
    it("accepts a .jpg extension with no/unknown MIME type", () => {
      expect(() => validateFile(makeFile("photo.jpg", "", 100))).not.toThrow();
    });
    it("accepts a .jpeg extension", () => {
      expect(() => validateFile(makeFile("photo.jpeg", "", 100))).not.toThrow();
    });
    it("accepts a .png extension", () => {
      expect(() => validateFile(makeFile("photo.png", "", 100))).not.toThrow();
    });
    it("accepts a .JPG extension (case-insensitive)", () => {
      expect(() => validateFile(makeFile("photo.JPG", "", 100))).not.toThrow();
    });
    it("accepts a .PNG extension (case-insensitive)", () => {
      expect(() => validateFile(makeFile("photo.PNG", "", 100))).not.toThrow();
    });
  });

  describe("file format — rejected", () => {
    it("throws UnsupportedFormatError for a .gif file", () => {
      expect(() => validateFile(makeFile("anim.gif", "image/gif", 100))).toThrow(
        UnsupportedFormatError,
      );
    });
    it("throws UnsupportedFormatError for a .webp file", () => {
      expect(() => validateFile(makeFile("photo.webp", "image/webp", 100))).toThrow(
        UnsupportedFormatError,
      );
    });
    it("throws UnsupportedFormatError for a .pdf file", () => {
      expect(() => validateFile(makeFile("doc.pdf", "application/pdf", 100))).toThrow(
        UnsupportedFormatError,
      );
    });
    it("throws UnsupportedFormatError for a .heic file (no longer supported)", () => {
      expect(() => validateFile(makeFile("photo.heic", "image/heic", 100))).toThrow(
        UnsupportedFormatError,
      );
    });
    it("includes the filename in the error message", () => {
      try {
        validateFile(makeFile("selfie.bmp", "image/bmp", 100));
      } catch (e) {
        expect((e as Error).message).toContain("selfie.bmp");
      }
    });
    it("mentions JPG in the error message for unsupported formats", () => {
      try {
        validateFile(makeFile("photo.tiff", "image/tiff", 100));
      } catch (e) {
        expect((e as Error).message).toMatch(/JPG/i);
      }
    });
  });
});

// ---------------------------------------------------------------------------
// checkImageQuality
// ---------------------------------------------------------------------------
describe("checkImageQuality", () => {
  it("returns tooSmall=false for an adequately large image", () => {
    expect(checkImageQuality(1200, 1600).tooSmall).toBe(false);
  });

  it("returns tooSmall=false for an image exactly at the 400px minimum", () => {
    expect(checkImageQuality(400, 400).tooSmall).toBe(false);
  });

  it("returns tooSmall=true when width is below 400px", () => {
    expect(checkImageQuality(300, 1200).tooSmall).toBe(true);
  });

  it("returns tooSmall=true when height is below 400px", () => {
    expect(checkImageQuality(1200, 300).tooSmall).toBe(true);
  });

  it("returns tooSmall=true when both dimensions are below 400px", () => {
    expect(checkImageQuality(200, 200).tooSmall).toBe(true);
  });

  it("returns a non-empty warning array when tooSmall=true", () => {
    const result = checkImageQuality(200, 200);
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it("includes the actual dimensions in the warning", () => {
    const result = checkImageQuality(300, 200);
    expect(result.warnings[0]).toContain("300");
    expect(result.warnings[0]).toContain("200");
  });

  it("returns an empty warnings array when the image is large enough", () => {
    expect(checkImageQuality(800, 600).warnings).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// computeWorkingCopyDimensions
// ---------------------------------------------------------------------------
describe("computeWorkingCopyDimensions", () => {
  it("returns needsResize=false for an image within the 1600px limit", () => {
    expect(computeWorkingCopyDimensions(800, 600).needsResize).toBe(false);
  });

  it("returns the original dimensions when no resize is needed", () => {
    const r = computeWorkingCopyDimensions(800, 600);
    expect(r.width).toBe(800);
    expect(r.height).toBe(600);
  });

  it("returns needsResize=false for an image exactly 1600px on its long side", () => {
    expect(computeWorkingCopyDimensions(1600, 1200).needsResize).toBe(false);
  });

  it("returns needsResize=true for an image exceeding 1600px on its long side", () => {
    expect(computeWorkingCopyDimensions(2400, 3200).needsResize).toBe(true);
  });

  it("caps the long side at 1600px for a portrait image", () => {
    const r = computeWorkingCopyDimensions(1200, 3200);
    // long side = 3200, ratio = 1600/3200 = 0.5
    expect(r.height).toBe(1600);
    expect(r.width).toBe(600);
  });

  it("caps the long side at 1600px for a landscape image", () => {
    const r = computeWorkingCopyDimensions(3200, 1200);
    expect(r.width).toBe(1600);
    expect(r.height).toBe(600);
  });

  it("preserves aspect ratio after resizing", () => {
    const r = computeWorkingCopyDimensions(2000, 4000);
    // Original ratio = 2000/4000 = 0.5
    expect(r.width / r.height).toBeCloseTo(0.5, 3);
  });

  it("returns integer dimensions", () => {
    // 3000×2000 → ratio = 1600/3000 → target = [1600, 1067]
    const r = computeWorkingCopyDimensions(3000, 2000);
    expect(Number.isInteger(r.width)).toBe(true);
    expect(Number.isInteger(r.height)).toBe(true);
  });

  it("handles square images correctly", () => {
    const r = computeWorkingCopyDimensions(2400, 2400);
    expect(r.width).toBe(1600);
    expect(r.height).toBe(1600);
  });
});
