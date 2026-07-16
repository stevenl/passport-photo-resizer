import { describe, it, expect } from "vitest";
import {
  estimateChin,
  estimateCrown,
  estimateCrownFallback,
  estimateChinFallback,
  isCrownEstimateStable,
} from "./chinCrown";

const IMAGE_BOUNDS = { x: 0, y: 0, width: 1000, height: 1500 };

// ---------------------------------------------------------------------------
// estimateChin
// ---------------------------------------------------------------------------
describe("estimateChin", () => {
  it("throws on an empty array", () => {
    expect(() => estimateChin([])).toThrow();
  });

  it("returns the single point when given one point", () => {
    expect(estimateChin([{ x: 50, y: 300 }])).toEqual({ x: 50, y: 300 });
  });

  it("averages the bottom 3 points by y", () => {
    const points = [
      { x: 100, y: 100 },
      { x: 110, y: 105 },
      { x: 200, y: 300 }, // bottom-3
      { x: 210, y: 310 }, // bottom-3
      { x: 205, y: 320 }, // bottom-3
    ];
    const result = estimateChin(points);
    expect(result.x).toBeCloseTo((200 + 210 + 205) / 3);
    expect(result.y).toBeCloseTo((300 + 310 + 320) / 3);
  });

  it("with only 2 points, averages both", () => {
    const points = [{ x: 100, y: 200 }, { x: 200, y: 300 }];
    const result = estimateChin(points);
    expect(result.x).toBeCloseTo(150);
    expect(result.y).toBeCloseTo(250);
  });

  it("caps at 3 points even when many are provided", () => {
    // 10 points, y values 0,20,40…180. Bottom 3: y=180,160,140
    const points = Array.from({ length: 10 }, (_, i) => ({ x: i * 10, y: i * 20 }));
    const result = estimateChin(points);
    expect(result.y).toBeCloseTo((180 + 160 + 140) / 3);
  });

  it("does not mutate the input array", () => {
    const points = [{ x: 10, y: 50 }, { x: 20, y: 40 }];
    const original = points.map((p) => ({ ...p }));
    estimateChin(points);
    expect(points).toEqual(original);
  });
});

// ---------------------------------------------------------------------------
// estimateCrown
// ---------------------------------------------------------------------------
describe("estimateCrown", () => {
  const leftEye = { x: 400, y: 500 };
  const rightEye = { x: 600, y: 500 };
  const noseTip = { x: 500, y: 700 }; // face axis points down
  const faceHeightPx = 300;

  it("returns a point above the eye midpoint for an upright face", () => {
    const crown = estimateCrown(leftEye, rightEye, noseTip, {
      imageBounds: IMAGE_BOUNDS,
      faceHeightPx,
    });
    expect(crown.y).toBeLessThan(500);
  });

  it("x is on the horizontal midpoint for a symmetric face", () => {
    const crown = estimateCrown(leftEye, rightEye, noseTip, {
      imageBounds: IMAGE_BOUNDS,
      faceHeightPx,
    });
    // Face axis is vertical so crown x == forehead base x == 500
    expect(crown.x).toBeCloseTo(500, 0);
  });

  it("clamps the result within imageBounds", () => {
    // Eyes near the top — projection goes above the image
    const crown = estimateCrown(
      { x: 400, y: 10 }, { x: 600, y: 10 }, { x: 500, y: 210 },
      { imageBounds: IMAGE_BOUNDS, faceHeightPx: 200, k: 0.9 },
    );
    expect(crown.y).toBeGreaterThanOrEqual(IMAGE_BOUNDS.y);
    expect(crown.x).toBeGreaterThanOrEqual(IMAGE_BOUNDS.x);
  });

  it("larger k projects further upward (smaller y)", () => {
    const low = estimateCrown(leftEye, rightEye, noseTip, {
      imageBounds: IMAGE_BOUNDS, faceHeightPx, k: 0.4,
    });
    const high = estimateCrown(leftEye, rightEye, noseTip, {
      imageBounds: IMAGE_BOUNDS, faceHeightPx, k: 0.9,
    });
    expect(high.y).toBeLessThan(low.y);
  });

  it("does not throw when the face axis is degenerate (nose at eye midpoint)", () => {
    expect(() =>
      estimateCrown(
        { x: 400, y: 500 }, { x: 600, y: 500 }, { x: 500, y: 500 },
        { imageBounds: IMAGE_BOUNDS, faceHeightPx: 300 },
      ),
    ).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// estimateCrownFallback
// ---------------------------------------------------------------------------
describe("estimateCrownFallback", () => {
  it("places crown above the bounding box top", () => {
    const box = { x: 300, y: 400, width: 200, height: 300 };
    const crown = estimateCrownFallback(box, 300);
    expect(crown.y).toBeLessThan(box.y);
  });

  it("centres horizontally within the bounding box", () => {
    const box = { x: 300, y: 400, width: 200, height: 300 };
    expect(estimateCrownFallback(box, 300).x).toBeCloseTo(400);
  });

  it("applies the supplied ratio", () => {
    const box = { x: 0, y: 500, width: 100, height: 400 };
    expect(estimateCrownFallback(box, 400, 0.1).y).toBeCloseTo(500 - 0.1 * 400);
  });
});

// ---------------------------------------------------------------------------
// estimateChinFallback
// ---------------------------------------------------------------------------
describe("estimateChinFallback", () => {
  it("produces the same result as estimateChin for the same input", () => {
    const pts = [{ x: 100, y: 300 }, { x: 110, y: 310 }, { x: 105, y: 320 }];
    expect(estimateChinFallback(pts)).toEqual(estimateChin(pts));
  });
});

// ---------------------------------------------------------------------------
// isCrownEstimateStable
// ---------------------------------------------------------------------------
describe("isCrownEstimateStable", () => {
  const leftEye = { x: 400, y: 500 };
  const rightEye = { x: 600, y: 500 };
  const noseTip = { x: 500, y: 700 };

  it("returns true for a stable crown above the face inside the image", () => {
    expect(
      isCrownEstimateStable({ x: 500, y: 300 }, IMAGE_BOUNDS, leftEye, rightEye, noseTip),
    ).toBe(true);
  });

  it("returns false when the face axis is degenerate", () => {
    // nose exactly at eye midpoint → zero axis
    expect(
      isCrownEstimateStable(
        { x: 500, y: 300 }, IMAGE_BOUNDS, leftEye, rightEye, { x: 500, y: 500 },
      ),
    ).toBe(false);
  });

  it("returns false when crown x is outside image bounds", () => {
    expect(
      isCrownEstimateStable({ x: -100, y: 300 }, IMAGE_BOUNDS, leftEye, rightEye, noseTip),
    ).toBe(false);
  });

  it("returns false when crown y is far above the image", () => {
    // Allowance is imageBounds.y - imageBounds.height = -1500; -2000 exceeds that
    expect(
      isCrownEstimateStable({ x: 500, y: -2000 }, IMAGE_BOUNDS, leftEye, rightEye, noseTip),
    ).toBe(false);
  });
});
