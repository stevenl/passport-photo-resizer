import { describe, it, expect } from "vitest";
import { computeFitView } from "./fitView";

// Standard test scenario: 2000×3000 original, 800×1200 working (scale=2.5),
// face box in original coords, 600×800 canvas.
const ORIGINAL_W = 2000;
const ORIGINAL_H = 3000;
const WORKING_W = 800;
const WORKING_H = 1200;
const CANVAS_W = 600;
const CANVAS_H = 800;
const FACE_BOX = { x: 800, y: 600, width: 400, height: 500 }; // original coords

describe("computeFitView — guard rails", () => {
  it("returns identity when original dimensions are 0", () => {
    const r = computeFitView(FACE_BOX, 0, 0, WORKING_W, WORKING_H, CANVAS_W, CANVAS_H);
    expect(r).toEqual({ zoom: 1, panX: 0, panY: 0 });
  });

  it("returns identity when working dimensions are 0", () => {
    const r = computeFitView(FACE_BOX, ORIGINAL_W, ORIGINAL_H, 0, 0, CANVAS_W, CANVAS_H);
    expect(r).toEqual({ zoom: 1, panX: 0, panY: 0 });
  });

  it("returns identity when canvas dimensions are 0", () => {
    const r = computeFitView(FACE_BOX, ORIGINAL_W, ORIGINAL_H, WORKING_W, WORKING_H, 0, 0);
    expect(r).toEqual({ zoom: 1, panX: 0, panY: 0 });
  });
});

describe("computeFitView — zoom", () => {
  it("produces a positive zoom value", () => {
    const { zoom } = computeFitView(FACE_BOX, ORIGINAL_W, ORIGINAL_H, WORKING_W, WORKING_H, CANVAS_W, CANVAS_H);
    expect(zoom).toBeGreaterThan(0);
  });

  it("caps zoom at 4× regardless of a tiny face", () => {
    // 10×10 face in a 2000×3000 image — would produce a huge zoom without the cap
    const tinyFace = { x: 1000, y: 1000, width: 10, height: 10 };
    const { zoom } = computeFitView(tinyFace, ORIGINAL_W, ORIGINAL_H, WORKING_W, WORKING_H, CANVAS_W, CANVAS_H);
    expect(zoom).toBeLessThanOrEqual(4);
  });

  it("produces a smaller zoom for a face that already fills most of the original image", () => {
    const largeFace = { x: 0, y: 0, width: ORIGINAL_W, height: ORIGINAL_H };
    const { zoom: zoomLarge } = computeFitView(largeFace, ORIGINAL_W, ORIGINAL_H, WORKING_W, WORKING_H, CANVAS_W, CANVAS_H);
    const { zoom: zoomNormal } = computeFitView(FACE_BOX, ORIGINAL_W, ORIGINAL_H, WORKING_W, WORKING_H, CANVAS_W, CANVAS_H);
    expect(zoomLarge).toBeLessThan(zoomNormal);
  });

  it("a larger canvas produces a larger zoom for the same face", () => {
    const { zoom: smallCanvas } = computeFitView(FACE_BOX, ORIGINAL_W, ORIGINAL_H, WORKING_W, WORKING_H, 300, 400);
    const { zoom: largeCanvas } = computeFitView(FACE_BOX, ORIGINAL_W, ORIGINAL_H, WORKING_W, WORKING_H, 900, 1200);
    expect(largeCanvas).toBeGreaterThan(smallCanvas);
  });
});

describe("computeFitView — centering", () => {
  it("places the face centre at the canvas centre", () => {
    const { zoom, panX, panY } = computeFitView(FACE_BOX, ORIGINAL_W, ORIGINAL_H, WORKING_W, WORKING_H, CANVAS_W, CANVAS_H);

    // bitmapToOriginalScale = ORIGINAL_W / WORKING_W = 2.5
    const scale = ORIGINAL_W / WORKING_W;
    const faceCentreWorkingX = (FACE_BOX.x + FACE_BOX.width / 2) / scale;
    const faceCentreWorkingY = (FACE_BOX.y + FACE_BOX.height / 2) / scale;

    // screenX = faceCentreWorkingX * zoom + panX  should equal CANVAS_W / 2
    expect(faceCentreWorkingX * zoom + panX).toBeCloseTo(CANVAS_W / 2, 4);
    expect(faceCentreWorkingY * zoom + panY).toBeCloseTo(CANVAS_H / 2, 4);
  });

  it("a face at the top-left produces a positive pan offset", () => {
    const topLeftFace = { x: 0, y: 0, width: 200, height: 200 };
    const { panX, panY } = computeFitView(topLeftFace, ORIGINAL_W, ORIGINAL_H, WORKING_W, WORKING_H, CANVAS_W, CANVAS_H);
    // Face centre is near (0,0) in working coords; panning must push it right/down
    expect(panX).toBeGreaterThan(0);
    expect(panY).toBeGreaterThan(0);
  });

  it("a face at the bottom-right produces a negative pan offset", () => {
    const bottomRightFace = { x: ORIGINAL_W - 200, y: ORIGINAL_H - 200, width: 200, height: 200 };
    const { panX, panY } = computeFitView(bottomRightFace, ORIGINAL_W, ORIGINAL_H, WORKING_W, WORKING_H, CANVAS_W, CANVAS_H);
    expect(panX).toBeLessThan(0);
    expect(panY).toBeLessThan(0);
  });

  it("a face at the image centre produces pan values that put it at the canvas centre", () => {
    const centredFace = {
      x: ORIGINAL_W / 2 - 100,
      y: ORIGINAL_H / 2 - 125,
      width: 200,
      height: 250,
    };
    const { zoom, panX, panY } = computeFitView(centredFace, ORIGINAL_W, ORIGINAL_H, WORKING_W, WORKING_H, CANVAS_W, CANVAS_H);
    const scale = ORIGINAL_W / WORKING_W;
    const cx = (centredFace.x + centredFace.width / 2) / scale;
    const cy = (centredFace.y + centredFace.height / 2) / scale;
    expect(cx * zoom + panX).toBeCloseTo(CANVAS_W / 2, 3);
    expect(cy * zoom + panY).toBeCloseTo(CANVAS_H / 2, 3);
  });
});

describe("computeFitView — working/original scale", () => {
  it("produces the same screen result regardless of working image resolution", () => {
    // Same original image, two different working-copy resolutions
    const r1 = computeFitView(FACE_BOX, ORIGINAL_W, ORIGINAL_H, 800, 1200, CANVAS_W, CANVAS_H);
    const r2 = computeFitView(FACE_BOX, ORIGINAL_W, ORIGINAL_H, 400, 600, CANVAS_W, CANVAS_H);
    // Same logical face → same pan (face coords are in original space)
    expect(r1.panX).toBeCloseTo(r2.panX, 6);
    expect(r1.panY).toBeCloseTo(r2.panY, 6);
    expect((FACE_BOX.width / (ORIGINAL_W / 800)) * r1.zoom)
        .toBeCloseTo((FACE_BOX.width / (ORIGINAL_W / 400)) * r2.zoom, 6);
  });
});
