import { describe, it, expect } from "vitest";
import { createInitialState, SPEC_PRESETS } from "./initialState";

describe("createInitialState", () => {
  it("returns phase=upload", () => {
    expect(createInitialState().phase).toBe("upload");
  });

  it("returns null bitmaps and zero image dimensions", () => {
    const { image } = createInitialState();
    expect(image.original).toBeNull();
    expect(image.working).toBeNull();
    expect(image.width).toBe(0);
    expect(image.height).toBe(0);
  });

  it("returns the default EU/UK passport specs (35×45mm, 34mm head, 300 DPI)", () => {
    const { specs } = createInitialState();
    expect(specs.widthMm).toBe(35);
    expect(specs.heightMm).toBe(45);
    expect(specs.headHeightMm).toBe(34);
    expect(specs.dpi).toBe(300);
  });

  it("returns detection in a clean initial state", () => {
    const { detection } = createInitialState();
    expect(detection.landmarks).toBeNull();
    expect(detection.confidence).toBe(0);
    expect(detection.mode).toBe("auto");
    expect(detection.hasRun).toBe(false);
    expect(detection.faceCount).toBe(0);
    expect(detection.candidates).toHaveLength(0);
  });

  it("returns empty manual overrides", () => {
    expect(createInitialState().manualOverrides).toEqual({});
  });

  it("returns identity transform", () => {
    const { transform } = createInitialState();
    expect(transform.scale).toBe(1);
    expect(transform.translateX).toBe(0);
    expect(transform.translateY).toBe(0);
    expect(transform.rotation).toBe(0);
  });

  it("returns zoom=1 and panX/panY=0", () => {
    const { ui } = createInitialState();
    expect(ui.zoom).toBe(1);
    expect(ui.panX).toBe(0);
    expect(ui.panY).toBe(0);
    expect(ui.dragging).toBe("none");
  });

  it("returns no errors", () => {
    expect(createInitialState().errors).toHaveLength(0);
  });

  it("returns a fresh independent object on each call", () => {
    const a = createInitialState();
    const b = createInitialState();
    expect(a).not.toBe(b);
    expect(a.specs).not.toBe(b.specs);
  });
});

describe("SPEC_PRESETS", () => {
  it("contains at least one preset", () => {
    expect(SPEC_PRESETS.length).toBeGreaterThan(0);
  });

  it("every preset has positive, non-zero dimensions", () => {
    for (const p of SPEC_PRESETS) {
      expect(p.widthMm).toBeGreaterThan(0);
      expect(p.heightMm).toBeGreaterThan(0);
      expect(p.headHeightMm).toBeGreaterThan(0);
    }
  });

  it("every preset has head height smaller than frame height", () => {
    for (const p of SPEC_PRESETS) {
      expect(p.headHeightMm).toBeLessThan(p.heightMm);
    }
  });

  it("every preset has a non-empty label", () => {
    for (const p of SPEC_PRESETS) {
      expect(p.label.trim().length).toBeGreaterThan(0);
    }
  });

  it("all preset labels are unique", () => {
    const labels = SPEC_PRESETS.map((p) => p.label);
    expect(new Set(labels).size).toBe(labels.length);
  });

  it("includes a US Passport preset with 50.8×50.8mm dimensions", () => {
    const us = SPEC_PRESETS.find((p) => p.label.includes("US"));
    expect(us).toBeDefined();
    expect(us!.widthMm).toBeCloseTo(50.8);
    expect(us!.heightMm).toBeCloseTo(50.8);
  });
});
