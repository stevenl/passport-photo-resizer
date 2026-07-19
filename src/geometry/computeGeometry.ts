import type {AppState, GeometryResult, Point, Rect} from "@/types";
import {distance} from "./primitives";
import {mmToPx} from "./units";

/**
 * Resolves the "final" landmark per face-detection-spec.md §10.2:
 *   final_landmark = override ?? auto_detected
 */
function resolveLandmark(
  override: Point | undefined,
  autoDetected: Point | null,
): Point | null {
  return override ?? autoDetected;
}

/**
 * The pure geometry engine. Architecture.md §7.1 / §12.1:
 * "Geometry engine must be deterministic and stateless." Given the same
 * AppState, this function always returns the same GeometryResult. It does
 * not read or write any external state, and never touches the DOM/canvas.
 */
export function computeGeometry(state: AppState): GeometryResult {
  const warnings: string[] = [];

  const auto = state.detection.landmarks;
  const chin = resolveLandmark(state.manualOverrides.chin, auto?.chin ?? null);
  const crown = resolveLandmark(state.manualOverrides.crown, auto?.crown ?? null);

  // Without both reference points we cannot produce valid geometry yet.
  // Return a clearly-invalid result rather than throwing, so the UI can
  // render a "place markers to continue" state per specification.md §3.4.
  if (!chin || !crown) {
    return {
      scale: 1,
      headHeightPx: 0,
      crop: { x: 0, y: 0, width: 0, height: 0 },
      eyeLine: 0,
      chin: chin ?? { x: 0, y: 0 },
      crown: crown ?? { x: 0, y: 0 },
      headCenterX: chin?.x ?? crown?.x ?? 0,
      isValid: false,
      warnings: ["No chin/crown reference points available."],
    };
  }

  // --- Head height (face-detection-spec.md §6) ---
  const headHeightPx = distance(chin, crown);

  // --- DPI conversion + scale factor (§7) ---
  const desiredHeadHeightPx = mmToPx(state.specs.headHeightMm, state.specs.dpi);
  const scale =
    headHeightPx > 0 ? desiredHeadHeightPx / headHeightPx : 1;

  // --- Output frame size in px (§9.1) ---
  const widthPx = mmToPx(state.specs.widthMm, state.specs.dpi);
  const heightPx = mmToPx(state.specs.heightMm, state.specs.dpi);

  // --- Crop geometry (§9.2 / §9.3) ---
  // All of the following is expressed in ORIGINAL IMAGE coordinates, scaled
  // by `scale` so that the final crop, once the image itself is scaled by
  // `scale`, yields exactly `widthPx` x `heightPx` pixels containing a head
  // of exactly `desiredHeadHeightPx`.
  //
  // We work "backwards": figure out where the crop rectangle sits in the
  // *original, unscaled* image such that after scaling by `scale`, the chin
  // lands at the correct vertical offset from the top of frame, and the
  // face is horizontally centered.

  // Required vertical offset of chin from top of frame, in *scaled* px.
  // Passport convention: chin sits a margin below the head-height region
  // (eyes in upper third, crown near top with margin, chin near
  // lower-middle). We anchor using crown-down placement: crown sits at a
  // fixed top margin, chin follows from headHeight.
  const topMarginPx = heightPx * 0.12; // empirical top margin so crown isn't flush to the edge

  // Convert those scaled offsets back into *original image* units.
  const crownOffsetFromTopOriginal = topMarginPx / scale;

  // Crop top edge in original coords: crown_y - crownOffsetFromTopOriginal
  const cropTopOriginal = crown.y - crownOffsetFromTopOriginal;

  // Crop width/height in original coordinates.
  const cropWidthOriginal = widthPx / scale;
  const cropHeightOriginal = heightPx / scale;

  // Horizontal centering: head center x = chin.x (approximation; chin is
  // the most stable single-point horizontal reference per §9.2).
  const headCenterX = chin.x;
  const cropLeftOriginal = headCenterX - cropWidthOriginal / 2;

  const crop: Rect = {
    x: cropLeftOriginal,
    y: cropTopOriginal,
    width: cropWidthOriginal,
    height: cropHeightOriginal,
  };

  // Eye line: approximate as sitting at the standard "upper third" position
  // within the frame, per specification.md §3.6. Expressed in ORIGINAL
  // image y-coordinate so it can be drawn directly on either canvas layer
  // once multiplied through the same transform as everything else.
  const eyeLineOffsetFromTopScaled = heightPx * 0.42;
  const eyeLine = cropTopOriginal + eyeLineOffsetFromTopScaled / scale;

  // --- Validation / warnings ---
  if (headHeightPx <= 0) {
    warnings.push("Chin and crown markers are coincident — head height is zero.");
  }
  if (state.image.width > 0 && state.image.height > 0) {
    const imgBounds: Rect = { x: 0, y: 0, width: state.image.width, height: state.image.height };
    const cropRight = crop.x + crop.width;
    const cropBottom = crop.y + crop.height;
    if (crop.x < imgBounds.x || crop.y < imgBounds.y) {
      warnings.push("Crop extends beyond the top/left of the original image — move or zoom out.");
    }
    if (cropRight > imgBounds.x + imgBounds.width || cropBottom > imgBounds.y + imgBounds.height) {
      warnings.push("Crop extends beyond the bottom/right of the original image — move or zoom out.");
    }
  }

  return {
    scale,
    headHeightPx,
    crop,
    eyeLine,
    chin,
    crown,
    headCenterX,
    isValid: headHeightPx > 0,
    warnings,
  };
}
