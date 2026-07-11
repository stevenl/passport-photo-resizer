import { useEffect, useRef, useState } from "react";
import type { AppError, FaceLandmarks } from "@/types";
import { detectFaces, rescaleLandmarks } from "@/detection/faceDetector";

interface UseFaceDetectionParams {
  working: ImageBitmap | null;
  workingWidth: number;
  workingHeight: number;
  originalWidth: number;
  originalHeight: number;
  onStart: () => void;
  onSuccess: (candidates: FaceLandmarks[], confidence: number) => void;
  onFailure: (error: AppError) => void;
}

/**
 * Runs MediaPipe detection exactly once per image load, per architecture.md
 * §8.1 / §8.2: "Detection runs once per image. NOT continuous video mode."
 * A "Re-detect" action is exposed via `rerun()`, which bumps a counter to
 * deliberately re-trigger the effect for the same bitmap.
 */
export function useFaceDetection({
  working,
  workingWidth,
  workingHeight,
  originalWidth,
  originalHeight,
  onStart,
  onSuccess,
  onFailure,
}: UseFaceDetectionParams) {
  const lastRunFor = useRef<ImageBitmap | null>(null);
  const [runToken, setRunToken] = useState(0);

  useEffect(() => {
    if (!working) return;
    if (lastRunFor.current === working && runToken === 0) return; // already ran for this bitmap
    lastRunFor.current = working;

    let cancelled = false;
    onStart();

    (async () => {
      try {
        const { faces, confidence } = await detectFaces(working);
        if (cancelled) return;

        const rescaled = faces.map((f) =>
          rescaleLandmarks(f, workingWidth, workingHeight, originalWidth, originalHeight),
        );

        onSuccess(rescaled, confidence);
      } catch (err) {
        if (cancelled) return;
        console.error("Face detection failed:", err);
        onFailure({
          code: "detector-init-failed",
          message: "Face detection could not run on this photo.",
        });
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [working, runToken]);

  /** Allows the UI to force a fresh detection pass ("Re-detect face"). */
  function rerun() {
    setRunToken((t) => t + 1);
  }

  return { rerun };
}
