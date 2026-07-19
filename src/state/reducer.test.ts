import { describe, it, expect } from "vitest";
import { appReducer } from "./reducer";
import { createInitialState } from "./initialState";
import type { AppState, FaceLandmarks } from "@/types";

const BITMAP = {} as ImageBitmap;

function fresh(): AppState {
  return createInitialState();
}

function landmarks(
  chin = { x: 500, y: 900 },
  crown = { x: 500, y: 500 },
): FaceLandmarks {
  return {
    rawPoints: [],
    leftEye: { x: 400, y: 550 },
    rightEye: { x: 600, y: 550 },
    noseTip: { x: 500, y: 650 },
    chin,
    crown,
    boundingBox: { x: 350, y: 450, width: 300, height: 500 },
  };
}

const IMAGE_LOADED = {
  type: "IMAGE_LOADED" as const,
  original: BITMAP,
  working: BITMAP,
  width: 1200,
  height: 1600,
  workingWidth: 900,
  workingHeight: 1200,
};

// ---------------------------------------------------------------------------
// IMAGE_LOADED
// ---------------------------------------------------------------------------
describe("IMAGE_LOADED", () => {
  it("sets phase to specs", () => {
    expect(appReducer(fresh(), IMAGE_LOADED).phase).toBe("specs");
  });

  it("stores image dimensions", () => {
    const s = appReducer(fresh(), IMAGE_LOADED);
    expect(s.image.width).toBe(1200);
    expect(s.image.height).toBe(1600);
    expect(s.image.workingWidth).toBe(900);
    expect(s.image.workingHeight).toBe(1200);
  });

  it("resets detection to initial state", () => {
    const withDetection: AppState = {
      ...fresh(),
      detection: {
        ...fresh().detection,
        hasRun: true,
        confidence: 0.9,
        landmarks: landmarks(),
        faceCount: 1,
        candidates: [landmarks()],
      },
    };
    const s = appReducer(withDetection, IMAGE_LOADED);
    expect(s.detection.hasRun).toBe(false);
    expect(s.detection.landmarks).toBeNull();
    expect(s.detection.confidence).toBe(0);
    expect(s.detection.candidates).toHaveLength(0);
  });

  it("clears manual overrides", () => {
    const s = appReducer(
      { ...fresh(), manualOverrides: { chin: { x: 1, y: 2 } } },
      IMAGE_LOADED,
    );
    expect(s.manualOverrides).toEqual({});
  });

  it("clears existing errors", () => {
    const s = appReducer(
      { ...fresh(), errors: [{ code: "no-face", message: "x" }] },
      IMAGE_LOADED,
    );
    expect(s.errors).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// SET_PHASE
// ---------------------------------------------------------------------------
describe("SET_PHASE", () => {
  it("transitions to editing", () => {
    expect(appReducer(fresh(), { type: "SET_PHASE", phase: "editing" }).phase).toBe("editing");
  });

  it("transitions to exporting", () => {
    expect(appReducer(fresh(), { type: "SET_PHASE", phase: "exporting" }).phase).toBe("exporting");
  });
});

// ---------------------------------------------------------------------------
// UPDATE_SPECS
// ---------------------------------------------------------------------------
describe("UPDATE_SPECS", () => {
  it("merges partial specs without clobbering other fields", () => {
    const s = appReducer(fresh(), { type: "UPDATE_SPECS", specs: { widthMm: 50.8 } });
    expect(s.specs.widthMm).toBe(50.8);
    expect(s.specs.heightMm).toBe(fresh().specs.heightMm);
  });

  it("can update all spec fields at once", () => {
    const newSpecs = { widthMm: 33, heightMm: 48, headHeightMm: 32, dpi: 600 };
    expect(appReducer(fresh(), { type: "UPDATE_SPECS", specs: newSpecs }).specs).toEqual(newSpecs);
  });
});

// ---------------------------------------------------------------------------
// DETECTION_STARTED
// ---------------------------------------------------------------------------
describe("DETECTION_STARTED", () => {
  it("removes detection-related errors but keeps unrelated ones", () => {
    const state: AppState = {
      ...fresh(),
      errors: [
        { code: "no-face", message: "a" },
        { code: "multi-face", message: "b" },
        { code: "low-confidence", message: "c" },
        { code: "face-near-edge", message: "d" },
        { code: "file-too-large", message: "keep" },
      ],
    };
    const s = appReducer(state, { type: "DETECTION_STARTED" });
    expect(s.errors).toHaveLength(1);
    expect(s.errors[0].code).toBe("file-too-large");
  });
});

// ---------------------------------------------------------------------------
// DETECTION_SUCCEEDED
// ---------------------------------------------------------------------------
describe("DETECTION_SUCCEEDED", () => {
  const lm = landmarks();

  it("sets phase to editing", () => {
    const s = appReducer(fresh(), {
      type: "DETECTION_SUCCEEDED", candidates: [lm], confidence: 0.95, selectedFaceIndex: 0,
    });
    expect(s.phase).toBe("editing");
  });

  it("stores the selected landmark and sets hasRun / faceCount", () => {
    const s = appReducer(fresh(), {
      type: "DETECTION_SUCCEEDED", candidates: [lm], confidence: 0.95, selectedFaceIndex: 0,
    });
    expect(s.detection.landmarks).toEqual(lm);
    expect(s.detection.hasRun).toBe(true);
    expect(s.detection.faceCount).toBe(1);
  });

  it("adds no-face error for empty candidates", () => {
    const s = appReducer(fresh(), {
      type: "DETECTION_SUCCEEDED", candidates: [], confidence: 0, selectedFaceIndex: 0,
    });
    expect(s.errors.some((e) => e.code === "no-face")).toBe(true);
  });

  it("adds multi-face error for more than one candidate", () => {
    const s = appReducer(fresh(), {
      type: "DETECTION_SUCCEEDED", candidates: [lm, lm], confidence: 0.9, selectedFaceIndex: 0,
    });
    expect(s.errors.some((e) => e.code === "multi-face")).toBe(true);
  });

  it("adds low-confidence error below 0.85", () => {
    const s = appReducer(fresh(), {
      type: "DETECTION_SUCCEEDED", candidates: [lm], confidence: 0.7, selectedFaceIndex: 0,
    });
    expect(s.errors.some((e) => e.code === "low-confidence")).toBe(true);
  });

  it("does NOT add low-confidence error at exactly 0.85", () => {
    const s = appReducer(fresh(), {
      type: "DETECTION_SUCCEEDED", candidates: [lm], confidence: 0.85, selectedFaceIndex: 0,
    });
    expect(s.errors.some((e) => e.code === "low-confidence")).toBe(false);
  });

  it("adds face-near-edge error when bounding box is within 3% of the left edge", () => {
    const nearEdge = landmarks();
    nearEdge.boundingBox = { x: 5, y: 200, width: 300, height: 400 };
    const base: AppState = { ...fresh(), image: { ...fresh().image, width: 1000, height: 1500 } };
    const s = appReducer(base, {
      type: "DETECTION_SUCCEEDED", candidates: [nearEdge], confidence: 0.95, selectedFaceIndex: 0,
    });
    expect(s.errors.some((e) => e.code === "face-near-edge")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// DETECTION_FAILED
// ---------------------------------------------------------------------------
describe("DETECTION_FAILED", () => {
  const action = { type: "DETECTION_FAILED" as const, error: { code: "detector-init-failed" as const, message: "oops" } };

  it("sets hasRun to true", () => {
    expect(appReducer(fresh(), action).detection.hasRun).toBe(true);
  });

  it("appends the error", () => {
    expect(appReducer(fresh(), action).errors.some((e) => e.code === "detector-init-failed")).toBe(true);
  });

  it("sets phase to editing", () => {
    expect(appReducer(fresh(), action).phase).toBe("editing");
  });
});

// ---------------------------------------------------------------------------
// SELECT_FACE
// ---------------------------------------------------------------------------
describe("SELECT_FACE", () => {
  const lmA = landmarks({ x: 500, y: 800 }, { x: 500, y: 400 });
  const lmB = landmarks({ x: 200, y: 700 }, { x: 200, y: 300 });
  const base: AppState = {
    ...fresh(),
    detection: { ...fresh().detection, candidates: [lmA, lmB], selectedFaceIndex: 0, landmarks: lmA },
    errors: [{ code: "multi-face", message: "two faces" }],
  };

  it("updates selectedFaceIndex", () => {
    expect(appReducer(base, { type: "SELECT_FACE", index: 1 }).detection.selectedFaceIndex).toBe(1);
  });

  it("updates active landmarks to the selected candidate", () => {
    expect(appReducer(base, { type: "SELECT_FACE", index: 1 }).detection.landmarks).toEqual(lmB);
  });

  it("removes the multi-face error", () => {
    const s = appReducer(base, { type: "SELECT_FACE", index: 1 });
    expect(s.errors.some((e) => e.code === "multi-face")).toBe(false);
  });

  it("clears manual overrides", () => {
    const withOverrides = { ...base, manualOverrides: { chin: { x: 1, y: 2 } } };
    expect(appReducer(withOverrides, { type: "SELECT_FACE", index: 1 }).manualOverrides).toEqual({});
  });
});

// ---------------------------------------------------------------------------
// SET_MANUAL_OVERRIDE
// ---------------------------------------------------------------------------
describe("SET_MANUAL_OVERRIDE", () => {
  it("stores a chin override", () => {
    const s = appReducer(fresh(), { type: "SET_MANUAL_OVERRIDE", target: "chin", point: { x: 510, y: 910 } });
    expect(s.manualOverrides.chin).toEqual({ x: 510, y: 910 });
  });

  it("stores a crown override", () => {
    const s = appReducer(fresh(), { type: "SET_MANUAL_OVERRIDE", target: "crown", point: { x: 490, y: 490 } });
    expect(s.manualOverrides.crown).toEqual({ x: 490, y: 490 });
  });

  it("switches detection mode to manual", () => {
    const s = appReducer(fresh(), { type: "SET_MANUAL_OVERRIDE", target: "chin", point: { x: 500, y: 900 } });
    expect(s.detection.mode).toBe("manual");
  });

  it("preserves the other override when only one is updated", () => {
    const withCrown: AppState = { ...fresh(), manualOverrides: { crown: { x: 500, y: 490 } } };
    const s = appReducer(withCrown, { type: "SET_MANUAL_OVERRIDE", target: "chin", point: { x: 500, y: 910 } });
    expect(s.manualOverrides.crown).toEqual({ x: 500, y: 490 });
    expect(s.manualOverrides.chin).toEqual({ x: 500, y: 910 });
  });

  it("clears no-face and low-confidence errors, keeps unrelated ones", () => {
    const state: AppState = {
      ...fresh(),
      errors: [
        { code: "no-face", message: "a" },
        { code: "low-confidence", message: "b" },
        { code: "file-too-large", message: "keep" },
      ],
    };
    const s = appReducer(state, { type: "SET_MANUAL_OVERRIDE", target: "chin", point: { x: 500, y: 900 } });
    expect(s.errors.some((e) => e.code === "no-face")).toBe(false);
    expect(s.errors.some((e) => e.code === "low-confidence")).toBe(false);
    expect(s.errors.some((e) => e.code === "file-too-large")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// CLEAR_MANUAL_OVERRIDES
// ---------------------------------------------------------------------------
describe("CLEAR_MANUAL_OVERRIDES", () => {
  it("removes all overrides", () => {
    const s = appReducer(
      { ...fresh(), manualOverrides: { chin: { x: 1, y: 2 }, crown: { x: 3, y: 4 } } },
      { type: "CLEAR_MANUAL_OVERRIDES" },
    );
    expect(s.manualOverrides).toEqual({});
  });

  it("resets detection mode to auto", () => {
    const s = appReducer(
      { ...fresh(), detection: { ...fresh().detection, mode: "manual" } },
      { type: "CLEAR_MANUAL_OVERRIDES" },
    );
    expect(s.detection.mode).toBe("auto");
  });
});

// ---------------------------------------------------------------------------
// SET_DRAGGING / SET_ZOOM / SET_PAN
// ---------------------------------------------------------------------------
describe("SET_DRAGGING", () => {
  it("updates the dragging target", () => {
    expect(appReducer(fresh(), { type: "SET_DRAGGING", target: "chin" }).ui.dragging).toBe("chin");
  });
  it("can be reset to none", () => {
    const s: AppState = { ...fresh(), ui: { ...fresh().ui, dragging: "chin" } };
    expect(appReducer(s, { type: "SET_DRAGGING", target: "none" }).ui.dragging).toBe("none");
  });
});

describe("SET_ZOOM", () => {
  it("updates zoom", () => {
    expect(appReducer(fresh(), { type: "SET_ZOOM", zoom: 2.5 }).ui.zoom).toBe(2.5);
  });
  it("does not affect pan values", () => {
    const s: AppState = { ...fresh(), ui: { ...fresh().ui, panX: 50, panY: 30 } };
    const next = appReducer(s, { type: "SET_ZOOM", zoom: 1.5 });
    expect(next.ui.panX).toBe(50);
    expect(next.ui.panY).toBe(30);
  });
});

describe("SET_PAN", () => {
  it("updates panX and panY", () => {
    const s = appReducer(fresh(), { type: "SET_PAN", panX: 100, panY: -50 });
    expect(s.ui.panX).toBe(100);
    expect(s.ui.panY).toBe(-50);
  });
  it("does not affect zoom", () => {
    const s: AppState = { ...fresh(), ui: { ...fresh().ui, zoom: 2 } };
    expect(appReducer(s, { type: "SET_PAN", panX: 10, panY: 20 }).ui.zoom).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// ADD_ERROR / DISMISS_ERROR / CLEAR_ERRORS
// ---------------------------------------------------------------------------
describe("ADD_ERROR", () => {
  it("appends a new error code", () => {
    const s = appReducer(fresh(), { type: "ADD_ERROR", error: { code: "no-face", message: "a" } });
    expect(s.errors).toHaveLength(1);
    expect(s.errors[0].code).toBe("no-face");
  });

  it("replaces an existing error with the same code", () => {
    const state: AppState = { ...fresh(), errors: [{ code: "no-face", message: "old" }] };
    const s = appReducer(state, { type: "ADD_ERROR", error: { code: "no-face", message: "new" } });
    expect(s.errors).toHaveLength(1);
    expect(s.errors[0].message).toBe("new");
  });
});

describe("DISMISS_ERROR", () => {
  it("removes only the matching error code", () => {
    const state: AppState = {
      ...fresh(),
      errors: [{ code: "no-face", message: "a" }, { code: "multi-face", message: "b" }],
    };
    const s = appReducer(state, { type: "DISMISS_ERROR", code: "no-face" });
    expect(s.errors).toHaveLength(1);
    expect(s.errors[0].code).toBe("multi-face");
  });

  it("is a no-op when the code does not exist", () => {
    const state: AppState = { ...fresh(), errors: [{ code: "multi-face", message: "b" }] };
    expect(appReducer(state, { type: "DISMISS_ERROR", code: "no-face" }).errors).toHaveLength(1);
  });
});

describe("CLEAR_ERRORS", () => {
  it("removes all errors", () => {
    const state: AppState = {
      ...fresh(),
      errors: [{ code: "no-face", message: "a" }, { code: "multi-face", message: "b" }],
    };
    expect(appReducer(state, { type: "CLEAR_ERRORS" }).errors).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Immutability
// ---------------------------------------------------------------------------
describe("immutability", () => {
  it("never mutates the previous state object", () => {
    const state = fresh();
    const frozen = Object.freeze({ ...state, ui: Object.freeze({ ...state.ui }) });
    expect(() => appReducer(frozen as AppState, { type: "SET_ZOOM", zoom: 2 })).not.toThrow();
  });
});
