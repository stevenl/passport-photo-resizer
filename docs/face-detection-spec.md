Face Detection + Geometry Engine Specification
==============================================

## 1. Purpose

This module is responsible for converting a raw portrait image into a **precise, measurable head model** that can be scaled and cropped to passport specifications.

It must:

* Detect face landmarks using MediaPipe
* Derive a stable chin-to-crown measurement
* Convert pixel measurements to real-world mm (via DPI)
* Produce deterministic crop geometry
* Support manual overrides without breaking consistency

---

# 2. Core Concepts

## 2.1 Coordinate System

All processing occurs in image pixel space:

* Origin: top-left (0, 0)
* X increases → right
* Y increases → down

All measurements are converted only at final export stage.

---

## 2.2 Two Image Layers

| Layer          | Purpose                               |
| -------------- | ------------------------------------- |
| Original Image | Final export source (full resolution) |
| Working Image  | UI + detection + interaction          |

All geometry must reference **original image coordinates**, even if preview uses a scaled version.

---

# 3. Face Detection (MediaPipe)

## 3.1 Model

Use:

* MediaPipe Face Landmarker (Face Mesh, 468 points)

Outputs:

* 468 facial landmarks in normalized coordinates (0–1)

Convert to pixel space:

```text id="mpx1"
x_px = x_norm * image_width
y_px = y_norm * image_height
```

---

## 3.2 Required Landmark Groups

We derive key points:

### Eyes

* Left eye: average of outer + inner eye corners
* Right eye: same

### Nose

* Nose tip landmark

### Jaw / Chin region

* Jawline landmarks (MediaPipe indices 152–175 approx)
* Chin is NOT explicit → must be inferred

### Forehead / Crown region

* No explicit crown point exists
* Must be inferred from upper face mesh

---

# 4. Chin Detection Algorithm

## 4.1 Problem

MediaPipe does not provide a true “chin tip” point.

## 4.2 Solution: Jaw Curve Minimum

We define chin as:

> The lowest Y value point among stable jawline landmarks.

### Steps:

1. Extract jawline points:

    * indices: jaw contour region (e.g. 152–175)

2. Convert to pixels

3. Select:

```text id="chin1"
chin = point with MAX(y)
```

4. Stabilisation:

To reduce jitter:

* Take bottom 3 points
* Average them:

```text id="chin2"
chin = average(bottom_3_points_by_y)
```

---

# 5. Crown (Top of Head) Detection

## 5.1 Problem

No skull-top landmark exists in MediaPipe.

## 5.2 Solution: Forehead Projection Method

We estimate crown as:

### Step 1: Identify forehead region

Use:

* midpoint between eyes

```text id="forehead_base"
forehead_base = (left_eye + right_eye) / 2
```

### Step 2: Estimate head direction vector

Compute vertical face axis:

```text id="face_axis"
face_axis = normalize(nose_tip - midpoint_between_eyes)
```

### Step 3: Project upward

We extend beyond forehead:

```text id="crown_estimate"
crown = forehead_base - (face_axis * k)
```

Where:

* k = 0.6 to 0.9 × face height (calibrated constant)

### Step 4: Clamp within face bounding box

Ensure crown does not exceed image bounds.

---

# 6. Head Height Calculation

## 6.1 Definition

Head height = distance from:

> Chin → Crown (estimated)

## 6.2 Formula

```text id="head_height"
headHeightPx = distance(chin, crown)
```

Euclidean distance:

```text id="distance"
√((x2-x1)² + (y2-y1)²)
```

---

# 7. DPI and Real-World Scaling

## 7.1 Conversion

User provides:

* head height in mm
* DPI

Convert mm → pixels:

```text id="mm_to_px"
px = (mm / 25.4) * DPI
```

---

## 7.2 Target Scaling Factor

```text id="scale_factor"
scale = desired_head_height_px / detected_head_height_px
```

Where:

* desired_head_height_px = mm_to_px(head_height_mm)

---

# 8. Image Scaling Pipeline

## 8.1 Rule

Scaling must be applied to transformation matrix only, NOT pixel mutation.

## 8.2 Transform Model

Store:

```json id="transform"
{
  "scale": 1.23,
  "translateX": 0,
  "translateY": 0,
  "rotation": 0
}
```

All rendering uses this transform.

---

# 9. Crop Geometry System

## 9.1 Output Frame

User defines:

* width_mm
* height_mm
* DPI

Convert:

```text id="frame_px"
width_px = mm_to_px(width_mm)
height_px = mm_to_px(height_mm)
```

---

## 9.2 Crop Anchor Point

Primary anchor:

> Chin position (most stable reference)

---

## 9.3 Crop Positioning Rules

### Step 1: Place chin

* Chin is placed at:

    * vertical offset = required_head_height_px from top of frame

### Step 2: Align head center

* Horizontal centre of face aligned to frame center

### Step 3: Fit crop box

Crop box is:

```text id="crop_box"
width_px × height_px
```

---

## 10. Manual Landmark Overrides

## 10.1 State Model

Landmarks have two layers:

### A. Auto-detected

From MediaPipe

### B. User overrides

If user drags chin or crown:

```json id="override"
{
  "chin": {x, y},
  "crown": {x, y}
}
```

---

## 10.2 Resolution Rule

Final landmarks:

```text id="resolve"
final_landmark = override ?? auto_detected
```

---

## 10.3 Behaviour Rules

* Manual overrides immediately recompute:

    * head height
    * scale factor
    * crop position
* No recalibration required
* No reset unless user clicks “Reset”

---

# 11. Stability & Smoothing

## 11.1 Landmark jitter reduction

Apply exponential smoothing:

```text id="smooth"
P_new = α * P_current + (1 - α) * P_previous
```

Recommended:

* α = 0.6

---

## 11.2 Frame locking

Once detection is stable:

* freeze landmarks unless:

    * user requests re-detect
    * image changes

---

# 12. Coordinate Transformation Pipeline

This is the full system flow:

```text id="pipeline"
IMAGE INPUT
   ↓
WORKING COPY GENERATION
   ↓
MEDIA PIPE LANDMARK DETECTION
   ↓
CHIN + CROWN ESTIMATION
   ↓
HEAD HEIGHT COMPUTATION
   ↓
USER OVERRIDES APPLY (if any)
   ↓
DPI CONVERSION (mm → px)
   ↓
SCALE FACTOR COMPUTATION
   ↓
TRANSFORM MATRIX UPDATE
   ↓
CROP RECTANGLE GENERATION
   ↓
RENDER PREVIEW (working image)
   ↓
EXPORT USING ORIGINAL IMAGE
```

---

# 13. Critical Invariants

These must NEVER be violated:

### 1. Original image is never mutated

All operations are transforms.

---

### 2. Export always uses original image

Never use preview or working copy.

---

### 3. Landmarks are independent of zoom

Zoom affects display only, not geometry.

---

### 4. Crop is always derived, not stored

Crop is recalculated from:

* landmarks
* transform state
* DPI rules

---

# 14. Failure Handling

## Case: Crown estimation unstable

Fallback:

* Use bounding box top + offset ratio (0.15–0.25 of face height)

## Case: Chin unstable

Fallback:

* lowest jawline cluster average

## Case: Face not detected

Allow manual placement of:

* chin
* crown

---

# 15. Summary

This engine gives you:

* deterministic head measurement
* reproducible passport compliance logic
* manual correction safety net
* clean separation of:

    * detection
    * geometry
    * rendering
    * export
