import type { AppState } from "@/types";

export function createInitialState(): AppState {
  return {
    phase: "upload",
    image: {
      original: null,
      working: null,
      width: 0,
      height: 0,
      workingWidth: 0,
      workingHeight: 0,
    },
    specs: {
      widthMm: 35,
      heightMm: 45,
      headHeightMm: 34,
      dpi: 300,
    },
    detection: {
      landmarks: null,
      confidence: 0,
      mode: "auto",
      hasRun: false,
      faceCount: 0,
      candidates: [],
      selectedFaceIndex: 0,
    },
    manualOverrides: {},
    transform: {
      scale: 1,
      translateX: 0,
      translateY: 0,
      rotation: 0,
    },
    crop: { x: 0, y: 0, width: 0, height: 0 },
    ui: {
      zoom: 1,
      panX: 0,
      panY: 0,
      dragging: "none",
    },
    errors: [],
  };
}

/** Common passport/visa/ID presets, in mm, for the SpecsPanel quick-select. */
export const SPEC_PRESETS: Array<{
  label: string;
  widthMm: number;
  heightMm: number;
  headHeightMm: number;
}> = [
  { label: "US Passport / Visa (2×2 in)", widthMm: 50.8, heightMm: 50.8, headHeightMm: 31.75 },
  { label: "Schengen / EU Visa (35×45mm)", widthMm: 35, heightMm: 45, headHeightMm: 34 },
  { label: "UK Passport (35×45mm)", widthMm: 35, heightMm: 45, headHeightMm: 34 },
  { label: "India Passport (35×45mm)", widthMm: 35, heightMm: 45, headHeightMm: 28 },
  { label: "Canada Passport (50×70mm)", widthMm: 50, heightMm: 70, headHeightMm: 34 },
  { label: "China Visa (33×48mm)", widthMm: 33, heightMm: 48, headHeightMm: 32 },
  { label: "Australia Passport (35×45mm)", widthMm: 35, heightMm: 45, headHeightMm: 34 },
];
