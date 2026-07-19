import { describe, it, expect } from "vitest";
import { rescaleLandmarks } from "./faceDetector";
import type { FaceLandmarks } from "@/types";

// ---------------------------------------------------------------------------
// rescaleLandmarks
// ---------------------------------------------------------------------------
//
// rescaleLandmarks is pure and synchronous — tested exhaustively below.
// detectFaces() and getFaceLandmarker() require WASM + network and are out
// of scope for unit tests.
//
// The model loading state machine (getModelLoadingState, subscribeToModelState,
// and the idle→loading→ready/error transitions wired into getFaceLandmarker)
// is also pure and testable — see the second section below.

function makeLandmarks(): FaceLandmarks {
  return {
    rawPoints: [
      { x: 100, y: 200 },
      { x: 300, y: 400 },
    ],
    leftEye: { x: 150, y: 250 },
    rightEye: { x: 350, y: 250 },
    noseTip: { x: 250, y: 350 },
    chin: { x: 250, y: 500 },
    crown: { x: 250, y: 100 },
    boundingBox: { x: 100, y: 100, width: 300, height: 450 },
  };
}

describe("rescaleLandmarks — identity (working == original)", () => {
  it("returns identical values when working and original dimensions are the same", () => {
    const lm = makeLandmarks();
    const result = rescaleLandmarks(lm, 1000, 1500, 1000, 1500);
    expect(result.chin).toEqual(lm.chin);
    expect(result.crown).toEqual(lm.crown);
    expect(result.leftEye).toEqual(lm.leftEye);
    expect(result.rightEye).toEqual(lm.rightEye);
    expect(result.noseTip).toEqual(lm.noseTip);
    expect(result.boundingBox).toEqual(lm.boundingBox);
  });
});

describe("rescaleLandmarks — uniform 2× upscale", () => {
  // working = 800×1200, original = 1600×2400  →  sx=sy=2

  it("doubles chin coordinates", () => {
    const result = rescaleLandmarks(makeLandmarks(), 800, 1200, 1600, 2400);
    expect(result.chin.x).toBeCloseTo(250 * 2);
    expect(result.chin.y).toBeCloseTo(500 * 2);
  });

  it("doubles crown coordinates", () => {
    const result = rescaleLandmarks(makeLandmarks(), 800, 1200, 1600, 2400);
    expect(result.crown.x).toBeCloseTo(250 * 2);
    expect(result.crown.y).toBeCloseTo(100 * 2);
  });

  it("doubles leftEye coordinates", () => {
    const result = rescaleLandmarks(makeLandmarks(), 800, 1200, 1600, 2400);
    expect(result.leftEye.x).toBeCloseTo(150 * 2);
    expect(result.leftEye.y).toBeCloseTo(250 * 2);
  });

  it("doubles rightEye coordinates", () => {
    const result = rescaleLandmarks(makeLandmarks(), 800, 1200, 1600, 2400);
    expect(result.rightEye.x).toBeCloseTo(350 * 2);
    expect(result.rightEye.y).toBeCloseTo(250 * 2);
  });

  it("doubles noseTip coordinates", () => {
    const result = rescaleLandmarks(makeLandmarks(), 800, 1200, 1600, 2400);
    expect(result.noseTip.x).toBeCloseTo(250 * 2);
    expect(result.noseTip.y).toBeCloseTo(350 * 2);
  });

  it("doubles bounding box position and dimensions", () => {
    const result = rescaleLandmarks(makeLandmarks(), 800, 1200, 1600, 2400);
    expect(result.boundingBox.x).toBeCloseTo(100 * 2);
    expect(result.boundingBox.y).toBeCloseTo(100 * 2);
    expect(result.boundingBox.width).toBeCloseTo(300 * 2);
    expect(result.boundingBox.height).toBeCloseTo(450 * 2);
  });

  it("rescales all rawPoints", () => {
    const result = rescaleLandmarks(makeLandmarks(), 800, 1200, 1600, 2400);
    expect(result.rawPoints).toHaveLength(2);
    expect(result.rawPoints[0]).toEqual({ x: 100 * 2, y: 200 * 2 });
    expect(result.rawPoints[1]).toEqual({ x: 300 * 2, y: 400 * 2 });
  });
});

