import { describe, it, expect } from "vitest";
import { computeGeometry } from "./computeGeometry";
import { createInitialState } from "@/state/initialState";
import type { AppState, FaceLandmarks } from "@/types";
import { mmToPx } from "./units";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeLandmarks(chin: { x: number; y: number }, crown: { x: number; y: number }): FaceLandmarks {
  return {
    rawPoints: [],
    leftEye: { x: 0, y: 0 },
    rightEye: { x: 0, y: 0 },
    noseTip: { x: 0, y: 0 },
    chin,
    crown,
    boundingBox: { x: 0, y: 0, width: 100, height: 200 },
  };
}

function stateWith(
  chin: { x: number; y: number },
  crown: { x: number; y: number },
  overrides: Partial<AppState> = {},
): AppState {
  const base = createInitialState();
  return {
    ...base,
    image: { ...base.image, width: 2000, height: 3000 },
    detection: { ...base.detection, landmarks: makeLandmarks(chin, crown) },
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// No landmarks → invalid
// ---------------------------------------------------------------------------
describe("computeGeometry — no landmarks", () => {
  it("returns isValid=false with no landmarks and no overrides", () => {
    expect(computeGeometry(createInitialState()).isValid).toBe(false);
  });

  it("includes a warning when no reference points exist", () => {
    const r = computeGeometry(createInitialState());
    expect(r.warnings.length).toBeGreaterThan(0);
  });

  it("returns headHeightPx=0 when invalid", () => {
    expect(computeGeometry(createInitialState()).headHeightPx).toBe(0);
  });

  it("returns isValid=false when only chin override is set", () => {
    const s = { ...createInitialState(), manualOverrides: { chin: { x: 500, y: 800 } } };
    expect(computeGeometry(s).isValid).toBe(false);
  });

  it("returns isValid=false when only crown override is set", () => {
    const s = { ...createInitialState(), manualOverrides: { crown: { x: 500, y: 400 } } };
    expect(computeGeometry(s).isValid).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Head height
// ---------------------------------------------------------------------------
describe("computeGeometry — head height", () => {
  it("equals the euclidean distance between chin and crown", () => {
    const s = stateWith({ x: 500, y: 900 }, { x: 500, y: 500 });
    expect(computeGeometry(s).headHeightPx).toBeCloseTo(400);
  });

  it("handles a diagonal pair (3-4-5 triangle)", () => {
    const s = stateWith({ x: 900, y: 1100 }, { x: 600, y: 700 });
    expect(computeGeometry(s).headHeightPx).toBeCloseTo(500);
  });

  it("marks isValid=true when headHeightPx > 0", () => {
    expect(computeGeometry(stateWith({ x: 500, y: 900 }, { x: 500, y: 500 })).isValid).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Scale factor
// ---------------------------------------------------------------------------
describe("computeGeometry — scale factor", () => {
  it("equals desiredHeadHeightPx / detectedHeadHeightPx", () => {
    const s = stateWith({ x: 500, y: 900 }, { x: 500, y: 500 });
    const desired = mmToPx(s.specs.headHeightMm, s.specs.dpi);
    expect(computeGeometry(s).scale).toBeCloseTo(desired / 400, 6);
  });

  it("is > 1 when the detected head is smaller than target", () => {
    // 50 px head, typical target is ~400 px → scale >> 1
    expect(computeGeometry(stateWith({ x: 500, y: 550 }, { x: 500, y: 500 })).scale).toBeGreaterThan(1);
  });

  it("is < 1 when the detected head is larger than target", () => {
    expect(computeGeometry(stateWith({ x: 500, y: 2500 }, { x: 500, y: 500 })).scale).toBeLessThan(1);
  });

  it("is exactly 1 when detected head matches desired height", () => {
    const dpi = 300;
    const headMm = 34;
    const desiredPx = mmToPx(headMm, dpi);
    const s = stateWith({ x: 500, y: 500 + desiredPx }, { x: 500, y: 500 });
    expect(computeGeometry(s).scale).toBeCloseTo(1, 5);
  });
});

// ---------------------------------------------------------------------------
// Crop geometry
// ---------------------------------------------------------------------------
describe("computeGeometry — crop geometry", () => {
  const baseState = stateWith({ x: 500, y: 900 }, { x: 500, y: 500 });

  it("crop width in original coords = outputWidthPx / scale", () => {
    const r = computeGeometry(baseState);
    const expected = mmToPx(baseState.specs.widthMm, baseState.specs.dpi) / r.scale;
    expect(r.crop.width).toBeCloseTo(expected, 4);
  });

  it("crop height in original coords = outputHeightPx / scale", () => {
    const r = computeGeometry(baseState);
    const expected = mmToPx(baseState.specs.heightMm, baseState.specs.dpi) / r.scale;
    expect(r.crop.height).toBeCloseTo(expected, 4);
  });

  it("crop is horizontally centred on the chin x", () => {
    const chinX = 600;
    const r = computeGeometry(stateWith({ x: chinX, y: 900 }, { x: chinX, y: 500 }));
    expect(r.crop.x + r.crop.width / 2).toBeCloseTo(chinX, 1);
  });

  it("crown sits at the top-margin offset below the crop top", () => {
    const crown = { x: 500, y: 500 };
    const r = computeGeometry(stateWith({ x: 500, y: 900 }, crown));
    const heightPx = mmToPx(baseState.specs.heightMm, baseState.specs.dpi);
    const topMargin = heightPx * 0.12;
    const expectedCropTop = crown.y - topMargin / r.scale;
    expect(r.crop.y).toBeCloseTo(expectedCropTop, 4);
  });
});

// ---------------------------------------------------------------------------
// Manual overrides
// ---------------------------------------------------------------------------
describe("computeGeometry — manual overrides", () => {
  it("uses the manual chin over the auto-detected one", () => {
    const s: AppState = {
      ...stateWith({ x: 500, y: 900 }, { x: 500, y: 500 }),
      manualOverrides: { chin: { x: 500, y: 950 } },
    };
    expect(computeGeometry(s).chin).toEqual({ x: 500, y: 950 });
  });

  it("uses the manual crown over the auto-detected one", () => {
    const s: AppState = {
      ...stateWith({ x: 500, y: 900 }, { x: 500, y: 500 }),
      manualOverrides: { crown: { x: 500, y: 450 } },
    };
    expect(computeGeometry(s).crown).toEqual({ x: 500, y: 450 });
  });

  it("two manual overrides produce a valid result with no auto landmarks", () => {
    const base = createInitialState();
    const s: AppState = {
      ...base,
      image: { ...base.image, width: 2000, height: 3000 },
      manualOverrides: { chin: { x: 510, y: 960 }, crown: { x: 490, y: 460 } },
    };
    const r = computeGeometry(s);
    expect(r.isValid).toBe(true);
    expect(r.chin).toEqual({ x: 510, y: 960 });
    expect(r.crown).toEqual({ x: 490, y: 460 });
  });

  it("manual chin override changes the computed head height", () => {
    const autoS = stateWith({ x: 500, y: 900 }, { x: 500, y: 500 });
    const manualS: AppState = {
      ...autoS,
      manualOverrides: { chin: { x: 500, y: 950 } },
    };
    // Manual chin is 50 px lower → 50 px taller head height
    expect(computeGeometry(manualS).headHeightPx).toBeCloseTo(
      computeGeometry(autoS).headHeightPx + 50, 1,
    );
  });
});

// ---------------------------------------------------------------------------
// Crop bounds warnings
// ---------------------------------------------------------------------------
describe("computeGeometry — crop bounds warnings", () => {
  it("warns when crop extends beyond the top/left", () => {
    // Crown very near the top → crop top will be negative
    const r = computeGeometry(stateWith({ x: 500, y: 300 }, { x: 500, y: 10 }));
    expect(r.warnings.some((w) => /top.left/i.test(w))).toBe(true);
  });

  it("warns when crop extends beyond the bottom/right", () => {
    const r = computeGeometry(stateWith({ x: 1950, y: 2900 }, { x: 1950, y: 2500 }));
    expect(r.warnings.some((w) => /bottom.right/i.test(w))).toBe(true);
  });

  it("produces no bounds warnings for a well-centred face", () => {
    const r = computeGeometry(stateWith({ x: 1000, y: 1500 }, { x: 1000, y: 900 }));
    expect(r.warnings.filter((w) => /top.left|bottom.right/i.test(w))).toHaveLength(0);
  });

  it("skips bounds check when image dimensions are 0", () => {
    const s: AppState = {
      ...createInitialState(),
      manualOverrides: { chin: { x: 500, y: 900 }, crown: { x: 500, y: 500 } },
    };
    const r = computeGeometry(s);
    expect(r.warnings.filter((w) => /top.left|bottom.right/i.test(w))).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Determinism
// ---------------------------------------------------------------------------
describe("computeGeometry — determinism", () => {
  it("returns identical results for the same state", () => {
    const s = stateWith({ x: 500, y: 900 }, { x: 500, y: 500 });
    expect(computeGeometry(s)).toEqual(computeGeometry(s));
  });

  it("different positions produce different crops", () => {
    const r1 = computeGeometry(stateWith({ x: 500, y: 900 }, { x: 500, y: 500 }));
    const r2 = computeGeometry(stateWith({ x: 500, y: 800 }, { x: 500, y: 400 }));
    expect(r1.crop.y).not.toBeCloseTo(r2.crop.y, 0);
  });
});
