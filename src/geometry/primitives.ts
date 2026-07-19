import type { Point, Rect } from "@/types";

/** Euclidean distance between two points. */
export function distance(a: Point, b: Point): number {
  return Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2);
}

export function midpoint(a: Point, b: Point): Point {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

export function subtract(a: Point, b: Point): Point {
  return { x: a.x - b.x, y: a.y - b.y };
}

export function add(a: Point, b: Point): Point {
  return { x: a.x + b.x, y: a.y + b.y };
}

export function scaleVec(v: Point, s: number): Point {
  return { x: v.x * s, y: v.y * s };
}

export function length(v: Point): number {
  return Math.sqrt(v.x * v.x + v.y * v.y);
}

/** Normalizes a vector to unit length. Returns {0,0} for a zero-length vector. */
export function normalize(v: Point): Point {
  const len = length(v);
  if (len === 0) return { x: 0, y: 0 };
  return { x: v.x / len, y: v.y / len };
}

export function clampPoint(p: Point, bounds: Rect): Point {
  return {
    x: Math.min(Math.max(p.x, bounds.x), bounds.x + bounds.width),
    y: Math.min(Math.max(p.y, bounds.y), bounds.y + bounds.height),
  };
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/** Pixel-distance hit test, per architecture.md section 6.3. */
export function isWithinHitRadius(pointer: Point, marker: Point, radiusPx = 10): boolean {
  return distance(pointer, marker) < radiusPx;
}

/** Exponential smoothing for landmark jitter reduction, per face-detection spec 11.1. */
export function exponentialSmooth(current: Point, previous: Point | null, alpha = 0.6): Point {
  if (!previous) return current;
  return {
    x: alpha * current.x + (1 - alpha) * previous.x,
    y: alpha * current.y + (1 - alpha) * previous.y,
  };
}

export function boundingBoxOf(points: Point[]): Rect {
  if (points.length === 0) return { x: 0, y: 0, width: 0, height: 0 };
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of points) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}
