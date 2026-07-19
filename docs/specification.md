Passport Photo Resizer – Full MVP Specification
===============================================

## 1. Purpose

A fully browser-based web application that resizes, crops, and formats portrait photographs into compliant passport photos.

The application ensures that:

* The subject’s head height (chin to crown) matches official requirements.
* The final image matches user-defined physical dimensions (mm).
* The output is suitable for official submission (passport, visa, ID).
* All processing happens locally in the browser.
* No images are uploaded to any server.

---

## 2. Design Goals

The application shall:

* Be fully client-side (no backend required)
* Preserve user privacy (no image upload or storage externally)
* Achieve high accuracy (target ±1 mm head height precision)
* Maintain original image quality (no enhancement or degradation)
* Be mobile-friendly and support camera capture
* Provide fast interactive editing (<250ms preview updates on mobile)
* Support printable outputs including multi-photo sheets
* Be free to use

---

## 3. Functional Requirements

---

## 3.1 Image Upload & Capture

Users shall be able to:

* Upload images from device storage
* Capture images using device camera (mobile)

Supported formats:

* JPG / JPEG
* PNG
* HEIC (optional)

Max file size:

* 20 MB

The uploaded image shall be displayed immediately.

---

## 3.2 Passport Specification Input

Users shall define:

| Parameter          | Description                     |
| ------------------ | ------------------------------- |
| Output width (mm)  | Final printed width             |
| Output height (mm) | Final printed height            |
| Head height (mm)   | Chin to crown distance          |
| DPI                | Output resolution (default 300) |

Validation rules:

* Positive numeric values only
* Decimal values allowed
* Reasonable bounds enforced

---

## 3.3 Face Detection

The system shall automatically detect facial landmarks:

* Chin
* Crown (top of head)
* Eyes
* Nose
* Face outline

From these landmarks, the system calculates:

* Head height
* Head centre
* Eye alignment

### Detection Overlay

Detected landmarks shall be visualised on the image.

### Confidence Scoring

The detection system shall provide a confidence score.

If confidence is below a threshold (e.g. 85%):

* The user shall be prompted to verify landmarks.

---

## 3.4 Manual Face Landmark Correction (Fallback)

If automatic detection is incorrect or fails, the user shall be able to manually adjust:

* Chin marker (draggable)
* Crown marker (draggable)

The system shall:

* Update head height in real time
* Recalculate scaling dynamically
* Update crop preview instantly

User actions:

* Reset to automatic detection
* Cancel manual mode
* Continue editing with manual correction applied

If no face is detected:

* User may still place chin and crown manually to proceed

---

## 3.5 Image Scaling

The system shall compute:

Scale factor:

```
scale = desired_head_height / detected_head_height
```

The image shall be scaled using high-quality resampling while preserving aspect ratio.

---

## 3.6 Automatic Crop

The system shall generate a crop rectangle based on:

* Output width and height (mm → px using DPI)
* Head position
* Eye alignment standards

Crop positioning rules:

* Head horizontally centred
* Eyes positioned in upper third of frame (passport standard approximation)
* Chin positioned to match required head height

---

## 3.7 Manual Crop Adjustment

Users shall be able to:

* Pan image
* Zoom image
* Move crop area
* Reset to automatic suggestion

All changes update preview in real time.

---

## 3.8 Preview System

The preview shall display:

* Crop boundaries
* Chin and crown markers
* Head height measurement line
* Eye line guide
* Final output frame

---

## 3.9 Image Processing Pipeline

```
Upload image
→ Decode image
→ Generate working preview copy
→ Detect face landmarks
→ Compute head height
→ Calculate scale factor
→ Apply transformation parameters
→ Generate crop
→ Render preview
→ User adjusts if needed
→ Export from original image
```

---

## 3.10 Image Quality Preservation (Critical Requirement)

The system shall preserve image fidelity.

### Allowed transformations only:

* Scaling (geometric only)
* Cropping
* Rotation (if needed)
* Format conversion (JPEG/PNG export)

### Prohibited:

* AI enhancement
* Sharpening
* Smoothing / beautification
* Colour correction
* Exposure adjustment
* Background replacement (MVP)
* Any form of retouching

### Output requirements:

* JPEG exports: high-quality compression (95–100%)
* PNG exports: lossless
* Avoid unnecessary recompression where possible

---

## 3.11 Preview vs Original Image Handling

The application shall maintain two image representations:

### Working Copy (Low Resolution)

Used for:

* Live preview rendering
* Face detection visualisation
* User interaction (zoom/pan/drag)
* Performance optimisation (especially mobile)

### Original Image (Full Resolution)

Used for:

* Final export generation
* All precise scaling and cropping calculations

### Key Rule:

> The final exported image shall ALWAYS be generated from the original image, not the working copy.

All edits shall be stored as transformation parameters, not pixel modifications.

---

## 3.12 Export Generation

Users can export:

### Single Photo

* JPG
* PNG

### Print Sheet

Layouts:

* 2 images
* 4 images
* 6 images
* 8 images

Format:

* 4×6 inch default print sheet
* Optional future support for A4/Letter

Spacing:

* 5mm margins between photos

---

## 4. User Interface Requirements

### Main UI Flow

1. Upload / Camera capture
2. Enter specifications
3. Automatic detection & preview
4. Manual adjustment (if needed)
5. Generate output
6. Download or print sheet

### Core UI Components

* Image preview canvas
* Landmark overlay layer
* Crop rectangle tool
* Zoom slider
* Reset button
* Generate button
* Download button

---

## 5. Error Handling

The system shall handle:

* No face detected
* Multiple faces detected
* Low confidence detection
* Image too small
* Image too blurry
* Face too close to edge
* Unsupported file format

Each error shall provide actionable guidance.

---

## 6. Performance Requirements

* Preview update: <100ms desktop, <250ms mobile
* Export generation: <2 seconds desktop, <5 seconds mobile
* Face detection: near real-time

---

## 7. Privacy Requirements

The application shall:

* Never upload images
* Never store images remotely
* Never require login
* Operate entirely client-side
* Work offline once loaded (ideal PWA target)

---

## 8. Technology Stack (Recommended)

Frontend:

* React + TypeScript
* Vite

Image Processing:

* HTML5 Canvas / OffscreenCanvas

Face Detection:

* MediaPipe Face Landmarker

Styling:

* Tailwind CSS

Hosting:

* Static hosting only (GitHub Pages / Cloudflare Pages / Netlify)

---

## 9. Acceptance Criteria

The MVP is complete when:

* A user can upload or capture a portrait image
* The system automatically detects facial landmarks
* The user can define passport dimensions and head height
* The system scales and crops the image accordingly
* Manual landmark correction works when needed
* Preview updates in real time
* Final export matches original image quality rules
* Output can be downloaded as JPG/PNG
* Multi-photo print sheets are generated correctly
* Entire process runs fully in-browser with no uploads

