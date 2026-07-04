# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project
**passport-photo-resizer** — a browser-based web app that resizes, crops, and formats portrait photographs into compliant passport photos. Fully client-side, no backend: all image processing happens in the browser. No images are ever uploaded to a server; no personal data is collected or stored.

## V1 Scope

This is a fast MVP build (days, not weeks), primarily implemented by Claude Code. The following scope decisions are settled — do not add these without an explicit request:

| Area                            | Decision                                                                                                  |
|---------------------------------|-----------------------------------------------------------------------------------------------------------|
| Image formats                   | JPG/PNG only. **No HEIC/HEIF support.** Reject other formats at upload with a clear error.                |
| Max file size                   | 20 MB                                                                                                     |
| Camera capture                  | **Out of scope for v1.** File upload only (file picker + drag/drop). Do not build `getUserMedia` capture. |
| Country/document presets        | US, UK, Schengen, plus a custom mm entry option. No other countries for v1.                               |
| Export / print-sheet generation | Main thread. **No Web Worker** for v1.                                                                    |
| Testing                         | Written alongside each feature/milestone, not batched at the end.                                         |

See "Deferred to v2" below for what's explicitly out of scope right now.

## Key Directories
- **src/** – Main application source code
  - `App.tsx` – Main application component (currently Vite starter template)
  - `main.tsx` – React entry point
  - `assets/` – SVG assets and images
  - **No other components yet** – Feature areas (upload, spec form, detection, crop, export) to be implemented per the milestone order below
- **docs/** – Documentation (currently minimal README)
- **public/** – Static assets for production

## Code Architecture

### Current State
- React + TypeScript with Vite starter template
- Single-page application with basic HMR setup
- No feature code yet — build follows the milestone order below

### Planned Architecture
Core modules are kept decoupled from React so the render loop stays fast and the math stays independently testable:

- **Geometry engine** — pure functions, no React/DOM dependency: mm↔px conversion, chin-to-crown height calculation, crop-box computation from a target head-height spec. Passport photo specifications (head height ranges, dimensions) must be explicit named constants/config, not magic numbers.
- **Detection layer** — wraps MediaPipe Face Landmarker; lazy-loaded, runs detection on the uploaded image, returns normalized landmarks.
- **Render engine** — dual-canvas setup (one canvas for image + crop transform, one overlay for grid/measurement lines/landmark visualization), driven by `requestAnimationFrame`, decoupled from React state so drag/zoom stays responsive.
- **Export pipeline** — renders current crop/scale + spec to an offscreen canvas at target resolution; produces single-photo or multi-up print-sheet output (JPG/PNG). Runs on the main thread.
- **Reducer** — holds image data, detected landmarks, spec, crop transform (offset/scale/rotation), UI mode. Use `useReducer` or a small state library (e.g. Zustand) — avoid ad hoc component state once crop/spec/detection state starts interacting.

**Data flow:** Upload → decode image → run detection → geometry engine proposes initial crop → user adjusts via render engine (writes to reducer) → render loop reads reducer state each frame → export pipeline reads final state on demand.

- Component-driven with functional React components and hooks
- TypeScript strict mode for type safety
- Tests colocalized with source (`*.test.ts` / `*.test.tsx`)
- No server/backend dependencies

### Key Considerations
1. **Image Processing**: All processing happens client-side in browser via Canvas/OffscreenCanvas
2. **Compliance**: Passport photo specifications must be explicit and documented, not hardcoded magic numbers
3. **Formats**: JPG/PNG only — no HEIC/HEIF conversion layer in v1
4. **Face Detection**: MediaPipe Face Landmarker will inform crop geometry (chin/crown positioning)
5. **Deployments**: Target GitHub Pages (static hosting only), compatible with Cloudflare Pages/Netlify. Be mindful of GitHub Pages' base-path requirements when configuring Vite's `base` option.

## Build Order (Milestones)

Follow this sequence; write tests alongside each milestone, not after.

1. **Foundation** — scaffold, two-pane responsive layout, upload flow (file picker + drag/drop, format/size validation, immediate display). Tests: file validation logic, upload UI states.
2. **Specs + Detection** — spec form (US/UK/Schengen presets + custom mm, mm-increment steppers), MediaPipe integration + landmark overlay, geometry engine (chin-to-crown calc, crop/scale computation). Tests: geometry engine unit tests written alongside the math, spec form validation tests.
3. **Interactive Crop** — dual-canvas render loop (pan/zoom, grid overlay, measurement guide lines), reducer wiring for real-time adjustment, targeting sub-250ms perceived update latency on mobile-class devices. Tests: reducer action tests, control interaction tests.
4. **Export + Sheets** — preview at target physical size/DPI, JPG/PNG export, multi-up print sheet generation (start with fixed sheet sizes, e.g. 4x6in). Tests: export dimension/DPI math, Playwright test for the download flow.
5. **Test, Polish, Ship** — full Playwright E2E (upload → detect → crop → export), visual snapshot of a generated print sheet, deploy to GitHub Pages via GitHub Actions, confirm zero network calls involving image data.

## Commands

### Development
- `npm run dev` – Start dev server with HMR
- `npm run build` – Production build
- `npm run lint` – Run Oxlint linting
- `npm run preview` – Preview production build locally

### Testing
- `npm test` – Run unit and integration tests (Vitest + React Testing Library)
- `npx playwright test` – Run E2E and visual snapshot tests

### Code Quality
- `npm run lint` – Lint the entire codebase with Oxlint rules
- Type checking: `npm run build` includes TypeScript type checking via `tsc -b`

## Conventions
- **Component patterns**: Functional components with hooks
- **Code organization**: Tests colocalized with source (`*.test.ts` / `*.test.tsx`)
- **Type safety**: TypeScript strict mode
- **No server**: All features must be browser-compatible
- **Testing cadence**: Tests are written alongside the feature they cover, in the same milestone — not deferred to a final testing pass

## Deferred to v2 (do not build unless explicitly asked)
- Camera capture (mobile `getUserMedia`)
- HEIC/HEIF input support
- Web Worker offloading for export/print-sheet generation
- Additional country presets beyond US/UK/Schengen
- Deeper accessibility/i18n pass beyond basic keyboard operability

## Development Notes
- Update this file's "Key Directories" and "Conventions" sections as structure solidifies
- Be mindful of GitHub Pages' base-path requirements when configuring Vite's `base` option