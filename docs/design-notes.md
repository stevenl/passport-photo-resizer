# Design Notes — Passport Photo Resizer

## Brief grounding
Subject: a measurement instrument disguised as a photo tool. The real content
isn't "photo editing" — it's converting a human head into compliant
millimeters. The emotional register is precision, not creativity. Think
draftsman's table / optician's chart / passport booth signage, not a photo
filter app.

## Token system

### Color (the "drafting table" palette)
- `--paper: #F3F1EA` — warm graph-paper background, not stark white
- `--ink: #1C2230` — near-black blue-ink for text/lines
- `--ink-soft: #5B6472` — secondary text
- `--line: #C9C2B2` — hairline rule / grid color on paper
- `--measure: #B8472F` — terracotta-red, used ONLY for measurement lines,
  the chin/crown markers, and the head-height dimension — i.e. it always
  means "this is a measurement," never decoration
- `--ok: #3C6E52` — confidence-good / success
- `--warn: #C08A1E` — low-confidence warning
- `--panel: #FFFFFF` — card surfaces floating on the paper bg

This is NOT the AI-default cream+terracotta combo used decoratively — the
terracotta is reserved exclusively as a semantic "measurement" signal, never
for buttons or generic accents. Primary actions use ink, not the accent.

### Type
- Display/headings: "Fragment Mono" feel is wrong for headings — use a
  condensed grotesk, **Archivo** (700/600), tight letter-spacing, set in caps
  for section labels — reads like stenciled equipment labels.
- Body: **Inter** — neutral, legible, gets out of the way.
- Data/measurement face: **JetBrains Mono** — every number (mm, px, %, DPI)
  is set in mono so figures align like a spec sheet / caliper readout. This
  is the one deliberate, specific choice: numbers always look like
  measurements, never like prose.

### Layout
Two-pane workbench: left rail = specs/controls (looks like a form on a
clipboard), right/main = the canvas stage on a faint graph-paper grid
background, because graph paper is literally what the geometry engine is
doing — plotting points to a coordinate system.

### Signature element
The **dimension line**: a horizontal/vertical line with perpendicular tick
caps and an inline mono numeric label, like architectural drawings. Used for
the actual chin→crown line on canvas, AND echoed in the UI chrome (e.g. under
the app title, on stat readouts, on the confidence meter) as a recurring
graphic motif tying the brand to the literal function of the tool.

## What I rejected
- Near-black bg + neon accent (default #2) — too "tech startup," wrong for a
  bureaucratic/precision tool.
- Numbered 01/02/03 step markers as decoration — the UI flow IS sequential
  (upload → specs → detect → adjust → export) so a *progress rail* is
  justified, styled as a tick-marked ruler rather than circles+numbers.
