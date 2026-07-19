/**
 * mm -> px conversion, per face-detection-spec.md §7.1.
 * px = (mm / 25.4) * DPI
 */
export function mmToPx(mm: number, dpi: number): number {
  return (mm / 25.4) * dpi;
}

/** px -> mm conversion, inverse of mmToPx. */
export function pxToMm(px: number, dpi: number): number {
  return (px / dpi) * 25.4;
}
