import { describe, it, expect } from "vitest";
import {
  distance, midpoint, subtract, add, scaleVec, length, normalize,
  clampPoint, clamp, isWithinHitRadius, exponentialSmooth, boundingBoxOf,
} from "./primitives";

describe("distance", () => {
  it("returns 0 for identical points", () => {
    expect(distance({ x: 3, y: 4 }, { x: 3, y: 4 })).toBe(0);
  });
  it("computes the 3-4-5 right triangle", () => {
    expect(distance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5);
  });
  it("is symmetric", () => {
    expect(distance({ x: 1, y: 2 }, { x: 5, y: 6 })).toBeCloseTo(
      distance({ x: 5, y: 6 }, { x: 1, y: 2 }),
    );
  });
  it("handles negative coordinates", () => {
    expect(distance({ x: -3, y: 0 }, { x: 0, y: 4 })).toBe(5);
  });
});

describe("midpoint", () => {
  it("returns the centre of two points", () => {
    expect(midpoint({ x: 0, y: 0 }, { x: 10, y: 20 })).toEqual({ x: 5, y: 10 });
  });
  it("returns the same point when both inputs are identical", () => {
    expect(midpoint({ x: 7, y: 3 }, { x: 7, y: 3 })).toEqual({ x: 7, y: 3 });
  });
  it("works with negative coordinates", () => {
    expect(midpoint({ x: -10, y: -4 }, { x: 10, y: 4 })).toEqual({ x: 0, y: 0 });
  });
});

describe("subtract", () => {
  it("subtracts component-wise", () => {
    expect(subtract({ x: 10, y: 7 }, { x: 3, y: 2 })).toEqual({ x: 7, y: 5 });
  });
  it("returns zero vector for identical points", () => {
    expect(subtract({ x: 5, y: 5 }, { x: 5, y: 5 })).toEqual({ x: 0, y: 0 });
  });
  it("can produce negative components", () => {
    expect(subtract({ x: 1, y: 1 }, { x: 5, y: 3 })).toEqual({ x: -4, y: -2 });
  });
});

describe("add", () => {
  it("adds two points component-wise", () => {
    expect(add({ x: 3, y: 4 }, { x: 1, y: 2 })).toEqual({ x: 4, y: 6 });
  });
  it("adding zero vector is identity", () => {
    expect(add({ x: 7, y: -2 }, { x: 0, y: 0 })).toEqual({ x: 7, y: -2 });
  });
  it("add and subtract are inverse operations", () => {
    const a = { x: 5, y: 10 };
    const b = { x: 3, y: 7 };
    expect(subtract(add(a, b), b)).toEqual(a);
  });
});

describe("scaleVec", () => {
  it("scales a vector by a scalar", () => {
    expect(scaleVec({ x: 3, y: 4 }, 2)).toEqual({ x: 6, y: 8 });
  });
  it("scaling by 0 returns the zero vector", () => {
    expect(scaleVec({ x: 100, y: 200 }, 0)).toEqual({ x: 0, y: 0 });
  });
  it("scaling by 1 is identity", () => {
    expect(scaleVec({ x: 5, y: -3 }, 1)).toEqual({ x: 5, y: -3 });
  });
  it("scaling by -1 flips direction", () => {
    expect(scaleVec({ x: 4, y: -2 }, -1)).toEqual({ x: -4, y: 2 });
  });
});

describe("length", () => {
  it("returns 0 for the zero vector", () => {
    expect(length({ x: 0, y: 0 })).toBe(0);
  });
  it("returns the correct magnitude", () => {
    expect(length({ x: 3, y: 4 })).toBe(5);
  });
  it("matches distance from the origin", () => {
    const v = { x: 6, y: 8 };
    expect(length(v)).toBeCloseTo(distance({ x: 0, y: 0 }, v));
  });
});

describe("normalize", () => {
  it("produces a unit vector (length ≈ 1)", () => {
    expect(length(normalize({ x: 3, y: 4 }))).toBeCloseTo(1);
  });
  it("preserves direction for a vertical vector", () => {
    const n = normalize({ x: 0, y: 5 });
    expect(n.x).toBeCloseTo(0);
    expect(n.y).toBeCloseTo(1);
  });
  it("returns {0,0} for the zero vector without throwing", () => {
    expect(normalize({ x: 0, y: 0 })).toEqual({ x: 0, y: 0 });
  });
  it("works for a negative horizontal vector", () => {
    const n = normalize({ x: -7, y: 0 });
    expect(n.x).toBeCloseTo(-1);
    expect(n.y).toBeCloseTo(0);
  });
});

