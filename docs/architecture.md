Passport Photo Resizer – Frontend Architecture Specification
============================================================

## 1. High-Level Architecture

This is a **single-page, fully client-side application** built around a separation of:

* UI layer (React)
* Geometry engine (pure functions)
* Rendering layer (Canvas)
* Detection layer (MediaPipe)

### Core principle:

> React manages state. Canvas renders pixels. The geometry engine does not depend on either.

---

## 2. System Layers

```text id="arch1"
┌──────────────────────────────┐
│        React UI Layer        │
│  (controls, inputs, state)   │
└──────────────┬───────────────┘
               ↓
┌──────────────────────────────┐
│     Geometry Engine          │
│ (pure deterministic logic)   │
└──────────────┬───────────────┘
               ↓
┌──────────────────────────────┐
│   Rendering / Canvas Layer   │
│ (preview + export drawing)   │
└──────────────┬───────────────┘
               ↓
┌──────────────────────────────┐
│  MediaPipe Face Detection    │
└──────────────────────────────┘
```

---

# 3. State Model (Critical)

All application state is centralized.

## 3.1 Global App State

```ts id="state1"
type AppState = {
  image: {
    original: ImageBitmap;
    working: ImageBitmap;
    width: number;
    height: number;
  };

  specs: {
    widthMm: number;
    heightMm: number;
    headHeightMm: number;
    dpi: number;
  };

  detection: {
    landmarks: FaceLandmarks | null;
    confidence: number;
    mode: "auto" | "manual";
  };

  manualOverrides: {
    chin?: Point;
    crown?: Point;
  };

  transform: {
    scale: number;
    translateX: number;
    translateY: number;
    rotation: number;
  };

  crop: {
    x: number;
    y: number;
    width: number;
    height: number;
  };

  ui: {
    zoom: number;
    panX: number;
    panY: number;
    dragging: "none" | "chin" | "crown" | "image";
  };
};
```

---

## 3.2 Key Design Rule

> All geometry derives from state. Nothing is stored as pixel results.

No “editing pixels in place”. Everything is recomputed.

---

# 4. React Component Architecture

## 4.1 Component Tree

```text id="react1"
<App>
  ├── <UploadPanel />
  ├── <SpecsPanel />
  ├── <PreviewStage />
  │     ├── <CanvasRenderer />
  │     ├── <LandmarkOverlay />
  │     └── <CropOverlay />
  ├── <ControlsPanel />
  ├── <ExportPanel />
</App>
```

---

## 4.2 Component Responsibilities

### UploadPanel

* File upload
* Camera capture (mobile)
* Decodes image into ImageBitmap

---

### SpecsPanel

* Width / height (mm)
* Head height (mm)
* DPI

Triggers recompute of geometry engine.

---

### PreviewStage (IMPORTANT)

This is a **non-React-drawing zone**

It contains:

* Canvas rendering
* Pointer interactions
* Zoom/pan logic
* Landmark dragging

React does NOT re-render this continuously.

---

### CanvasRenderer

* Draws working image
* Applies transform matrix
* Renders crop rectangle
* Renders landmarks

Runs at:

* requestAnimationFrame loop

NOT React render cycle.

---

### LandmarkOverlay

* Chin marker
* Crown marker
* Eye guide lines
* Head height line

---

### ExportPanel

* Generate final image
* Choose JPG / PNG
* Generate print sheet layout

---

# 5. Rendering System

## 5.1 Dual Canvas Strategy

Two canvases layered:

```text id="canvas1"
[ Landmark Overlay Canvas ]
[ Crop/UI Canvas          ]
[ Working Image Canvas     ]
```

---

## 5.2 Rendering Rules

* Working image drawn first
* Transform applied via matrix
* Overlays drawn last
* No DOM-based rendering for image manipulation

---

## 5.3 Render Loop

```ts id="renderloop"
function render() {
  clearCanvas();

  drawWorkingImage(state.image.working, state.transform);

  drawCrop(state.crop);

  drawLandmarks(state.detection.landmarks, state.manualOverrides);

  drawGuides(state.specs);

  requestAnimationFrame(render);
}
```

---

# 6. Interaction System

## 6.1 Pointer Handling

All interactions handled in canvas layer:

### Events:

* pointerdown
* pointermove
* pointerup
* wheel (zoom)

---

## 6.2 Drag Logic

```text id="drag1"
if click near chin marker → drag chin
if click near crown marker → drag crown
if click background → pan image
```

---

## 6.3 Hit Detection

Use pixel-distance threshold:

```text id="hit1"
distance(pointer, marker) < 10px → selectable
```

---

# 7. Geometry Engine Integration

## 7.1 Pure Function Model

```ts id="geo1"
function computeGeometry(state: AppState): GeometryResult
```

Returns:

```ts id="geo2"
type GeometryResult = {
  scale: number;
  headHeightPx: number;
  crop: Rect;
  eyeLine: number;
};
```

---

## 7.2 Trigger Conditions

Recompute geometry when:

* new image loaded
* specs changed
* landmarks updated
* manual overrides changed

---

## 8. Face Detection Module

## 8.1 Lifecycle

```text id="mp1"
load MediaPipe model once
↓
run inference on image load
↓
store landmarks in state
↓
freeze unless re-run requested
```

---

## 8.2 Performance Rule

* Detection runs once per image
* NOT continuous video mode (important for performance + simplicity)

---

# 9. Working Image System

## 9.1 Creation

On image upload:

* decode full-resolution image
* create working copy:

```text id="work1"
working = downscale(original, max 1600px)
```

---

## 9.2 Purpose

Working image is used for:

* preview rendering
* smooth zoom/pan
* fast landmark interaction

---

## 9.3 Export Rule

```text id="export1"
FINAL OUTPUT ALWAYS USES ORIGINAL IMAGE
```

Apply transform matrix to original at export time.

---

# 10. Export Pipeline

## 10.1 Single Image Export

```text id="exp1"
original image
→ apply transform
→ apply crop
→ render to canvas
→ encode JPG/PNG
→ download
```

---

## 10.2 Print Sheet Export

```text id="exp2"
final photo
→ duplicate into grid
→ apply spacing rules
→ render A4 or 4x6 canvas
→ export PDF or image
```

---

# 11. Performance Architecture

## 11.1 Rules

* No React re-render loop for canvas
* No per-frame face detection
* No image re-decode after load
* No repeated scaling operations

---

## 11.2 Optimization Techniques

* OffscreenCanvas (if available)
* ImageBitmap instead of Image elements
* requestAnimationFrame rendering only
* memoized geometry calculations

---

# 12. Critical System Invariants

## 12.1 Geometry purity

> Geometry engine must be deterministic and stateless.

---

## 12.2 Canvas is ephemeral

> Canvas is just a visual layer, never source of truth.

---

## 12.3 Original image is immutable

> Never modified after upload.

---

## 12.4 Landmark stability

* Auto detection = base state
* Manual overrides = patch layer
* Final = merged view

---

# 13. Error Handling UX

## 13.1 Detection failure flow

* show overlay: “Face not detected”
* allow manual chin/crown placement
* continue pipeline

---

## 13.2 Multi-face detection

* highlight all faces
* ask user to select primary subject

---

## 13.3 Low confidence

* yellow warning overlay
* suggest manual correction

---

# 14. What this architecture gives you

This structure guarantees:

### ✔ No React rendering issues with canvas

### ✔ No geometry drift bugs

### ✔ Stable manual correction system

### ✔ High-performance mobile interaction

### ✔ Clean export pipeline from original image

### ✔ Fully deterministic passport compliance logic
