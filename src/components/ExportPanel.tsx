import React, { useState } from "react";
import type { ExportFormat, GeometryResult, PassportSpecs, PrintSheetLayout } from "@/types";
import {
  canvasToBlob,
  downloadBlob,
  PRINT_SHEET_SIZES_MM,
  renderFinalPhoto,
  renderPrintSheet,
} from "@/rendering/export";
import { Eyebrow, PrimaryButton, SecondaryButton } from "./Primitives";

interface ExportPanelProps {
  original: ImageBitmap | null;
  geometry: GeometryResult;
  specs: PassportSpecs;
}

type SheetSizeKey = keyof typeof PRINT_SHEET_SIZES_MM;

export default function ExportPanel({ original, geometry, specs }: ExportPanelProps) {
  const [format, setFormat] = useState<ExportFormat>("jpeg");
  const [layout, setLayout] = useState<PrintSheetLayout>(4);
  const [sheetSize, setSheetSize] = useState<SheetSizeKey>("4x6in");
  const [isExporting, setIsExporting] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const canExport = original !== null && geometry.isValid;

  async function handleSinglePhotoExport() {
    if (!original) return;
    setIsExporting(true);
    setLastError(null);
    try {
      const canvas = await renderFinalPhoto(original, geometry, specs);
      const blob = await canvasToBlob(canvas, { format, quality: 0.95 });
      downloadBlob(blob, `passport-photo.${format === "jpeg" ? "jpg" : "png"}`);
      setPreviewUrl(canvas.toDataURL(format === "jpeg" ? "image/jpeg" : "image/png", 0.92));
    } catch (err) {
      console.error(err);
      setLastError("Export failed. Try adjusting the crop or reloading the photo.");
    } finally {
      setIsExporting(false);
    }
  }

  async function handlePrintSheetExport() {
    if (!original) return;
    setIsExporting(true);
    setLastError(null);
    try {
      const photoCanvas = await renderFinalPhoto(original, geometry, specs);
      const sheet = await renderPrintSheet(photoCanvas, specs, {
        format,
        quality: 0.95,
        layout,
        sheetSizeMm: {
          width: PRINT_SHEET_SIZES_MM[sheetSize].width,
          height: PRINT_SHEET_SIZES_MM[sheetSize].height,
        },
        marginMm: 5,
      });
      const blob = await canvasToBlob(sheet, { format, quality: 0.95 });
      downloadBlob(blob, `passport-photo-sheet-${layout}up.${format === "jpeg" ? "jpg" : "png"}`);
    } catch (err) {
      console.error(err);
      setLastError("Print sheet export failed. Try a smaller layout or reload the photo.");
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <Eyebrow>Step 4 — Export</Eyebrow>
        <p className="mt-1.5 text-sm text-ink-soft">
          The final image is rendered from your original full-resolution
          photo, never the preview copy.
        </p>
      </div>

      <div>
        <Eyebrow>File format</Eyebrow>
        <div className="mt-2 flex gap-2">
          {(["jpeg", "png"] as ExportFormat[]).map((f) => (
            <button
              key={f}
              onClick={() => setFormat(f)}
              className={`flex-1 rounded-sm border px-3 py-2 font-mono text-xs uppercase transition-colors ${
                format === f
                  ? "border-ink bg-ink text-paper"
                  : "border-line text-ink-soft hover:border-ink/40"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <PrimaryButton onClick={handleSinglePhotoExport} disabled={!canExport || isExporting} className="w-full">
        {isExporting ? "Rendering…" : "Download photo"}
      </PrimaryButton>

      <div className="border-t border-line pt-5">
        <Eyebrow>Print sheet (optional)</Eyebrow>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <label className="block">
            <span className="font-mono text-[11px] text-ink-faint">Photos per sheet</span>
            <select
              value={layout}
              onChange={(e) => setLayout(parseInt(e.target.value, 10) as PrintSheetLayout)}
              className="mt-1 w-full rounded-sm border border-line bg-paper px-2 py-1.5 text-sm outline-none focus:border-ink"
            >
              {[2, 4, 6, 8].map((n) => (
                <option key={n} value={n}>
                  {n}-up
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="font-mono text-[11px] text-ink-faint">Sheet size</span>
            <select
              value={sheetSize}
              onChange={(e) => setSheetSize(e.target.value as SheetSizeKey)}
              className="mt-1 w-full rounded-sm border border-line bg-paper px-2 py-1.5 text-sm outline-none focus:border-ink"
            >
              {Object.entries(PRINT_SHEET_SIZES_MM).map(([key, v]) => (
                <option key={key} value={key}>
                  {v.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <SecondaryButton onClick={handlePrintSheetExport} disabled={!canExport || isExporting} className="mt-3 w-full">
          {isExporting ? "Rendering…" : "Download print sheet"}
        </SecondaryButton>
      </div>

      {lastError && (
        <div className="rounded-sm border border-warn/40 bg-warn/10 px-3 py-2.5 text-xs text-ink">
          {lastError}
        </div>
      )}

      {previewUrl && (
        <div>
          <Eyebrow>Last export</Eyebrow>
          <img
            src={previewUrl}
            alt="Exported passport photo preview"
            className="mt-2 max-h-40 rounded-sm border border-line"
          />
        </div>
      )}

      {!canExport && (
        <p className="text-xs text-ink-faint">
          Place the chin and crown markers (or wait for auto-detection) before exporting.
        </p>
      )}
    </div>
  );
}
