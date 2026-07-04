# passport-photo-resizer — v1 Build Plan (MVP)

**Goal:** A fully client-side, browser-based app that resizes, crops, and formats portrait photos into compliant passport photos. No backend, no image ever leaves the browser.

**Pace:** Fast — MVP in days. Built primarily via Claude Code, with tests written alongside each milestone (not batched).

---

## 1. V1 Scope Decisions

| Decision                      | Choice                                                       |
|-------------------------------|--------------------------------------------------------------|
| HEIC/HEIF support             | **Out of scope for v1** — JPG/PNG only, reject other formats |
| Camera capture (mobile)       | **Deferred to v2** — file upload only                        |
| Country/document presets      | US, UK, Schengen, plus custom mm entry                       |
| Export/print-sheet generation | Main thread (no Web Worker for v1)                           |
| Testing approach              | Written alongside each milestone                             |
| Team                          | Solo dev + Claude Code doing most implementation             |

---

## 2. Tech Stack

- **Framework:** React + TypeScript + Vite
- **Styling:** Tailwind CSS
- **Image processing:** HTML5 Canvas / OffscreenCanvas (main-thread render loop)
- **Face detection:** MediaPipe Face Landmarker (WASM, client-side)
- **State:** Reducer-based (useReducer or Zustand) — decoupled from the canvas render loop
- **Linting:** Oxlint
- **Testing:** Vitest (unit) + React Testing Library (component) + Playwright (E2E + visual snapshots)
- **Hosting:** Static — GitHub Pages primary; Cloudflare Pages / Netlify as alternatives

---

## 3. Architecture

Core modules are kept decoupled from React so the render loop stays fast and the math stays testable in isolation:

- **Geometry engine** — pure functions: mm↔px conversion, chin-to-crown height calculation, crop-box computation from a target head-height spec.
- **Detection layer** — wraps MediaPipe Face Landmarker; lazy-loaded, runs detection on the uploaded image, returns normalized landmarks.
- **Render engine** — dual-canvas setup (image + crop transform, overlay for grid/measurement lines/landmarks), driven by `requestAnimationFrame`, decoupled from React state.
- **Export pipeline** — renders current crop/scale + spec to an offscreen canvas at target resolution; produces single-photo or multi-up print-sheet output (JPG/PNG). Runs on the main thread for v1.
- **Reducer** — holds image data, detected landmarks, spec, crop transform (offset/scale/rotation), UI mode.

**Data flow:** Upload → decode image → run detection → geometry engine proposes initial crop → user adjusts via render engine (writes to reducer) → render loop reads reducer state each frame → export pipeline reads final state on demand.

---

## 4. Milestones

### Day 1 — Foundation
- Scaffold: Vite + React + TS + Tailwind + Oxlint
- Write `CLAUDE.md` up front (tech stack, conventions, testing approach) — important to get right before feature coding starts, since Claude Code drives most implementation
- Two-pane responsive layout shell (specs/controls left, preview right)
- Upload flow: file picker + drag/drop, format/size validation (JPG/PNG only, 20MB max), immediate canvas display
- **Tests:** unit tests for file validation logic; component test for upload UI states (empty/loading/error)

### Day 2 — Specs + Detection
- Spec form: US/UK/Schengen presets + custom mm entry, mm-increment steppers, validation against official ranges
- MediaPipe Face Landmarker integration, landmark overlay visualization
- Geometry engine: chin-to-crown calculation, crop/scale computation
- **Tests:** unit tests for geometry engine (mm↔px conversion, crop computation) written alongside the math, not after; component tests for spec form validation

### Day 3 — Interactive Crop
- Dual-canvas render loop: pan/zoom, grid overlay, measurement guide lines
- Reducer wiring for real-time adjustment; verify update latency feels instant on a mobile-class device (~250ms target)
- **Tests:** reducer unit tests for crop transform actions; component tests for control interactions (drag/zoom handlers firing correct actions)

### Day 4 — Export + Sheets
- Preview at target physical size/DPI
- JPG/PNG export
- Multi-up print sheet generation (fixed sheet sizes to start, e.g. 4x6in)
- **Tests:** unit tests for export dimension/DPI math; Playwright test for the export download flow

### Day 5 — Test, Polish, Ship
- Playwright E2E: full upload → detect → crop → export happy path
- Visual snapshot test of a generated print sheet
- Fix known-bug classes proactively (Vite `@/` alias config, canvas transform reset on resize, prop/type mismatches)
- Deploy to GitHub Pages via GitHub Actions
- Manual + automated check confirming zero network calls involving image data

---

## 5. Explicitly Deferred to v2

- Camera capture (mobile `getUserMedia`)
- HEIC/HEIF input support
- Web Worker offloading for export/print-sheet generation
- Additional country presets beyond US/UK/Schengen
- Deeper accessibility/i18n pass beyond basic keyboard operability

---

## 6. Privacy & Compatibility Requirements (carried through all milestones)

- All processing happens locally in the browser — no images uploaded to any server, no personal data collected or stored
- Compatible with modern browsers, responsive across screen sizes
- Preview updates targeting under 250ms on mobile devices
