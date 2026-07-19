import type { Rect } from "@/types";

export interface FitViewResult {
  zoom: number;
  panX: number;
  panY: number;
}

/**
 * Computes the zoom and pan values that centre the detected face bounding
 * box in the canvas preview area at a comfortable viewing size.
 *
 * All geometry is in ORIGINAL image pixel space, matching the coordinates
 * that landmarks are stored in after rescaling. The working image is what
 * actually gets drawn, so we convert via bitmapToOriginalScale when
 * computing the pan offset.
 *
 * @param faceBoundingBox  Face bounding box in original image pixel space.
 * @param originalWidth    Full-resolution image width in pixels.
 * @param originalHeight   Full-resolution image height in pixels.
 * @param workingWidth     Downscaled working copy width in pixels.
 * @param workingHeight    Downscaled working copy height in pixels.
 * @param canvasWidth      Canvas container CSS width in pixels.
 * @param canvasHeight     Canvas container CSS height in pixels.
 * @param targetFillRatio  What fraction of the shorter canvas dimension the
 *                         face should occupy. Default 0.55 — large enough to
 *                         see the landmarks clearly, with breathing room.
 */
export function computeFitView(
  faceBoundingBox: Rect,
  originalWidth: number,
  originalHeight: number,
  workingWidth: number,
  workingHeight: number,
  canvasWidth: number,
  canvasHeight: number,
  targetFillRatio = 0.55,
): FitViewResult {
  if (
    originalWidth === 0 ||
    originalHeight === 0 ||
    workingWidth === 0 ||
    workingHeight === 0 ||
    canvasWidth === 0 ||
    canvasHeight === 0
  ) {
    return { zoom: 1, panX: 0, panY: 0 };
  }

  // Scale from original-image coordinates → working-bitmap coordinates.
  const bitmapToOriginalScale = originalWidth / workingWidth;

  // Face box in working-bitmap pixel space.
  const faceW = faceBoundingBox.width / bitmapToOriginalScale;
  const faceH = faceBoundingBox.height / bitmapToOriginalScale;

  // Add generous vertical padding — the crown projection means the bounding
  // box top is already near the forehead, but we want to see some headroom
  // and the chin clearly, so pad proportionally around the face.
  const padX = faceW * 0.6;
  const padY = faceH * 0.5;
  const targetW = faceW + padX * 2;
  const targetH = faceH + padY * 2;

  // Zoom so the padded face region fills `targetFillRatio` of the canvas
  // on its constraining axis.
  const zoomX = (canvasWidth * targetFillRatio) / targetW;
  const zoomY = (canvasHeight * targetFillRatio) / targetH;
  const zoom = Math.min(zoomX, zoomY, 4); // cap at the UI's max zoom of 4×

  // Face centre in working-bitmap pixel space.
  const faceCentreX =
    (faceBoundingBox.x + faceBoundingBox.width / 2) / bitmapToOriginalScale;
  const faceCentreY =
    (faceBoundingBox.y + faceBoundingBox.height / 2) / bitmapToOriginalScale;

  // Pan so that faceCentre lands at the canvas centre.
  // From toScreen: screenX = bitmapX * zoom + panX  →  panX = canvasCentreX - faceCentreX * zoom
  const panX = canvasWidth / 2 - faceCentreX * zoom;
  const panY = canvasHeight / 2 - faceCentreY * zoom;

  return { zoom, panX, panY };
}
