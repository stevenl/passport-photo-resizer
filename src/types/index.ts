// Core domain types shared across the geometry engine, detection layer,
// rendering layer, and React UI. Kept dependency-free (no React, no DOM
// canvas types beyond lib.dom) so the geometry engine can stay pure.

export interface Point {
  x: number;
  y: number;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type DetectionMode = "auto" | "manual";

export type DraggingTarget = "none" | "chin" | "crown" | "image";

/** Raw + derived facial landmarks, always in ORIGINAL image pixel space. */
export interface FaceLandmarks {
  /** All 468 MediaPipe mesh points in original-image pixel space. */
  rawPoints: Point[];
  leftEye: Point;
  rightEye: Point;
  noseTip: Point;
  /** Auto-detected chin (jaw curve minimum), original-image pixel space. */
  chin: Point;
  /** Auto-detected crown (forehead projection estimate), original-image pixel space. */
  crown: Point;
  /** Axis-aligned bounding box of the face mesh, original-image pixel space. */
  boundingBox: Rect;
}

export interface ManualOverrides {
  chin?: Point;
  crown?: Point;
}

export interface DetectionState {
  landmarks: FaceLandmarks | null;
  /** 0–1 confidence score from MediaPipe. */
  confidence: number;
  mode: DetectionMode;
  /** True once a detection pass has completed (success or failure). */
  hasRun: boolean;
  /** Number of faces found in the most recent detection pass. */
  faceCount: number;
  /** All candidate faces, used for the multi-face selection UI. */
  candidates: FaceLandmarks[];
  /** Index into `candidates` of the currently selected subject. */
  selectedFaceIndex: number;
}

export interface PassportSpecs {
  widthMm: number;
  heightMm: number;
  headHeightMm: number;
  dpi: number;
}

export interface TransformState {
  scale: number;
  translateX: number;
  translateY: number;
  rotation: number;
}

export interface ImageState {
  /** Full-resolution decoded bitmap. Never mutated after upload. */
  original: ImageBitmap | null;
  /** Downscaled (max 1600px) bitmap used for preview + detection + interaction. */
  working: ImageBitmap | null;
  /** Original image's full-resolution width/height. */
  width: number;
  height: number;
  /** Working copy's width/height (may differ from original). */
  workingWidth: number;
  workingHeight: number;
}

export interface UiState {
  zoom: number;
  panX: number;
  panY: number;
  dragging: DraggingTarget;
}

export type AppPhase =
  | "upload"
  | "specs"
  | "editing"
  | "exporting";

export interface AppError {
  code:
    | "no-face"
    | "multi-face"
    | "low-confidence"
    | "image-too-small"
    | "image-too-blurry"
    | "face-near-edge"
    | "unsupported-format"
    | "file-too-large"
    | "detector-init-failed";
  message: string;
}

export interface AppState {
  phase: AppPhase;
  image: ImageState;
  specs: PassportSpecs;
  detection: DetectionState;
  manualOverrides: ManualOverrides;
  transform: TransformState;
  crop: Rect;
  ui: UiState;
  errors: AppError[];
}

/** Output of the pure geometry engine — never stored, always recomputed. */
export interface GeometryResult {
  scale: number;
  headHeightPx: number;
  crop: Rect;
  eyeLine: number;
  chin: Point;
  crown: Point;
  headCenterX: number;
  isValid: boolean;
  warnings: string[];
}

export type ExportFormat = "jpeg" | "png";

export type PrintSheetLayout = 2 | 4 | 6 | 8;

export interface ExportOptions {
  format: ExportFormat;
  quality: number; // 0–1, used for jpeg
}

export interface PrintSheetOptions extends ExportOptions {
  layout: PrintSheetLayout;
  sheetSizeMm: { width: number; height: number };
  marginMm: number;
}
