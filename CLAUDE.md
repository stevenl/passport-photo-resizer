# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project
**passport-photo-resizer** — a browser-based web app that resizes, crops, and formats portrait photographs into compliant passport photos. Fully client-side, no backend: all image processing happens in the browser.

## Key Directories
- **src/** – Main application source code
  - `App.tsx` – Main application component (currently Vite starter template)
  - `main.tsx` – React entry point
  - `assets/` – SVG assets and images
  - **No other components yet** – Feature pages (upload, crop, format, export) to be implemented
- **docs/** – Documentation (currently minimal README)
- **public/** – Static assets for production

## Code Architecture

### Current State
- React + TypeScript with Vite starter template
- Single-page application with basic HMR setup
- All image processing (resize/crop/format) will be client-side via Canvas/OffscreenCanvas
- Face detection via MediaPipe Face Landmarker (to be implemented)
- State management and routing TBD as multi-step features are built

### Planned Architecture
- Component-driven with functional React components and hooks
- TypeScript strict mode for type safety
- Tests colocalized with source (`*.test.ts` / `*.test.tsx`)
- No server/backend dependencies

### Key Considerations
1. **Image Processing**: All processing happens client-side in browser via Canvas/OffscreenCanvas
2. **Compliance**: Passport photo specifications must be explicit and documented, not hardcoded magic numbers
3. **Formats**: Need to handle various image formats including HEIC/HEIF (may require conversion library)
4. **Face Detection**: MediaPipe Face Landmarker will inform crop geometry (chin/crown positioning)
5. **Deployments**: Target GitHub Pages (static hosting only), compatible with Cloudflare Pages/Netlify

## Commands

### Development
- `npm run dev` – Start dev server with HMR
- `npm run build` – Production build
- `npm run lint` – Run Oxlint linting
- `npm run preview` – Preview production build locally

### Testing (when implemented)
- `npm test` – Run unit and integration tests (Vitest + React Testing Library)
- May add `npx vitest` or `npx playwright` for specific test types

### Code Quality
- `npm run lint` – Lint the entire codebase with Oxlint rules
- Type checking: `npm run build` includes TypeScript type checking via `tsc -b`

## Conventions
- **Component patterns**: Functional components with hooks
- **Code organization**: Tests colocalized with source (`*.test.ts` / `*.test.tsx`)
- **Type safety**: TypeScript strict mode
- **No server**: All features must be browser-compatible

## Open Questions to Resolve
1. **Routing library**: React Router? or client-side navigation?
2. **State management**: Local component state vs reducer as complexity grows
3. **Supported countries**: Which passport photo standards/countries to support (affects crop presets)
4. **Image format support**: HEIC/HEIF compatibility requirements

## Development Notes
- Update this file's "Key Directories" and "Conventions" sections as structure solidifies
- Be mindful of GitHub Pages' base-path requirements when configuring Vite's `base` option