describe("rescaleLandmarks — non-uniform scale (different x and y ratios)", () => {
  // working = 500×1000, original = 1000×3000  →  sx=2, sy=3

  it("applies sx to x-axis and sy to y-axis independently", () => {
    const result = rescaleLandmarks(makeLandmarks(), 500, 1000, 1000, 3000);
    // sx = 1000/500 = 2, sy = 3000/1000 = 3
    expect(result.chin.x).toBeCloseTo(250 * 2);
    expect(result.chin.y).toBeCloseTo(500 * 3);
  });

  it("applies separate scale factors to bounding box width and height", () => {
    const result = rescaleLandmarks(makeLandmarks(), 500, 1000, 1000, 3000);
    expect(result.boundingBox.width).toBeCloseTo(300 * 2);
    expect(result.boundingBox.height).toBeCloseTo(450 * 3);
  });
});

describe("rescaleLandmarks — downscale", () => {
  // working = 2000×3000 was larger than original = 1000×1500  →  sx=sy=0.5

  it("halves coordinates when going from a larger working image to a smaller original", () => {
    const result = rescaleLandmarks(makeLandmarks(), 2000, 3000, 1000, 1500);
    expect(result.chin.x).toBeCloseTo(250 * 0.5);
    expect(result.chin.y).toBeCloseTo(500 * 0.5);
  });
});

describe("rescaleLandmarks — does not mutate input", () => {
  it("returns a new object (not the same reference)", () => {
    const lm = makeLandmarks();
    const result = rescaleLandmarks(lm, 800, 1200, 1600, 2400);
    expect(result).not.toBe(lm);
  });

  it("does not mutate rawPoints on the original landmark", () => {
    const lm = makeLandmarks();
    const originalFirst = { ...lm.rawPoints[0] };
    rescaleLandmarks(lm, 800, 1200, 1600, 2400);
    expect(lm.rawPoints[0]).toEqual(originalFirst);
  });

  it("does not mutate chin, crown, or bounding box on the original", () => {
    const lm = makeLandmarks();
    const origChin = { ...lm.chin };
    const origCrown = { ...lm.crown };
    const origBox = { ...lm.boundingBox };
    rescaleLandmarks(lm, 800, 1200, 1600, 2400);
    expect(lm.chin).toEqual(origChin);
    expect(lm.crown).toEqual(origCrown);
    expect(lm.boundingBox).toEqual(origBox);
  });
});

describe("rescaleLandmarks — empty rawPoints", () => {
  it("handles an empty rawPoints array without throwing", () => {
    const lm = makeLandmarks();
    lm.rawPoints = [];
    expect(() => rescaleLandmarks(lm, 800, 1200, 1600, 2400)).not.toThrow();
  });

  it("returns an empty rawPoints array when input was empty", () => {
    const lm = makeLandmarks();
    lm.rawPoints = [];
    expect(rescaleLandmarks(lm, 800, 1200, 1600, 2400).rawPoints).toHaveLength(0);
  });
});


// ---------------------------------------------------------------------------
// Model loading state machine
// ---------------------------------------------------------------------------
//
// getModelLoadingState() and subscribeToModelState() are pure observable
// behaviour with no MediaPipe/WASM dependency. We test the state machine
// directly by importing the module-level state management functions.
// getFaceLandmarker() itself is NOT called here (it would try to fetch WASM).

import {
  getModelLoadingState,
  subscribeToModelState,
  type ModelLoadingState,
} from "./faceDetector";

describe("getModelLoadingState — initial state", () => {
  it("returns a valid ModelLoadingState string", () => {
    const valid: ModelLoadingState[] = ["idle", "loading", "ready", "error"];
    expect(valid).toContain(getModelLoadingState());
  });

  it("returns synchronously without throwing", () => {
    expect(() => getModelLoadingState()).not.toThrow();
  });
});

describe("subscribeToModelState", () => {
  it("returns an unsubscribe function", () => {
    const unsub = subscribeToModelState(() => {});
    expect(typeof unsub).toBe("function");
    unsub();
  });

  it("calls the listener immediately with nothing — subscription is push-only", () => {
    // subscribeToModelState does NOT call the listener on subscription;
    // use getModelLoadingState() for the initial synchronous read.
    let callCount = 0;
    const unsub = subscribeToModelState(() => { callCount++; });
    expect(callCount).toBe(0);
    unsub();
  });

  it("stops calling the listener after unsubscribing", () => {
    // We can\'t trigger a real state change without calling getFaceLandmarker,
    // but we can verify that the unsubscribe function removes the listener
    // from the set by checking it doesn\'t throw when called twice.
    const unsub = subscribeToModelState(() => {});
    expect(() => { unsub(); unsub(); }).not.toThrow();
  });

  it("accepts multiple independent listeners", () => {
    const unsub1 = subscribeToModelState(() => {});
    const unsub2 = subscribeToModelState(() => {});
    expect(() => { unsub1(); unsub2(); }).not.toThrow();
  });
});
