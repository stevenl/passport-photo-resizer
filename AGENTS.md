# AGENTS.md

Guidance for AI coding agents (Claude Code, Cursor, Copilot, Gemini CLI,
Aider, etc.) working in this repository.

---

## What this project is

A fully browser-based passport photo resizer. Everything — face detection,
cropping, scaling, export — runs locally in the browser via MediaPipe and
the Canvas API. No image ever leaves the device.

---

## Commands

```bash
npm install          # install dependencies (first time only)
npm run dev          # local dev server at http://localhost:5173
npm run build        # production build → dist/
npm run lint         # Run Oxlint linting
npm run preview      # serve the production build locally
npm test             # run the unit test suite (vitest, non-watch)
npm run test:watch   # vitest in watch mode during development
npx tsc --noEmit     # typecheck without emitting files
```

All commands require Node.js 18+.

---

## Architecture

Four layers with strict one-way dependencies:

```
React UI  →  Geometry Engine  →  Rendering / Canvas  →  MediaPipe Detection
```

```
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

**Geometry engine (`src/geometry/`) is pure.** No React, no DOM, no Canvas.
Every function is deterministic and stateless. `computeGeometry(state)`
takes the full `AppState` and returns a `GeometryResult` — always
recomputed, never cached.

**Canvas rendering is decoupled from React.** `PreviewStage` runs a
`requestAnimationFrame` loop that reads from mutable refs, not React state.
Never trigger canvas updates through React re-renders.

**Detection runs once per image**, not continuously. `useFaceDetection`
guards against re-running for the same bitmap.

---

## Source layout

```
src/
  types/index.ts          Core domain types — Point, Rect, FaceLandmarks,
                          AppState, GeometryResult. No React/DOM imports.
  geometry/
    primitives.ts         Vector math (distance, midpoint, normalize, …)
    units.ts              mmToPx / pxToMm conversions
    chinCrown.ts          Chin detection (jaw curve minimum) and crown
                          estimation (forehead projection algorithm)
    computeGeometry.ts    The main pure geometry engine
    index.ts              Barrel export
  detection/
    faceDetector.ts       MediaPipe Face Landmarker wrapper + rescaleLandmarks
  rendering/
    draw.ts               Canvas draw functions + exported toScreen() transform
    export.ts             Single-photo and print-sheet export pipeline +
                          exported pure layout helpers
  state/
    initialState.ts       createInitialState() + SPEC_PRESETS
    reducer.ts            appReducer — all state transitions
  hooks/
    useFaceDetection.ts   Runs MediaPipe once per image, exposes rerun()
  components/
    Primitives.tsx        Brand atoms: Eyebrow, DimensionLine, RulerProgress,
                          Panel, PrimaryButton, SecondaryButton
    UploadPanel.tsx       File upload and camera capture
    SpecsPanel.tsx        Width/height/head-height/DPI inputs + presets
    PreviewStage.tsx      Dual-canvas stage with pointer interaction
    ControlsPanel.tsx     Zoom, face selection, manual override controls
    ExportPanel.tsx       Single photo + print sheet download
    ErrorBanner.tsx       Surfaces AppError[] with actionable guidance
  App.tsx                 Wires reducer, geometry, detection, and panels
  main.tsx                React entry point
  index.css               Tailwind base + .bg-graph-paper utility
