/**
 * Integration: reducer × computeGeometry
 *
 * These tests drive the reducer through realistic action sequences and then
 * run computeGeometry on the resulting state, verifying that the two layers
 * compose correctly end-to-end. Neither layer is mocked — this is the seam
 * most likely to break silently when either module is changed.
 */
import { describe, it, expect } from "vitest";
import { appReducer } from "@/state/reducer";
import { createInitialState } from "@/state/initialState";
import { computeGeometry } from "@/geometry/computeGeometry";
import { mmToPx } from "@/geometry/units";
import type { AppState, FaceLandmarks } from "@/types";

const BITMAP = {} as ImageBitmap;

function makeLandmarks(
  chin = { x: 1000, y: 1800 },
  crown = { x: 1000, y: 1000 },
): FaceLandmarks {
  return {
    rawPoints: [],
    leftEye: { x: 800, y: 1100 },
    rightEye: { x: 1200, y: 1100 },
    noseTip: { x: 1000, y: 1300 },
    chin,
    crown,
    boundingBox: { x: 700, y: 900, width: 600, height: 1000 },
  };
}

/** Drives state through a complete upload → detect sequence. */
function stateAfterDetection(
  chin = { x: 1000, y: 1800 },
  crown = { x: 1000, y: 1000 },
): AppState {
  let s = createInitialState();

  s = appReducer(s, {
    type: "IMAGE_LOADED",
    original: BITMAP,
    working: BITMAP,
    width: 3000,
    height: 4000,
    workingWidth: 1200,
    workingHeight: 1600,
  });

  s = appReducer(s, {
    type: "DETECTION_SUCCEEDED",
    candidates: [makeLandmarks(chin, crown)],
    confidence: 0.92,
    selectedFaceIndex: 0,
  });

  return s;
}

