/**
 * Integration: computeFitView × toScreen
 *
 * computeFitView produces zoom/panX/panY values. toScreen consumes them via
 * ViewTransform to place points on the canvas. These tests verify that the
 * two functions compose correctly: a face centre passed through computeFitView
 * and then toScreen lands at the canvas centre, end-to-end.
 */
import { describe, it, expect } from "vitest";
import { computeFitView } from "@/geometry/fitView";
import { toScreen, type ViewTransform } from "@/rendering/draw";

const ORIGINAL_W = 2000;
const ORIGINAL_H = 3000;
const WORKING_W = 800;
const WORKING_H = 1200;
const CANVAS_W = 600;
const CANVAS_H = 800;
const DPR = 1; // keep device pixel ratio at 1 so CSS px == device px in tests

function makeView(zoom: number, panX: number, panY: number): ViewTransform {
  return {
    zoom,
    panX,
    panY,
    bitmapToOriginalScale: ORIGINAL_W / WORKING_W,
    dpr: DPR,
  };
}

describe("computeFitView → toScreen: face centre lands at canvas centre", () => {
  it("centre of a typical portrait face maps to canvas centre", () => {
    const face = { x: 800, y: 600, width: 400, height: 500 };
    const { zoom, panX, panY } = computeFitView(
      face, ORIGINAL_W, ORIGINAL_H, WORKING_W, WORKING_H, CANVAS_W, CANVAS_H,
    );
    const view = makeView(zoom, panX, panY);

    const faceCentreOriginal = {
      x: face.x + face.width / 2,
      y: face.y + face.height / 2,
    };

    const screen = toScreen(faceCentreOriginal, view);

    // toScreen outputs device pixels (× dpr); with dpr=1 these equal CSS px
    expect(screen.x).toBeCloseTo(CANVAS_W / 2, 2);
    expect(screen.y).toBeCloseTo(CANVAS_H / 2, 2);
  });

  it("works for a face positioned in the top-left quadrant", () => {
    const face = { x: 100, y: 100, width: 300, height: 400 };
    const { zoom, panX, panY } = computeFitView(
      face, ORIGINAL_W, ORIGINAL_H, WORKING_W, WORKING_H, CANVAS_W, CANVAS_H,
    );
    const view = makeView(zoom, panX, panY);
    const screen = toScreen(
      { x: face.x + face.width / 2, y: face.y + face.height / 2 },
      view,
    );
    expect(screen.x).toBeCloseTo(CANVAS_W / 2, 2);
    expect(screen.y).toBeCloseTo(CANVAS_H / 2, 2);
  });

  it("works for a face positioned in the bottom-right quadrant", () => {
    const face = { x: 1600, y: 2500, width: 300, height: 400 };
    const { zoom, panX, panY } = computeFitView(
      face, ORIGINAL_W, ORIGINAL_H, WORKING_W, WORKING_H, CANVAS_W, CANVAS_H,
    );
    const view = makeView(zoom, panX, panY);
    const screen = toScreen(
      { x: face.x + face.width / 2, y: face.y + face.height / 2 },
      view,
    );
    expect(screen.x).toBeCloseTo(CANVAS_W / 2, 2);
    expect(screen.y).toBeCloseTo(CANVAS_H / 2, 2);
  });

  it("holds for dpr=2 (retina display) — canvas centre in device px", () => {
    const face = { x: 800, y: 600, width: 400, height: 500 };
    const dpr = 2;
    const { zoom, panX, panY } = computeFitView(
      face, ORIGINAL_W, ORIGINAL_H, WORKING_W, WORKING_H, CANVAS_W, CANVAS_H,
    );
    const view: ViewTransform = {
      ...makeView(zoom, panX, panY),
      dpr,
    };
    const screen = toScreen(
      { x: face.x + face.width / 2, y: face.y + face.height / 2 },
      view,
    );
    // toScreen multiplies by dpr, so canvas centre in device px = (CSS centre) × dpr
    expect(screen.x).toBeCloseTo((CANVAS_W / 2) * dpr, 2);
    expect(screen.y).toBeCloseTo((CANVAS_H / 2) * dpr, 2);
  });

  it("zoom cap (4×) does not break centering for a tiny face", () => {
    const tinyFace = { x: 1000, y: 1500, width: 5, height: 5 };
    const { zoom, panX, panY } = computeFitView(
      tinyFace, ORIGINAL_W, ORIGINAL_H, WORKING_W, WORKING_H, CANVAS_W, CANVAS_H,
    );
    expect(zoom).toBe(4); // should hit the cap

    const view = makeView(zoom, panX, panY);
    const screen = toScreen(
      { x: tinyFace.x + tinyFace.width / 2, y: tinyFace.y + tinyFace.height / 2 },
      view,
    );
    expect(screen.x).toBeCloseTo(CANVAS_W / 2, 2);
    expect(screen.y).toBeCloseTo(CANVAS_H / 2, 2);
  });
});

describe("computeFitView → toScreen: face remains visible after fit", () => {
  it("face bounding box top-left maps to a point within the canvas", () => {
    const face = { x: 800, y: 600, width: 400, height: 500 };
    const { zoom, panX, panY } = computeFitView(
      face, ORIGINAL_W, ORIGINAL_H, WORKING_W, WORKING_H, CANVAS_W, CANVAS_H,
    );
    const view = makeView(zoom, panX, panY);
    const tl = toScreen({ x: face.x, y: face.y }, view);
    const br = toScreen({ x: face.x + face.width, y: face.y + face.height }, view);

    // With dpr=1 the canvas device-pixel extents equal CSS extents
    expect(tl.x).toBeGreaterThan(0);
    expect(tl.y).toBeGreaterThan(0);
    expect(br.x).toBeLessThan(CANVAS_W);
    expect(br.y).toBeLessThan(CANVAS_H);
  });
});