```

---

## State model

```typescript
type AppState = {
  phase: "upload" | "specs" | "editing" | "exporting";
  image: {
    original: ImageBitmap | null;  // full-res, NEVER mutated
    working: ImageBitmap | null;   // downscaled ≤1600px, used for preview
    width: number; height: number; // original dimensions
    workingWidth: number; workingHeight: number;
  };
  specs: {
    widthMm: number; heightMm: number;
    headHeightMm: number; dpi: number;
  };
  detection: {
    landmarks: FaceLandmarks | null;
    confidence: number;            // 0–1 heuristic, not native MediaPipe
    mode: "auto" | "manual";
    hasRun: boolean;
    faceCount: number;
    candidates: FaceLandmarks[];
    selectedFaceIndex: number;
  };
  manualOverrides: { chin?: Point; crown?: Point };
  transform: { scale: number; translateX: number; translateY: number; rotation: number };
  crop: Rect;                      // derived, never stored as truth
  ui: { zoom: number; panX: number; panY: number; dragging: DraggingTarget };
  errors: AppError[];
};
```

---

## Critical invariants — never violate these

1. **Original image is never mutated.** All operations are transform parameters.
2. **Export always uses the original image**, not the working copy.
3. **Canvas is ephemeral** — it is a visual output, never a source of truth.
4. **Geometry is pure** — `computeGeometry` must stay deterministic and stateless.
5. **Manual overrides are a patch layer** — `final = override ?? autoDetected`.
6. **Landmarks are always in original-image pixel space**, even when detected
   on the downscaled working copy. Use `rescaleLandmarks` after detection.
7. **Wheel events must use native `addEventListener` with `{ passive: false }`.**
   React's synthetic `onWheel` prop is passive and cannot call `preventDefault`.

---

## Workflow states

- `upload` — image loading stage
- `specs` — passport specification entry
- `editing` — face landmark adjustment (dragging chin/crown)
- `exporting` — ExportPanel generates and downloads the final image

---

## Testing

Run with `npm test`. The environment is `node` (Vitest) — no browser or DOM.

### Practice rule

**Every new feature and every changed code path must ship with tests.**
This is not optional. A PR that adds or modifies behaviour without
corresponding tests will be incomplete.

- New pure functions → unit test in the same directory as the source file,
  named `<module>.test.ts`.
- New behaviour that crosses module boundaries → integration test in
  `src/integration/`, named `<concern>.test.ts`.
- Browser-API or WASM-dependent code (canvas, MediaPipe) → document why it
  is untestable in a comment in the source file; do not write a test that
  mocks these away — mocked canvas tests give false confidence.

### Unit tests

Live alongside their source files as `*.test.ts`.

**Testable without mocking (pure functions):**
- All of `src/geometry/` including `fitView.ts`
- `src/state/reducer.ts` and `src/state/initialState.ts`
- `validateFile`, `checkImageQuality`, `computeWorkingCopyDimensions` in `src/utils/imageLoader.ts`
- `toScreen` and `clearCanvas` in `src/rendering/draw.ts`
- `computeOutputDimensions`, `computePrintSheetLayout`, `PRINT_SHEET_SIZES_MM` in `src/rendering/export.ts`
- `rescaleLandmarks`, `getModelLoadingState`, `subscribeToModelState` in `src/detection/faceDetector.ts`

**Explicitly out of scope for unit tests (require browser APIs or WASM):**
- `decodeOriginalImage`, `createWorkingCopy` — require `createImageBitmap`
- `drawWorkingImage`, `drawCrop`, etc. — require `CanvasRenderingContext2D`
- `renderFinalPhoto`, `renderPrintSheet`, `canvasToBlob`, `downloadBlob` — require DOM
- `detectFaces`, `getFaceLandmarker` — require MediaPipe WASM + network
- `main.tsx` eager-load call — side-effectful startup, nothing to assert

### Integration tests

Live in `src/integration/` as `*.test.ts`. They test the seams between
modules — where one pure layer's output feeds another's input — without
mocking either side.

Current integration suites:
- `reducerGeometry.test.ts` — `appReducer` action sequences → `computeGeometry` output
- `fitViewTransform.test.ts` — `computeFitView` output → `toScreen` placement
- `imageLoaderPipeline.test.ts` — `validateFile` + `computeWorkingCopyDimensions` + `checkImageQuality`

Add a new integration test when a feature involves two or more modules
cooperating and the unit tests for each module do not cover their
interaction.

---

## Known limitations

- **HEIC** files are passed directly to `createImageBitmap()` without
  conversion. Safari decodes them natively via the OS; other browsers do
  not. Users on Chrome/Edge/Firefox should export as JPG or PNG first.
- **Blur detection** is not implemented — only pixel dimensions are checked.
- **Confidence score** is a heuristic (face size relative to frame), not a
  calibrated MediaPipe output.
- **Print sheets** export as JPEG/PNG raster, not PDF.
- **MediaPipe model** (~10MB) loads from Google's CDN on first visit. The
  PWA service worker caches it for subsequent offline use.

---

## CI / deployment

`.github/workflows/deploy.yml` — typecheck, test, and build run on every
branch push and PR. Deploy to GitHub Pages runs only on pushes to `main`.

`.github/dependabot.yml` — weekly PRs for npm and GitHub Actions version
updates. Security advisories open PRs immediately regardless of schedule.

First-time Pages setup: **Settings → Pages → Source → GitHub Actions**.
