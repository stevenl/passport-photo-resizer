import React, { useEffect, useRef, useCallback } from "react";
import type { AppState, FaceLandmarks, GeometryResult, Point } from "@/types";
import {
  clearCanvas,
  drawCrop,
  drawFaceCandidates,
  drawLandmarks,
  drawWorkingImage,
  type ViewTransform,
} from "@/rendering/draw";
import { isWithinHitRadius } from "@/geometry/primitives";

interface PreviewStageProps {
  state: AppState;
  geometry: GeometryResult;
  onDragChin: (originalPoint: Point) => void;
  onDragCrown: (originalPoint: Point) => void;
  onDraggingChange: (target: "none" | "chin" | "crown" | "image") => void;
  onPan: (panX: number, panY: number) => void;
  onZoom: (zoom: number) => void;
}

/**
 * The canvas stage. Per architecture.md §4.2, this is explicitly a
 * "non-React-drawing zone": once mounted, all visual updates happen via
 * requestAnimationFrame against a mutable ref-held view of the latest
 * state, NOT via React re-renders. React only re-renders this component
 * when its props identity changes (new image, new geometry callback refs),
 * never on every pointer move.
 */
export default function PreviewStage({
  state,
  geometry,
  onDragChin,
  onDragCrown,
  onDraggingChange,
  onPan,
  onZoom,
}: PreviewStageProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const imageCanvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);

  // Mutable "latest" refs so the render loop never depends on React state
  // directly (architecture.md §11.1: "No React re-render loop for canvas").
  const latestState = useRef(state);
  const latestGeometry = useRef(geometry);
  latestState.current = state;
  latestGeometry.current = geometry;

  const dragTargetRef = useRef<"none" | "chin" | "crown" | "image">("none");
  const lastPointerRef = useRef<Point | null>(null);

  const getView = useCallback((): ViewTransform => {
    const s = latestState.current;
    return {
      zoom: s.ui.zoom,
      panX: s.ui.panX,
      panY: s.ui.panY,
      bitmapToOriginalScale:
        s.image.workingWidth > 0 ? s.image.width / s.image.workingWidth : 1,
      dpr: window.devicePixelRatio || 1,
    };
  }, []);

  const resizeCanvases = useCallback(() => {
    const container = containerRef.current;
    const imgCanvas = imageCanvasRef.current;
    const overlayCanvas = overlayCanvasRef.current;
    if (!container || !imgCanvas || !overlayCanvas) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = container.getBoundingClientRect();
    const w = Math.max(1, Math.round(rect.width));
    const h = Math.max(1, Math.round(rect.height));

    for (const canvas of [imgCanvas, overlayCanvas]) {
      if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
        canvas.width = w * dpr;
        canvas.height = h * dpr;
        canvas.style.width = `${w}px`;
        canvas.style.height = `${h}px`;
        // Note: we deliberately do NOT call ctx.scale(dpr, dpr) here. The
        // render loop clears with setTransform(identity) every frame (see
        // clearCanvas), which would wipe out a one-time scale anyway. DPR
        // is instead folded into the per-frame ViewTransform (see getView),
        // so every draw call composes it consistently.
      }
    }
  }, []);

  // requestAnimationFrame render loop, per architecture.md §5.3. Runs
  // continuously while mounted; cost per frame is just 2 cheap canvas
  // draws, so this is fine for a single-page tool (no React re-renders).
  useEffect(() => {
    function render() {
      const s = latestState.current;
      const geo = latestGeometry.current;
      const imgCanvas = imageCanvasRef.current;
      const overlayCanvas = overlayCanvasRef.current;
      if (!imgCanvas || !overlayCanvas) {
        rafRef.current = requestAnimationFrame(render);
        return;
      }
      const imgCtx = imgCanvas.getContext("2d");
      const overlayCtx = overlayCanvas.getContext("2d");
      if (!imgCtx || !overlayCtx) {
        rafRef.current = requestAnimationFrame(render);
        return;
      }

      clearCanvas(imgCtx);
      clearCanvas(overlayCtx);

      const view = getView();

      if (s.image.working) {
        drawWorkingImage(imgCtx, s.image.working, view);
      }

      if (geo.isValid || s.detection.mode === "manual") {
        drawCrop(overlayCtx, overlayCanvas.width, overlayCanvas.height, geo.crop, view);
      }

      if (s.detection.candidates.length > 1) {
        drawFaceCandidates(
          overlayCtx,
          s.detection.candidates,
          s.detection.selectedFaceIndex,
          view,
        );
      }

      drawLandmarks(overlayCtx, geo, view, s.ui.dragging);

      rafRef.current = requestAnimationFrame(render);
    }

    rafRef.current = requestAnimationFrame(render);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [getView]);

  useEffect(() => {
    resizeCanvases();
    const observer = new ResizeObserver(() => resizeCanvases());
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [resizeCanvases]);

  // --- Pointer interaction (architecture.md §6) ---

  const screenToOriginal = useCallback(
    (screenX: number, screenY: number): Point => {
      const view = getView();
      const bx = (screenX - view.panX) / view.zoom;
      const by = (screenY - view.panY) / view.zoom;
      return { x: bx * view.bitmapToOriginalScale, y: by * view.bitmapToOriginalScale };
    },
    [getView],
  );

  const originalToScreen = useCallback(
    (p: Point): Point => {
      const view = getView();
      const bx = p.x / view.bitmapToOriginalScale;
      const by = p.y / view.bitmapToOriginalScale;
      return { x: bx * view.zoom + view.panX, y: by * view.zoom + view.panY };
    },
    [getView],
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      const rect = overlayCanvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      const screenPoint = { x: e.clientX - rect.left, y: e.clientY - rect.top };
      const geo = latestGeometry.current;

      const hasChin = geo.chin.x !== 0 || geo.chin.y !== 0;
      const hasCrown = geo.crown.x !== 0 || geo.crown.y !== 0;

      // No valid pair yet (e.g. detection failed and the user hasn't placed
      // both markers): a tap places the next missing marker directly,
      // per specification.md §3.4 "user may still place chin and crown
      // manually to proceed" — rather than requiring a drag-from-nowhere.
      if (!geo.isValid) {
        const originalPoint = screenToOriginal(screenPoint.x, screenPoint.y);
        if (!hasChin) {
          onDragChin(originalPoint);
          dragTargetRef.current = "chin";
        } else if (!hasCrown) {
          onDragCrown(originalPoint);
          dragTargetRef.current = "crown";
        } else {
          dragTargetRef.current = "image";
        }
        lastPointerRef.current = screenPoint;
        onDraggingChange(dragTargetRef.current);
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
        return;
      }

      const chinScreen = originalToScreen(geo.chin);
      const crownScreen = originalToScreen(geo.crown);

      let target: "none" | "chin" | "crown" | "image" = "image";
      if (isWithinHitRadius(screenPoint, chinScreen, 14)) {
        target = "chin";
      } else if (isWithinHitRadius(screenPoint, crownScreen, 14)) {
        target = "crown";
      }

      dragTargetRef.current = target;
      lastPointerRef.current = screenPoint;
      onDraggingChange(target);
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [originalToScreen, onDraggingChange, onDragChin, onDragCrown, screenToOriginal],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      const rect = overlayCanvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      const screenPoint = { x: e.clientX - rect.left, y: e.clientY - rect.top };

      const target = dragTargetRef.current;
      if (target === "none") return;

      if (target === "chin") {
        onDragChin(screenToOriginal(screenPoint.x, screenPoint.y));
      } else if (target === "crown") {
        onDragCrown(screenToOriginal(screenPoint.x, screenPoint.y));
      } else if (target === "image" && lastPointerRef.current) {
        const dx = screenPoint.x - lastPointerRef.current.x;
        const dy = screenPoint.y - lastPointerRef.current.y;
        const s = latestState.current;
        onPan(s.ui.panX + dx, s.ui.panY + dy);
      }
      lastPointerRef.current = screenPoint;
    },
    [onDragChin, onDragCrown, onPan, screenToOriginal],
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      dragTargetRef.current = "none";
      lastPointerRef.current = null;
      onDraggingChange("none");
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        /* no-op: pointer capture may already be released */
      }
    },
    [onDraggingChange],
  );

  const handleWheel = useCallback(
    (e: React.WheelEvent<HTMLCanvasElement>) => {
      e.preventDefault();
      const s = latestState.current;
      const delta = -e.deltaY * 0.001;
      const newZoom = Math.min(4, Math.max(0.2, s.ui.zoom * (1 + delta)));
      onZoom(newZoom);
    },
    [onZoom],
  );

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full overflow-hidden rounded-md bg-ink/5 bg-graph-paper"
    >
      <canvas ref={imageCanvasRef} className="absolute inset-0" />
      <canvas
        ref={overlayCanvasRef}
        className="absolute inset-0 touch-none"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onWheel={handleWheel}
      />
      {!state.image.working && (
        <div className="absolute inset-0 flex items-center justify-center text-sm text-ink-faint">
          No image loaded
        </div>
      )}
      {state.image.working && !geometry.isValid && (
        <div className="pointer-events-none absolute left-1/2 top-3 -translate-x-1/2 rounded-sm bg-ink/90 px-3 py-1.5 font-mono text-xs text-paper shadow-sm">
          {geometry.chin.x === 0 && geometry.chin.y === 0
            ? "Tap the chin to place it"
            : "Now tap the crown (top of head)"}
        </div>
      )}
    </div>
  );
}

export type { FaceLandmarks };