// ---------------------------------------------------------------------------
// Phase transitions
// ---------------------------------------------------------------------------
describe("reducer → computeGeometry: phase transitions", () => {
  it("geometry is invalid in the upload phase (no image loaded)", () => {
    const result = computeGeometry(createInitialState());
    expect(result.isValid).toBe(false);
  });

  it("geometry is invalid after IMAGE_LOADED but before detection", () => {
    let s = createInitialState();
    s = appReducer(s, {
      type: "IMAGE_LOADED",
      original: BITMAP, working: BITMAP,
      width: 3000, height: 4000,
      workingWidth: 1200, workingHeight: 1600,
    });
    expect(computeGeometry(s).isValid).toBe(false);
  });

  it("geometry becomes valid after DETECTION_SUCCEEDED", () => {
    expect(computeGeometry(stateAfterDetection()).isValid).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Scale factor: reducer feeds image dimensions, geometry uses them
// ---------------------------------------------------------------------------
describe("reducer → computeGeometry: scale factor", () => {
  it("scale equals desiredHeadHeightPx / detectedHeadHeightPx", () => {
    const state = stateAfterDetection({ x: 1000, y: 1800 }, { x: 1000, y: 1000 });
    const result = computeGeometry(state);
    // chin=(1000,1800), crown=(1000,1000) → headHeightPx = 800
    const desired = mmToPx(state.specs.headHeightMm, state.specs.dpi);
    expect(result.scale).toBeCloseTo(desired / 800, 5);
  });

  it("changing specs via UPDATE_SPECS changes the scale factor", () => {
    const base = stateAfterDetection();
    const r1 = computeGeometry(base);

    const updated = appReducer(base, {
      type: "UPDATE_SPECS",
      specs: { headHeightMm: base.specs.headHeightMm * 2 },
    });
    const r2 = computeGeometry(updated);

    expect(r2.scale).toBeCloseTo(r1.scale * 2, 4);
  });

  it("changing DPI via UPDATE_SPECS scales pixel output proportionally", () => {
    const base = stateAfterDetection();
    const r300 = computeGeometry(base);

    const double = appReducer(base, { type: "UPDATE_SPECS", specs: { dpi: 600 } });
    const r600 = computeGeometry(double);

    expect(r600.scale).toBeCloseTo(r300.scale * 2, 4);
  });
});

// ---------------------------------------------------------------------------
// Crop geometry: derived from state, not stored
// ---------------------------------------------------------------------------
describe("reducer → computeGeometry: crop geometry", () => {
  it("crop is horizontally centred on the chin x coordinate", () => {
    const state = stateAfterDetection({ x: 1200, y: 1800 }, { x: 1200, y: 1000 });
    const result = computeGeometry(state);
    expect(result.crop.x + result.crop.width / 2).toBeCloseTo(1200, 1);
  });

  it("crop width in original coords = outputWidthPx / scale", () => {
    const state = stateAfterDetection();
    const result = computeGeometry(state);
    const widthPx = mmToPx(state.specs.widthMm, state.specs.dpi);
    expect(result.crop.width).toBeCloseTo(widthPx / result.scale, 3);
  });

  it("crop recomputes when specs change — never stale", () => {
    const base = stateAfterDetection();
    const r1 = computeGeometry(base);

    const wider = appReducer(base, { type: "UPDATE_SPECS", specs: { widthMm: 70 } });
    const r2 = computeGeometry(wider);

    expect(r2.crop.width).toBeGreaterThan(r1.crop.width);
  });
});

// ---------------------------------------------------------------------------
// Manual overrides: patch layer applied correctly
// ---------------------------------------------------------------------------
describe("reducer → computeGeometry: manual overrides", () => {
  it("SET_MANUAL_OVERRIDE chin is reflected in geometry", () => {
    let state = stateAfterDetection();
    state = appReducer(state, {
      type: "SET_MANUAL_OVERRIDE",
      target: "chin",
      point: { x: 1000, y: 1900 },
    });
    const result = computeGeometry(state);
    expect(result.chin).toEqual({ x: 1000, y: 1900 });
  });

  it("manual chin increases head height when moved lower", () => {
    const base = stateAfterDetection();
    const r1 = computeGeometry(base);

    const moved = appReducer(base, {
      type: "SET_MANUAL_OVERRIDE",
      target: "chin",
      point: { x: 1000, y: 1950 }, // 150px lower than auto chin at y=1800
    });
    const r2 = computeGeometry(moved);

    expect(r2.headHeightPx).toBeGreaterThan(r1.headHeightPx);
  });

  it("CLEAR_MANUAL_OVERRIDES reverts geometry to auto-detected values", () => {
    let state = stateAfterDetection();
    const rAuto = computeGeometry(state);

    state = appReducer(state, {
      type: "SET_MANUAL_OVERRIDE",
      target: "chin",
      point: { x: 1000, y: 1950 },
    });
    state = appReducer(state, { type: "CLEAR_MANUAL_OVERRIDES" });

    const rReverted = computeGeometry(state);
    expect(rReverted.headHeightPx).toBeCloseTo(rAuto.headHeightPx, 4);
    expect(rReverted.chin).toEqual(rAuto.chin);
  });

  it("geometry is valid using only manual overrides with no auto-detection", () => {
    let state = createInitialState();
    state = appReducer(state, {
      type: "IMAGE_LOADED",
      original: BITMAP, working: BITMAP,
      width: 3000, height: 4000,
      workingWidth: 1200, workingHeight: 1600,
    });
    state = appReducer(state, {
      type: "SET_MANUAL_OVERRIDE",
      target: "chin",
      point: { x: 1000, y: 1800 },
    });
    state = appReducer(state, {
      type: "SET_MANUAL_OVERRIDE",
      target: "crown",
      point: { x: 1000, y: 1000 },
    });
    expect(computeGeometry(state).isValid).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Multi-face flow: SELECT_FACE → correct landmarks → correct geometry
// ---------------------------------------------------------------------------
describe("reducer → computeGeometry: multi-face selection", () => {
  it("SELECT_FACE changes which face's landmarks drive geometry", () => {
    let state = createInitialState();
    state = appReducer(state, {
      type: "IMAGE_LOADED",
      original: BITMAP, working: BITMAP,
      width: 3000, height: 4000,
      workingWidth: 1200, workingHeight: 1600,
    });

    const faceA = makeLandmarks({ x: 1000, y: 1800 }, { x: 1000, y: 1000 }); // headH=800
    const faceB = makeLandmarks({ x: 500, y: 900 }, { x: 500, y: 500 });     // headH=400

    state = appReducer(state, {
      type: "DETECTION_SUCCEEDED",
      candidates: [faceA, faceB],
      confidence: 0.9,
      selectedFaceIndex: 0,
    });

    const rA = computeGeometry(state);
    state = appReducer(state, { type: "SELECT_FACE", index: 1 });
    const rB = computeGeometry(state);

    expect(rA.headHeightPx).toBeCloseTo(800, 1);
    expect(rB.headHeightPx).toBeCloseTo(400, 1);
    expect(rB.headCenterX).toBeCloseTo(500, 1);
  });
});
