import type { ExportOptions, GeometryResult, PrintSheetOptions } from "@/types";
import { mmToPx } from "@/geometry/units";

/**
 * Single Image Export — architecture.md §10.1:
 *   original image -> apply transform -> apply crop -> render to canvas
 *   -> encode JPG/PNG -> download
 *
 * Per the critical invariant (architecture.md §9.3 / face-detection spec §13.2):
 * FINAL OUTPUT ALWAYS USES THE ORIGINAL IMAGE, never the working copy.
 */
export async function renderFinalPhoto(
  original: ImageBitmap,
  geometry: GeometryResult,
  specs: { widthMm: number; heightMm: number; dpi: number },
): Promise<HTMLCanvasElement> {
  const outWidth = Math.round(mmToPx(specs.widthMm, specs.dpi));
  const outHeight = Math.round(mmToPx(specs.heightMm, specs.dpi));

  const canvas = document.createElement("canvas");
  canvas.width = outWidth;
  canvas.height = outHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not acquire 2D canvas context for export.");

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, outWidth, outHeight);

  // geometry.crop is expressed in ORIGINAL image coordinates already; we
  // draw that source rectangle directly into the full output canvas, which
  // performs the crop+scale in a single drawImage call (no separate pixel
  // mutation step, consistent with "all operations are transforms").
  ctx.drawImage(
    original,
    geometry.crop.x,
    geometry.crop.y,
    geometry.crop.width,
    geometry.crop.height,
    0,
    0,
    outWidth,
    outHeight,
  );

  return canvas;
}

export async function canvasToBlob(
  canvas: HTMLCanvasElement,
  options: ExportOptions,
): Promise<Blob> {
  const mime = options.format === "jpeg" ? "image/jpeg" : "image/png";
  // specification.md §3.10: JPEG exports use high-quality compression (95-100%).
  const quality = options.format === "jpeg" ? Math.max(0.95, options.quality) : undefined;

  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Canvas could not be encoded to a blob."));
      },
      mime,
      quality,
    );
  });
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Revoke shortly after to ensure the download has been handed off.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const LAYOUT_GRID: Record<PrintSheetOptions["layout"], { cols: number; rows: number }> = {
  2: { cols: 2, rows: 1 },
  4: { cols: 2, rows: 2 },
  6: { cols: 2, rows: 3 },
  8: { cols: 2, rows: 4 },
};

/**
 * Print Sheet Export — architecture.md §10.2:
 *   final photo -> duplicate into grid -> apply spacing rules
 *   -> render A4 or 4x6 canvas -> export PDF or image
 *
 * This MVP renders the sheet as a raster image (JPEG/PNG); PDF export of
 * the same canvas can be added via the existing `pdf` skill if needed.
 */
export async function renderPrintSheet(
  photoCanvas: HTMLCanvasElement,
  photoSpecs: { widthMm: number; heightMm: number; dpi: number },
  options: PrintSheetOptions,
): Promise<HTMLCanvasElement> {
  const { layout, sheetSizeMm, marginMm } = options;
  const dpi = photoSpecs.dpi;

  const sheetWidthPx = Math.round(mmToPx(sheetSizeMm.width, dpi));
  const sheetHeightPx = Math.round(mmToPx(sheetSizeMm.height, dpi));
  const marginPx = mmToPx(marginMm, dpi);
  const photoWidthPx = Math.round(mmToPx(photoSpecs.widthMm, dpi));
  const photoHeightPx = Math.round(mmToPx(photoSpecs.heightMm, dpi));

  const { cols, rows } = LAYOUT_GRID[layout];

  const totalGridWidth = cols * photoWidthPx + (cols - 1) * marginPx;
  const totalGridHeight = rows * photoHeightPx + (rows - 1) * marginPx;

  const startX = Math.max((sheetWidthPx - totalGridWidth) / 2, marginPx);
  const startY = Math.max((sheetHeightPx - totalGridHeight) / 2, marginPx);

  const canvas = document.createElement("canvas");
  canvas.width = sheetWidthPx;
  canvas.height = sheetHeightPx;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not acquire 2D canvas context for print sheet export.");

  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, sheetWidthPx, sheetHeightPx);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  let placed = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (placed >= layout) break;
      const x = startX + c * (photoWidthPx + marginPx);
      const y = startY + r * (photoHeightPx + marginPx);
      ctx.drawImage(photoCanvas, x, y, photoWidthPx, photoHeightPx);

      // Faint cut-guide lines around each photo, common on commercial sheets.
      ctx.save();
      ctx.strokeStyle = "rgba(0,0,0,0.25)";
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.strokeRect(x, y, photoWidthPx, photoHeightPx);
      ctx.restore();

      placed++;
    }
  }

  return canvas;
}

export const PRINT_SHEET_SIZES_MM = {
  "4x6in": { label: '4×6 in', width: 101.6, height: 152.4 },
  a4: { label: "A4", width: 210, height: 297 },
  letter: { label: "Letter", width: 215.9, height: 279.4 },
} as const;
