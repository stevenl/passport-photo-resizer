import type { Point, Rect } from "@/types";
import { add, midpoint, normalize, scaleVec, subtract, clampPoint } from "./primitives";

/**
 * MediaPipe Face Landmarker (468-point mesh) jawline contour indices,
 * per face-detection-spec.md §3.2 and §4.2.
 * This is the lower jaw contour from one side of the face to the other,
 * passing through the chin region.
 */
export const JAWLINE_INDICES = [
  234, 93, 132, 58, 172, 136, 150, 149, 176, 148, 152, 377, 400, 378, 379, 365,
  397, 288, 361, 323, 454,
];

/** Left/right eye corner indices used to compute eye-center points. */
export const LEFT_EYE_CORNER_INDICES = [33, 133]; // outer, inner
export const RIGHT_EYE_CORNER_INDICES = [362, 263]; // inner, outer
export const NOSE_TIP_INDEX = 1;

/**
 * Chin Detection Algorithm — face-detection-spec.md §4.
 *
 * Problem: MediaPipe does not expose an explicit "chin tip" landmark.
 * Solution: take the jawline contour, find the point(s) with the
 * maximum Y (lowest on screen, since Y increases downward), and average
 * the bottom 3 to reduce jitter.
 */
export function estimateChin(jawlinePoints: Point[]): Point {
  if (jawlinePoints.length === 0) {
    throw new Error("estimateChin: jawlinePoints must not be empty");
  }

  const sortedByY = [...jawlinePoints].sort((a, b) => b.y - a.y);
  const bottomThree = sortedByY.slice(0, Math.min(3, sortedByY.length));

  const sum = bottomThree.reduce((acc, p) => add(acc, p), { x: 0, y: 0 });
  return {
    x: sum.x / bottomThree.length,
    y: sum.y / bottomThree.length,
  };
}

export interface CrownEstimationOptions {
  /**
   * Calibrated projection constant, face-detection-spec.md §5.2 step 3.
   * Range 0.6–0.9 × face height; defaults to the midpoint of that range.
   */
  k?: number;
  /** Image bounds used to clamp the projected crown point within frame. */
  imageBounds: Rect;
  /** Face bounding box height, used to scale `k`. */
  faceHeightPx: number;
}

/**
 * Crown (top-of-head) Detection — face-detection-spec.md §5.
 *
 * Problem: no skull-top landmark exists in the MediaPipe mesh.
 * Solution: "Forehead Projection Method" —
 *   1. forehead_base = midpoint(leftEye, rightEye)
 *   2. face_axis = normalize(noseTip - forehead_base)   [points DOWN the face]
 *   3. crown = forehead_base - face_axis * k            [project UPWARD]
 *   4. clamp within image bounds
 */
export function estimateCrown(
  leftEye: Point,
  rightEye: Point,
  noseTip: Point,
  options: CrownEstimationOptions,
): Point {
  const { k = 0.75, imageBounds, faceHeightPx } = options;

  const foreheadBase = midpoint(leftEye, rightEye);
  const faceAxis = normalize(subtract(noseTip, foreheadBase));

  // Guard against a degenerate axis (e.g. eyes and nose coincide).
  const safeAxis = faceAxis.x === 0 && faceAxis.y === 0 ? { x: 0, y: 1 } : faceAxis;

  const projectionDistance = k * faceHeightPx;
  const crownRaw = subtract(foreheadBase, scaleVec(safeAxis, projectionDistance));

  return clampPoint(crownRaw, imageBounds);
}

/**
 * Fallback crown estimation when the primary method is judged unstable,
 * per face-detection-spec.md §14: "bounding box top + offset
 * ratio (0.15–0.25 of face height)".
 */
export function estimateCrownFallback(
  boundingBox: Rect,
  faceHeightPx: number,
  ratio = 0.2,
): Point {
  return {
    x: boundingBox.x + boundingBox.width / 2,
    y: boundingBox.y - ratio * faceHeightPx,
  };
}

/**
 * Fallback chin estimation when the jaw curve is unstable, per
 * face-detection-spec.md §14: "lowest jawline cluster average".
 * Functionally identical to estimateChin but exposed separately so the
 * call site can express *which* path was taken (for diagnostics/UX).
 */
export function estimateChinFallback(jawlinePoints: Point[]): Point {
  return estimateChin(jawlinePoints);
}

/**
 * Sanity check used to decide whether the primary crown estimate should be
 * discarded in favor of the fallback — e.g. if it lands outside a
 * generously padded image area even after clamping, or the face axis was
 * degenerate (nose directly atop the eye midpoint).
 */
export function isCrownEstimateStable(
  crown: Point,
  imageBounds: Rect,
  leftEye: Point,
  rightEye: Point,
  noseTip: Point,
): boolean {
  const foreheadBase = midpoint(leftEye, rightEye);
  const faceAxis = subtract(noseTip, foreheadBase);
  const degenerateAxis = Math.abs(faceAxis.x) < 1e-6 && Math.abs(faceAxis.y) < 1e-6;
  if (degenerateAxis) return false;

  const withinBounds =
    crown.x >= imageBounds.x &&
    crown.x <= imageBounds.x + imageBounds.width &&
    crown.y >= imageBounds.y - imageBounds.height && // allow some headroom above frame pre-clamp
    crown.y <= imageBounds.y + imageBounds.height;

  return withinBounds;
}
