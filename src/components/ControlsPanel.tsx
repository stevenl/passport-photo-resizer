import React from "react";
import type { AppState, GeometryResult } from "@/types";
import type { ModelLoadingState } from "@/detection/faceDetector";
import { Eyebrow, SecondaryButton } from "./Primitives";

interface ControlsPanelProps {
  state: AppState;
  geometry: GeometryResult;
  modelState: ModelLoadingState;
  onZoomChange: (zoom: number) => void;
  onResetCrop: () => void;
  onClearManualOverrides: () => void;
  onSelectFace: (index: number) => void;
  onRedetect: () => void;
}

function ConfidenceMeter({ confidence }: { confidence: number }) {
  const pct = Math.round(confidence * 100);
  const color = confidence >= 0.85 ? "bg-ok" : confidence >= 0.6 ? "bg-warn" : "bg-measure";
  return (
    <div>
      <div className="flex items-center justify-between">
        <Eyebrow>Detection confidence</Eyebrow>
        <span className="font-mono text-xs tabular text-ink-soft">{pct}%</span>
      </div>
      <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-line">
        <div className={`h-full ${color} transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function ControlsPanel({
  state,
  geometry,
  modelState,
  onZoomChange,
  onResetCrop,
  onClearManualOverrides,
  onSelectFace,
  onRedetect,
}: ControlsPanelProps) {
  const hasOverrides =
    state.manualOverrides.chin !== undefined || state.manualOverrides.crown !== undefined;

  return (
    <div className="space-y-5">
      <div>
        <Eyebrow>Step 3 — Fine adjustment</Eyebrow>
        <p className="mt-1.5 text-sm text-ink-soft">
          Drag the chin or crown markers directly on the photo if detection
          looks off. Drag the background to pan.
        </p>
      </div>


      {modelState === "loading" && (
        <div className="flex items-center gap-2 rounded-sm border border-line bg-paper/60 px-3 py-2.5">
          <svg className="h-3.5 w-3.5 animate-spin text-ink-faint" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
          </svg>
          <p className="font-mono text-xs text-ink-faint">Loading face detection model…</p>
        </div>
      )}

      {modelState === "error" && (
        <div className="rounded-sm border border-warn/40 bg-warn/10 px-3 py-2.5 text-xs text-ink">
          Face detection model failed to load. Check your connection and click Re-detect face to retry.
        </div>
      )}

      {state.detection.hasRun && (
        <ConfidenceMeter confidence={state.detection.confidence} />
      )}

      {state.detection.candidates.length > 1 && (
        <div>
          <Eyebrow>Multiple faces found — choose subject</Eyebrow>
          <div className="mt-2 flex flex-wrap gap-2">
            {state.detection.candidates.map((_, i) => (
              <button
                key={i}
                onClick={() => onSelectFace(i)}
                className={`rounded-sm border px-3 py-1.5 font-mono text-xs transition-colors ${
                  i === state.detection.selectedFaceIndex
                    ? "border-ok bg-ok/10 text-ok"
                    : "border-line text-ink-soft hover:border-ink/40"
                }`}
              >
                Face {i + 1}
              </button>
            ))}
          </div>
        </div>
      )}

      <div>
        <div className="flex items-center justify-between">
          <Eyebrow>Zoom</Eyebrow>
          <span className="font-mono text-xs tabular text-ink-soft">
            {Math.round(state.ui.zoom * 100)}%
          </span>
        </div>
        <input
          type="range"
          min={0.2}
          max={4}
          step={0.01}
          value={state.ui.zoom}
          onChange={(e) => onZoomChange(parseFloat(e.target.value))}
          className="mt-2 w-full accent-[#1C2230]"
        />
      </div>

      {geometry.warnings.length > 0 && (
        <div className="rounded-sm border border-warn/40 bg-warn/10 px-3 py-2.5 text-xs text-ink">
          {geometry.warnings.map((w, i) => (
            <p key={i}>{w}</p>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <SecondaryButton onClick={onRedetect}>Re-detect face</SecondaryButton>
        <SecondaryButton onClick={onClearManualOverrides} disabled={!hasOverrides}>
          Reset markers
        </SecondaryButton>
        <SecondaryButton onClick={onResetCrop}>Reset view</SecondaryButton>
      </div>

      <div className="rounded-sm border border-line bg-paper/60 px-3 py-2.5">
        <p className="font-mono text-xs text-ink-soft tabular">
          Head height: {geometry.headHeightPx.toFixed(1)} px (original) · scale ×
          {geometry.scale.toFixed(3)}
        </p>
      </div>
    </div>
  );
}
