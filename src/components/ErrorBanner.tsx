import React from "react";
import type { AppError } from "@/types";

const ERROR_GUIDANCE: Record<AppError["code"], string> = {
  "no-face": "Try a clearer, front-facing photo with even lighting, or place the chin and crown markers manually below.",
  "multi-face": "Select which face is the subject of this passport photo using the options below.",
  "low-confidence": "Detection may be slightly off. Check the markers on the photo and drag them if needed.",
  "image-too-small": "Use a higher-resolution source photo for an accurate result.",
  "image-too-blurry": "Use a sharper photo — focus on the face before capturing.",
  "face-near-edge": "Re-crop or re-take the photo with more space around the head.",
  "unsupported-format": "Use a JPG or PNG image; HEIC/HEIF is supported in Safari only.",
  "file-too-large": "Use a file under 20 MB, or export a smaller version from your camera app.",
  "detector-init-failed": "Face detection couldn't start — check your connection, then reload the page.",
};

export default function ErrorBanner({
  errors,
  onDismiss,
}: {
  errors: AppError[];
  onDismiss: (code: AppError["code"]) => void;
}) {
  if (errors.length === 0) return null;

  return (
    <div className="space-y-2">
      {errors.map((err) => (
        <div
          key={err.code}
          className="flex items-start justify-between gap-3 rounded-sm border border-warn/40 bg-warn/10 px-4 py-3"
        >
          <div>
            <p className="text-sm font-medium text-ink">{err.message}</p>
            <p className="mt-0.5 text-xs text-ink-soft">{ERROR_GUIDANCE[err.code]}</p>
          </div>
          <button
            onClick={() => onDismiss(err.code)}
            className="shrink-0 font-mono text-xs text-ink-faint hover:text-ink"
            aria-label="Dismiss"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