describe("clampPoint", () => {
  const bounds = { x: 10, y: 20, width: 100, height: 200 };

  it("leaves an interior point unchanged", () => {
    expect(clampPoint({ x: 50, y: 100 }, bounds)).toEqual({ x: 50, y: 100 });
  });
  it("clamps a point above and to the left", () => {
    expect(clampPoint({ x: -5, y: 0 }, bounds)).toEqual({ x: 10, y: 20 });
  });
  it("clamps a point below and to the right", () => {
    expect(clampPoint({ x: 200, y: 300 }, bounds)).toEqual({ x: 110, y: 220 });
  });
  it("clamps each axis independently", () => {
    const r = clampPoint({ x: 5, y: 300 }, bounds);
    expect(r.x).toBe(10);
    expect(r.y).toBe(220);
  });
  it("allows points exactly on the boundary", () => {
    expect(clampPoint({ x: 10, y: 20 }, bounds)).toEqual({ x: 10, y: 20 });
    expect(clampPoint({ x: 110, y: 220 }, bounds)).toEqual({ x: 110, y: 220 });
  });
});

describe("clamp", () => {
  it("returns the value when within range", () => {
    expect(clamp(5, 0, 10)).toBe(5);
  });
  it("clamps to min", () => {
    expect(clamp(-3, 0, 10)).toBe(0);
  });
  it("clamps to max", () => {
    expect(clamp(15, 0, 10)).toBe(10);
  });
  it("returns min when value equals min", () => {
    expect(clamp(0, 0, 10)).toBe(0);
  });
  it("returns max when value equals max", () => {
    expect(clamp(10, 0, 10)).toBe(10);
  });
});

describe("isWithinHitRadius", () => {
  it("returns true for coincident points", () => {
    expect(isWithinHitRadius({ x: 5, y: 5 }, { x: 5, y: 5 })).toBe(true);
  });
  it("returns true when distance < default radius (10)", () => {
    // distance = 5 < 10
    expect(isWithinHitRadius({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(true);
  });
  it("returns false when distance > default radius", () => {
    // distance = 15 > 10
    expect(isWithinHitRadius({ x: 0, y: 0 }, { x: 9, y: 12 })).toBe(false);
  });
  it("respects a custom radius", () => {
    expect(isWithinHitRadius({ x: 0, y: 0 }, { x: 3, y: 4 }, 4)).toBe(false);
    expect(isWithinHitRadius({ x: 0, y: 0 }, { x: 3, y: 4 }, 6)).toBe(true);
  });
  it("boundary is exclusive (strict <)", () => {
    // distance = 10 exactly, radius = 10 → NOT within
    expect(isWithinHitRadius({ x: 0, y: 0 }, { x: 6, y: 8 }, 10)).toBe(false);
  });
});

describe("exponentialSmooth", () => {
  it("returns current when previous is null", () => {
    const p = { x: 5, y: 10 };
    expect(exponentialSmooth(p, null)).toEqual(p);
  });
  it("with alpha=1 returns current exactly", () => {
    expect(exponentialSmooth({ x: 10, y: 20 }, { x: 0, y: 0 }, 1)).toEqual({ x: 10, y: 20 });
  });
  it("with alpha=0 returns previous exactly", () => {
    expect(exponentialSmooth({ x: 10, y: 20 }, { x: 0, y: 0 }, 0)).toEqual({ x: 0, y: 0 });
  });
  it("interpolates correctly at alpha=0.6", () => {
    // 0.6*10 + 0.4*0 = 6
    const r = exponentialSmooth({ x: 10, y: 10 }, { x: 0, y: 0 }, 0.6);
    expect(r.x).toBeCloseTo(6);
    expect(r.y).toBeCloseTo(6);
  });
});

describe("boundingBoxOf", () => {
  it("returns a zero box for an empty array", () => {
    expect(boundingBoxOf([])).toEqual({ x: 0, y: 0, width: 0, height: 0 });
  });
  it("returns a zero-size box for a single point", () => {
    expect(boundingBoxOf([{ x: 3, y: 7 }])).toEqual({ x: 3, y: 7, width: 0, height: 0 });
  });
  it("computes the correct bounding box for multiple points", () => {
    const pts = [{ x: 1, y: 5 }, { x: 8, y: 2 }, { x: 4, y: 9 }];
    expect(boundingBoxOf(pts)).toEqual({ x: 1, y: 2, width: 7, height: 7 });
  });
  it("handles negative coordinates", () => {
    expect(boundingBoxOf([{ x: -5, y: -10 }, { x: 5, y: 10 }])).toEqual(
      { x: -5, y: -10, width: 10, height: 20 },
    );
  });
  it("collinear horizontal points give height 0", () => {
    const pts = [{ x: 0, y: 4 }, { x: 3, y: 4 }, { x: 7, y: 4 }];
    expect(boundingBoxOf(pts)).toEqual({ x: 0, y: 4, width: 7, height: 0 });
  });
});
