import type {
  AppError,
  AppPhase,
  AppState,
  DetectionMode,
  DraggingTarget,
  FaceLandmarks,
  ManualOverrides,
  PassportSpecs,
  Point,
} from "@/types";

export type AppAction =
  | { type: "RESET" }
  | {
      type: "IMAGE_LOADED";
      original: ImageBitmap;
      working: ImageBitmap;
      width: number;
      height: number;
      workingWidth: number;
      workingHeight: number;
    }
  | { type: "SET_PHASE"; phase: AppPhase }
  | { type: "UPDATE_SPECS"; specs: Partial<PassportSpecs> }
  | { type: "DETECTION_STARTED" }
  | {
      type: "DETECTION_SUCCEEDED";
      candidates: FaceLandmarks[];
      confidence: number;
      selectedFaceIndex: number;
    }
  | { type: "DETECTION_FAILED"; error: AppError }
  | { type: "SELECT_FACE"; index: number }
  | { type: "SET_DETECTION_MODE"; mode: DetectionMode }
  | { type: "SET_MANUAL_OVERRIDE"; target: "chin" | "crown"; point: Point }
  | { type: "CLEAR_MANUAL_OVERRIDES" }
  | { type: "SET_DRAGGING"; target: DraggingTarget }
  | { type: "SET_ZOOM"; zoom: number }
  | { type: "SET_PAN"; panX: number; panY: number }
  | { type: "ADD_ERROR"; error: AppError }
  | { type: "DISMISS_ERROR"; code: AppError["code"] }
  | { type: "CLEAR_ERRORS" };

export function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case "RESET": {
      // Caller is expected to re-derive a fresh initial state; this branch
      // exists for completeness but App.tsx calls createInitialState()
      // directly for a full reset (simpler than re-deriving bitmaps here).
      return state;
    }

    case "IMAGE_LOADED": {
      return {
        ...state,
        phase: "specs",
        image: {
          original: action.original,
          working: action.working,
          width: action.width,
          height: action.height,
          workingWidth: action.workingWidth,
          workingHeight: action.workingHeight,
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
        errors: [],
      };
    }

    case "SET_PHASE":
      return { ...state, phase: action.phase };

    case "UPDATE_SPECS":
      return { ...state, specs: { ...state.specs, ...action.specs } };

    case "DETECTION_STARTED":
      return {
        ...state,
        errors: state.errors.filter(
          (e) => !["no-face", "multi-face", "low-confidence", "face-near-edge"].includes(e.code),
        ),
      };

    case "DETECTION_SUCCEEDED": {
      const { candidates, confidence, selectedFaceIndex } = action;
      const selected = candidates[selectedFaceIndex] ?? null;
      const newErrors: AppError[] = [];

      if (candidates.length === 0) {
        newErrors.push({ code: "no-face", message: "No face was detected in this photo." });
      } else if (candidates.length > 1) {
        newErrors.push({
          code: "multi-face",
          message: `${candidates.length} faces were detected. Select the primary subject.`,
        });
      }
      if (candidates.length > 0 && confidence < 0.85) {
        newErrors.push({
          code: "low-confidence",
          message: "Detection confidence is low — please verify the chin and crown markers.",
        });
      }
      if (selected && state.image.width > 0) {
        const nearLeftEdge = selected.boundingBox.x < state.image.width * 0.03;
        const nearRightEdge =
          selected.boundingBox.x + selected.boundingBox.width >
          state.image.width * 0.97;
        const nearTopEdge = selected.boundingBox.y < state.image.height * 0.02;
        if (nearLeftEdge || nearRightEdge || nearTopEdge) {
          newErrors.push({
            code: "face-near-edge",
            message: "The face is close to the edge of the photo — there may not be enough room to crop correctly.",
          });
        }
      }

      return {
        ...state,
        phase: "editing",
        detection: {
          landmarks: selected,
          confidence,
          mode: "auto",
          hasRun: true,
          faceCount: candidates.length,
          candidates,
          selectedFaceIndex,
        },
        errors: [
          ...state.errors.filter(
            (e) => !["no-face", "multi-face", "low-confidence", "face-near-edge"].includes(e.code),
          ),
          ...newErrors,
        ],
      };
    }

    case "DETECTION_FAILED":
      return {
        ...state,
        phase: "editing",
        detection: { ...state.detection, hasRun: true },
        errors: [...state.errors, action.error],
      };

    case "SELECT_FACE": {
      const selected = state.detection.candidates[action.index] ?? null;
      return {
        ...state,
        detection: {
          ...state.detection,
          selectedFaceIndex: action.index,
          landmarks: selected,
        },
        manualOverrides: {},
        errors: state.errors.filter((e) => e.code !== "multi-face"),
      };
    }

    case "SET_DETECTION_MODE":
      return { ...state, detection: { ...state.detection, mode: action.mode } };

    case "SET_MANUAL_OVERRIDE": {
      const overrides: ManualOverrides = {
        ...state.manualOverrides,
        [action.target]: action.point,
      };
      return {
        ...state,
        manualOverrides: overrides,
        detection: { ...state.detection, mode: "manual" },
        errors: state.errors.filter(
          (e) => e.code !== "no-face" && e.code !== "low-confidence",
        ),
      };
    }

    case "CLEAR_MANUAL_OVERRIDES":
      return {
        ...state,
        manualOverrides: {},
        detection: { ...state.detection, mode: "auto" },
      };

    case "SET_DRAGGING":
      return { ...state, ui: { ...state.ui, dragging: action.target } };

    case "SET_ZOOM":
      return { ...state, ui: { ...state.ui, zoom: action.zoom } };

    case "SET_PAN":
      return { ...state, ui: { ...state.ui, panX: action.panX, panY: action.panY } };

    case "ADD_ERROR":
      return { ...state, errors: [...state.errors.filter(e => e.code !== action.error.code), action.error] };

    case "DISMISS_ERROR":
      return { ...state, errors: state.errors.filter((e) => e.code !== action.code) };

    case "CLEAR_ERRORS":
      return { ...state, errors: [] };

    default:
      return state;
  }
}
