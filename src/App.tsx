import React, { useMemo, useReducer, useCallback } from "react";
import { createInitialState } from "@/state/initialState";
import { appReducer } from "@/state/reducer";
import { computeGeometry } from "@/geometry";
import { useFaceDetection } from "@/hooks/useFaceDetection";

import UploadPanel from "@/components/UploadPanel";
import SpecsPanel from "@/components/SpecsPanel";
import PreviewStage from "@/components/PreviewStage";
import ControlsPanel from "@/components/ControlsPanel";
import ExportPanel from "@/components/ExportPanel";
import ErrorBanner from "@/components/ErrorBanner";
import { DimensionLine, Panel, RulerProgress, type StepKey } from "@/components/Primitives";

export default function App() {
  const [state, dispatch] = useReducer(appReducer, undefined, createInitialState);

  const geometry = useMemo(() => computeGeometry(state), [state]);

  const { rerun, modelState } = useFaceDetection({
    working: state.image.working,
    workingWidth: state.image.workingWidth,
    workingHeight: state.image.workingHeight,
    originalWidth: state.image.width,
    originalHeight: state.image.height,
    onStart: () => dispatch({ type: "DETECTION_STARTED" }),
    onSuccess: (candidates, confidence) =>
      dispatch({
        type: "DETECTION_SUCCEEDED",
        candidates,
        confidence,
        selectedFaceIndex: 0,
      }),
    onFailure: (error) => dispatch({ type: "DETECTION_FAILED", error }),
  });

  const handleImageReady = useCallback(
    (params: {
      original: ImageBitmap;
      working: ImageBitmap;
      width: number;
      height: number;
      workingWidth: number;
      workingHeight: number;
      qualityWarnings: string[];
    }) => {
      dispatch({
        type: "IMAGE_LOADED",
        original: params.original,
        working: params.working,
        width: params.width,
        height: params.height,
        workingWidth: params.workingWidth,
        workingHeight: params.workingHeight,
      });
      if (params.qualityWarnings.length > 0) {
        dispatch({
          type: "ADD_ERROR",
          error: { code: "image-too-small", message: params.qualityWarnings[0] },
        });
      }
    },
    [],
  );

  const handleStartOver = useCallback(() => {
    window.location.reload();
  }, []);

  const stepKey: StepKey =
    state.phase === "upload"
      ? "upload"
      : state.phase === "specs"
        ? "specs"
        : state.phase === "exporting"
          ? "exporting"
          : "editing";

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-line bg-panel/80 px-5 py-4 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <DimensionLine />
            <div>
              <h1 className="font-display text-base font-extrabold uppercase tracking-wide text-ink">
                Passport Photo Resizer
              </h1>
              <p className="font-mono text-[11px] text-ink-faint">
                100% local · no uploads, no accounts
              </p>
            </div>
          </div>
          {state.phase !== "upload" && (
            <button
              onClick={handleStartOver}
              className="font-display text-xs font-semibold uppercase tracking-wide text-ink-soft hover:text-ink"
            >
              Start over
            </button>
          )}
        </div>
        <div className="mx-auto mt-4 max-w-md">
          <RulerProgress current={stepKey} />
        </div>
      </header>

      <main className="flex-1 px-5 py-8">
        <div className="mx-auto max-w-6xl">
          {state.errors.length > 0 && (
            <div className="mb-6">
              <ErrorBanner
                errors={state.errors}
                onDismiss={(code) => dispatch({ type: "DISMISS_ERROR", code })}
              />
            </div>
          )}

          {state.phase === "upload" && (
            <div className="flex justify-center py-8">
              <UploadPanel onImageReady={handleImageReady} modelState={modelState} />
            </div>
          )}

          {state.phase !== "upload" && (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[320px_1fr]">
              <div className="space-y-6 lg:order-1">
                <Panel className="p-5">
                  <SpecsPanel
                    specs={state.specs}
                    onChange={(specs) => dispatch({ type: "UPDATE_SPECS", specs })}
                  />
                </Panel>

                {state.phase !== "specs" && (
                  <Panel className="p-5">
                    <ControlsPanel
                      state={state}
                      geometry={geometry}
                      modelState={modelState}
                      onZoomChange={(zoom) => dispatch({ type: "SET_ZOOM", zoom })}
                      onResetCrop={() => {
                        dispatch({ type: "SET_ZOOM", zoom: 1 });
                        dispatch({ type: "SET_PAN", panX: 0, panY: 0 });
                      }}
                      onClearManualOverrides={() => dispatch({ type: "CLEAR_MANUAL_OVERRIDES" })}
                      onSelectFace={(index) => dispatch({ type: "SELECT_FACE", index })}
                      onRedetect={() => rerun()}
                    />
                  </Panel>
                )}
              </div>

              <div className="order-2 flex flex-col gap-4 lg:order-2">
                <div className="h-[60vh] min-h-[420px] lg:h-[calc(100vh-260px)]">
                  <PreviewStage
                    state={state}
                    geometry={geometry}
                    onDragChin={(point) =>
                      dispatch({ type: "SET_MANUAL_OVERRIDE", target: "chin", point })
                    }
                    onDragCrown={(point) =>
                      dispatch({ type: "SET_MANUAL_OVERRIDE", target: "crown", point })
                    }
                    onDraggingChange={(target) => dispatch({ type: "SET_DRAGGING", target })}
                    onPan={(panX, panY) => dispatch({ type: "SET_PAN", panX, panY })}
                    onZoom={(zoom) => dispatch({ type: "SET_ZOOM", zoom })}
                  />
                </div>

                {state.phase !== "specs" && (
                  <Panel className="p-5">
                    <ExportPanel
                      original={state.image.original}
                      geometry={geometry}
                      specs={state.specs}
                    />
                  </Panel>
                )}
              </div>
            </div>
          )}
        </div>
      </main>

      <footer className="border-t border-line px-5 py-4 text-center">
        <p className="font-mono text-[11px] text-ink-faint">
          No image leaves your device. Output is provided as-is — verify
          against your destination country's current requirements before
          submission.
        </p>
      </footer>
    </div>
  );
}
