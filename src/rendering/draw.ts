import type { FaceLandmarks, GeometryResult, Rect, UiState } from "@/types";

const COLOR_INK = "#1C2230";
const COLOR_MEASURE = "#B8472F";
const COLOR_OK = "#3C6E52";
const COLOR_WARN = "#C08A1E";
const COLOR_GUIDE = "rgba(28, 34, 48, 0.35)";
const COLOR_CROP_DIM = "rgba(28, 34, 48, 0.55)";

export interface ViewTransform {
  /** Maps original-image coordinates to canvas/screen coordinates. */
  zoom: number;
  panX: number;
  panY: number;
  /** Scale from the bitmap actually being drawn (working image) to original coords. */
  bitmapToOriginalScale: number;
  /**
   * Device pixel ratio. The canvas backing store is sized in device
   * pixels (canvas.width = cssWidth * dpr) while `panX`/`panY`/pointer
   * events are all in CSS pixels, so every screen-space draw call must
   * multiply by `dpr` to land in the correct backing-store pixel.
   */
  dpr: number;
}

/**
 * Converts ORIGINAL image coordinates into device-pixel backing-store
 * coordinates, composing: original -> working-bitmap -> CSS pixel (via
 * pan/zoom) -> device pixel (via dpr). Every raw draw call (lineTo, arc,
 * strokeRect, etc.) operates directly on the device-pixel backing store
 * since `clearCanvas` resets the canvas transform to identity each frame,
 * so callers must use this — not raw CSS-pixel math — for anything drawn
 * outside of `drawWorkingImage` (which sets its own composed transform).
 */
function toScreen(
  point: { x: number; y: number },
  view: ViewTransform,
): { x: number; y: number } {
  const bx = point.x / view.bitmapToOriginalScale;
  const by = point.y / view.bitmapToOriginalScale;
  const cssX = bx * view.zoom + view.panX;
  const cssY = by * view.zoom + view.panY;
  return { x: cssX * view.dpr, y: cssY * view.dpr };
}

/** Draws the working image, scaled/panned per the current view transform. */
export function drawWorkingImage(
  ctx: CanvasRenderingContext2D,
  bitmap: ImageBitmap,
  view: ViewTransform,
): void {
  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  // Compose: device-pixel-ratio scale (backing store is dpr times the CSS
  // size) with the pan/zoom view transform, which itself operates in CSS
  // pixels (matching pointer event coordinates from getBoundingClientRect).
  ctx.setTransform(
    view.zoom * view.dpr,
    0,
    0,
    view.zoom * view.dpr,
    view.panX * view.dpr,
    view.panY * view.dpr,
  );
  ctx.drawImage(bitmap, 0, 0, bitmap.width, bitmap.height);
  ctx.restore();
}

/**
 * Draws the crop rectangle with a dimmed mask outside it.
 * `canvasWidth`/`canvasHeight` must be the canvas's device-pixel backing
 * store size (i.e. `canvas.width`/`canvas.height`), matching the device-pixel
 * space that `toScreen` now returns.
 */
export function drawCrop(
  ctx: CanvasRenderingContext2D,
  canvasWidth: number,
  canvasHeight: number,
  crop: Rect,
  view: ViewTransform,
): void {
  const topLeft = toScreen({ x: crop.x, y: crop.y }, view);
  const bottomRight = toScreen({ x: crop.x + crop.width, y: crop.y + crop.height }, view);
  const w = bottomRight.x - topLeft.x;
  const h = bottomRight.y - topLeft.y;

  ctx.save();

  // Dim everything outside the crop using an even-odd fill trick.
  ctx.beginPath();
  ctx.rect(0, 0, canvasWidth, canvasHeight);
  ctx.rect(topLeft.x, topLeft.y, w, h);
  ctx.fillStyle = COLOR_CROP_DIM;
  ctx.fill("evenodd");

  // Crop border.
  ctx.strokeStyle = COLOR_INK;
  ctx.lineWidth = 1.5 * view.dpr;
  ctx.strokeRect(topLeft.x, topLeft.y, w, h);

  ctx.restore();
}

