# Passport Photo Resizer

A fully client-side web app that resizes, crops, and formats portrait photos
into compliant passport/visa/ID photos. Built from `SPECIFICATION.md`,
`ARCHITECTURE.md`, and `FACE_DETECTION_SPEC.md`.

No image you load is ever uploaded anywhere — everything (face detection,
cropping, scaling, export) runs locally in your browser using MediaPipe's
on-device model and the Canvas API.

## Getting started

```bash
npm install
npm run dev      # starts a local dev server, prints a URL to open
```

To build a production bundle:

```bash
npm run build     # outputs to dist/
npm run preview   # serve the production build locally to sanity-check it
```

Requires Node.js 18+.

## How it's organized

This mirrors the layered architecture described in `architecture.md`:

```
src/
  types/            Shared TypeScript types (the AppState shape, etc.)
  geometry/         Pure functions only — chin/crown estimation, head-height
                     math, mm<->px conversion, the computeGeometry() engine.
                     No React, no DOM canvas calls, no side effects.
  detection/        MediaPipe Face Landmarker wrapper + landmark rescaling.
  rendering/        Canvas drawing functions (draw.ts) and the export
                     pipeline (export.ts) — single photo + print sheets.
  state/            The reducer and initial state for the whole app.
  hooks/            useFaceDetection — runs detection once per uploaded image.
  components/       React UI: UploadPanel, SpecsPanel, PreviewStage,
                     ControlsPanel, ExportPanel, ErrorBanner, Primitives.
  App.tsx           Wires the reducer, geometry engine, and panels together.
```

The core invariants from the spec docs are upheld throughout:

- **The original image is never mutated.** A separate downscaled "working"
  copy (max 1600px) is used for preview, detection, and interaction; the
  final export always re-renders from the full-resolution original.
- **The geometry engine is pure and stateless.** `computeGeometry(state)`
  takes the whole app state and returns crop/scale/head-height numbers —
  nothing is cached or stored as "the crop"; it's recomputed on every
  change.
- **Detection runs once per image**, not continuously — there's no live
  video loop, matching `architecture.md` §8.2.
- **Canvas rendering runs on a `requestAnimationFrame` loop**, decoupled
  from React's render cycle, per `architecture.md` §4.2/§5.3/§11.1.

## Design

See `design-notes.md` for the visual-identity rationale (the "drafting
table / measurement instrument" direction, the dimension-line motif, color
and type choices).

## Known simplifications / honest limitations

This is a complete MVP implementation of the spec, but a few things are
worth knowing if you pick this up:

- **HEIC support depends on the browser.** `createImageBitmap()` is used to
  decode uploads. Safari can decode HEIC directly; Chrome and Firefox
  currently cannot. If you need universal HEIC support, you'd add a
  client-side HEIC→JPEG decode step (e.g. `heic2any` or a WASM decoder)
  before handing the file to `decodeOriginalImage()` in
  `src/utils/imageLoader.ts`.
- **Blur detection is not implemented.** `SPECIFICATION.md` §5 lists "image
  too blurry" as an error case; this MVP only checks pixel *dimensions*
  (`checkImageQuality` in `imageLoader.ts`), not actual sharpness. A real
  blur metric (e.g. variance of Laplacian) could be added there.
- **Confidence scoring is a heuristic**, not a native MediaPipe output.
  MediaPipe's Face Landmarker doesn't expose one official "confidence"
  number, so `detectFaces()` approximates one from face size relative to
  the frame. It's reasonable for surfacing "you should double check this"
  in the UI, but isn't a calibrated probability.
- **Print sheets export as a single raster image** (JPEG/PNG), not a PDF.
  The architecture doc mentions "PDF or image" — wiring up actual PDF
  export would mean pulling in the `pdf` skill / a PDF library and feeding
  it the same canvas.
- **MediaPipe loads from Google's CDN at runtime** (per your earlier
  choice). The PWA config caches it after first load so the app keeps
  working offline on a given device, but the very first visit needs
  internet access to fetch the ~10MB model.

## Tech stack

React 18 + TypeScript + Vite, Tailwind CSS, MediaPipe Tasks Vision
(Face Landmarker), Canvas/OffscreenCanvas — matching the stack recommended
in `specification.md` §8.

## Deploying to GitHub Pages

The included Actions workflow (`.github/workflows/deploy.yml`) runs on every push to `main`: it typechecks, runs tests, builds, and deploys automatically.

One manual step is required the first time — in your GitHub repo go to **Settings → Pages → Build and deployment → Source** and select **GitHub Actions**. That's it; the workflow handles everything else.

The live URL will be `https://<your-username>.github.io/<repo-name>/`. The `VITE_BASE_PATH` environment variable in the workflow sets Vite's `base` option to this sub-path automatically, so all assets resolve correctly. Local dev (`npm run dev`) is unaffected and still serves from `/`.

Pull requests run the typecheck, test, and build steps but do not deploy.
