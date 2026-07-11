import React, { useCallback, useRef, useState } from "react";
import {
  checkImageQuality,
  createWorkingCopy,
  decodeOriginalImage,
  FileTooLargeError,
  UnsupportedFormatError,
  validateFile,
} from "@/utils/imageLoader";
import { Eyebrow, PrimaryButton } from "./Primitives";

interface UploadPanelProps {
  onImageReady: (params: {
    original: ImageBitmap;
    working: ImageBitmap;
    width: number;
    height: number;
    workingWidth: number;
    workingHeight: number;
    qualityWarnings: string[];
  }) => void;
}

export default function UploadPanel({ onImageReady }: UploadPanelProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    async (file: File) => {
      setError(null);
      setIsLoading(true);
      try {
        validateFile(file);
        const original = await decodeOriginalImage(file);
        const working = await createWorkingCopy(original);
        const quality = checkImageQuality(original.width, original.height);

        onImageReady({
          original,
          working,
          width: original.width,
          height: original.height,
          workingWidth: working.width,
          workingHeight: working.height,
          qualityWarnings: quality.warnings,
        });
      } catch (err) {
        if (err instanceof UnsupportedFormatError || err instanceof FileTooLargeError) {
          setError(err.message);
        } else {
          console.error(err);
          setError("That image couldn't be opened. Try a different photo, or a JPG/PNG export of it.");
        }
      } finally {
        setIsLoading(false);
      }
    },
    [onImageReady],
  );

  const onDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  return (
    <div className="mx-auto w-full max-w-xl">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        className={`relative flex flex-col items-center justify-center gap-5 rounded-md border-2 border-dashed px-8 py-16 text-center transition-colors ${
          isDragging ? "border-measure bg-measure/5" : "border-line bg-panel"
        }`}
      >
        <svg width="56" height="56" viewBox="0 0 56 56" className="text-ink-faint">
          <rect x="6" y="10" width="44" height="36" rx="2" fill="none" stroke="currentColor" strokeWidth="2" />
          <circle cx="20" cy="22" r="4" fill="none" stroke="currentColor" strokeWidth="2" />
          <path d="M6 38 L20 28 L30 36 L38 26 L50 38" fill="none" stroke="currentColor" strokeWidth="2" />
          <line x1="2" y1="2" x2="2" y2="12" stroke="#B8472F" strokeWidth="1.5" />
          <line x1="2" y1="7" x2="14" y2="7" stroke="#B8472F" strokeWidth="1.5" />
        </svg>

        <div>
          <Eyebrow>Step 1 — Source photo</Eyebrow>
          <p className="mt-2 font-display text-xl font-bold text-ink">
            Drop a portrait, or choose a file
          </p>
          <p className="mt-1 text-sm text-ink-soft">
            JPG, PNG, or HEIC · up to 20 MB · processed entirely on this device
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3">
          <PrimaryButton onClick={() => fileInputRef.current?.click()} disabled={isLoading}>
            {isLoading ? "Reading photo…" : "Choose file"}
          </PrimaryButton>
          <PrimaryButton
            onClick={() => cameraInputRef.current?.click()}
            disabled={isLoading}
            className="bg-panel text-ink border border-ink/30 hover:bg-ink/5"
          >
            Use camera
          </PrimaryButton>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/heic,image/heif"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
            e.target.value = "";
          }}
        />
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="user"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
            e.target.value = "";
          }}
        />
      </div>

      {error && (
        <div className="mt-4 rounded-sm border border-warn/40 bg-warn/10 px-4 py-3 text-sm text-ink">
          {error}
        </div>
      )}

      <p className="mt-6 text-center text-xs text-ink-faint">
        Nothing you upload ever leaves this browser tab — there is no server,
        no upload, and no account.
      </p>
    </div>
  );
}