/** Draws chin/crown markers, the head-height dimension line, and eye guide. */
export function drawLandmarks(
  ctx: CanvasRenderingContext2D,
  geometry: GeometryResult,
  view: ViewTransform,
  dragging: UiState["dragging"],
): void {
  const hasChin = geometry.chin.x !== 0 || geometry.chin.y !== 0;
  const hasCrown = geometry.crown.x !== 0 || geometry.crown.y !== 0;

  if (!geometry.isValid) {
    // Partial manual placement: show whichever single marker exists so far
    // (face-detection-spec.md §14, "allow manual placement").
    ctx.save();
    if (hasChin) drawMarker(ctx, toScreen(geometry.chin, view), dragging === "chin", view.dpr);
    if (hasCrown) drawMarker(ctx, toScreen(geometry.crown, view), dragging === "crown", view.dpr);
    ctx.restore();
    return;
  }

  const chinScreen = toScreen(geometry.chin, view);
  const crownScreen = toScreen(geometry.crown, view);

  ctx.save();

  // Dimension line (the signature motif): vertical line + perpendicular tick caps.
  ctx.strokeStyle = COLOR_MEASURE;
  ctx.lineWidth = 2 * view.dpr;
  ctx.beginPath();
  ctx.moveTo(crownScreen.x, crownScreen.y);
  ctx.lineTo(chinScreen.x, chinScreen.y);
  ctx.stroke();

  const tickLen = 8 * view.dpr;
  ctx.beginPath();
  ctx.moveTo(crownScreen.x - tickLen, crownScreen.y);
  ctx.lineTo(crownScreen.x + tickLen, crownScreen.y);
  ctx.moveTo(chinScreen.x - tickLen, chinScreen.y);
  ctx.lineTo(chinScreen.x + tickLen, chinScreen.y);
  ctx.stroke();

  // Crown marker.
  drawMarker(ctx, crownScreen, dragging === "crown", view.dpr);
  // Chin marker.
  drawMarker(ctx, chinScreen, dragging === "chin", view.dpr);

  // Eye guide line.
  const eyeScreenY = toScreen({ x: 0, y: geometry.eyeLine }, view).y;
  ctx.strokeStyle = COLOR_GUIDE;
  ctx.lineWidth = 1 * view.dpr;
  ctx.setLineDash([4 * view.dpr, 4 * view.dpr]);
  ctx.beginPath();
  ctx.moveTo(0, eyeScreenY);
  ctx.lineTo(ctx.canvas.width, eyeScreenY);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.restore();
}

function drawMarker(
  ctx: CanvasRenderingContext2D,
  pos: { x: number; y: number },
  active: boolean,
  dpr: number,
): void {
  ctx.save();
  ctx.beginPath();
  ctx.arc(pos.x, pos.y, (active ? 9 : 7) * dpr, 0, Math.PI * 2);
  ctx.fillStyle = "#FFFFFF";
  ctx.fill();
  ctx.lineWidth = (active ? 3 : 2) * dpr;
  ctx.strokeStyle = COLOR_MEASURE;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(pos.x, pos.y, 2.5 * dpr, 0, Math.PI * 2);
  ctx.fillStyle = COLOR_MEASURE;
  ctx.fill();
  ctx.restore();
}

/** Draws bounding boxes for ALL detected faces, for the multi-face selection UI. */
export function drawFaceCandidates(
  ctx: CanvasRenderingContext2D,
  candidates: FaceLandmarks[],
  selectedIndex: number,
  view: ViewTransform,
): void {
  ctx.save();
  candidates.forEach((face, i) => {
    const tl = toScreen({ x: face.boundingBox.x, y: face.boundingBox.y }, view);
    const br = toScreen(
      { x: face.boundingBox.x + face.boundingBox.width, y: face.boundingBox.y + face.boundingBox.height },
      view,
    );
    ctx.strokeStyle = i === selectedIndex ? COLOR_OK : COLOR_WARN;
    ctx.lineWidth = (i === selectedIndex ? 2.5 : 1.5) * view.dpr;
    ctx.setLineDash(i === selectedIndex ? [] : [5 * view.dpr, 4 * view.dpr]);
    ctx.strokeRect(tl.x, tl.y, br.x - tl.x, br.y - tl.y);
  });
  ctx.setLineDash([]);
  ctx.restore();
}

export function clearCanvas(ctx: CanvasRenderingContext2D): void {
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.restore();
}
