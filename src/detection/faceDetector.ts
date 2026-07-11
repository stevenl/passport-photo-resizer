import {
  FaceLandmarker,
  FilesetResolver,
  type FaceLandmarkerResult,
} from "@mediapipe/tasks-vision";
import type { FaceLandmarks, Point, Rect } from "@/types";
import {
  estimateChin,
  estimateCrown,
  estimateCrownFallback,
  isCrownEstimateStable,
  JAWLINE_INDICES,
  LEFT_EYE_CORNER_INDICES,
  NOSE_TIP_INDEX,
  RIGHT_EYE_CORNER_INDICES,
} from "@/geometry/chinCrown";
import { boundingBoxOf, midpoint } from "@/geometry/primitives";

const WASM_BASE =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm";
const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";

let landmarkerPromise: Promise<FaceLandmarker> | null = null;

/**
 * Loads the MediaPipe Face Landmarker model exactly once and caches the
 * promise, per architecture.md §8.1: "load MediaPipe model once".
 */
export function getFaceLandmarker(): Promise<FaceLandmarker> {
  if (!landmarkerPromise) {
    landmarkerPromise = (async () => {
      const filesetResolver = await FilesetResolver.forVisionTasks(WASM_BASE);
      try {
        return await FaceLandmarker.createFromOptions(filesetResolver, {
          baseOptions: {
            modelAssetPath: MODEL_URL,
            delegate: "GPU",
          },
          runningMode: "IMAGE",
          numFaces: 5, // detect multiple faces so we can surface the multi-face UX
          minFaceDetectionConfidence: 0.5,
          minFacePresenceConfidence: 0.5,
        });
      } catch (gpuErr) {
        // Some browsers/devices lack a usable WebGL context for the GPU
        // delegate (e.g. certain mobile WebViews) — fall back to CPU.
        console.warn("Face Landmarker GPU delegate failed, falling back to CPU:", gpuErr);
        return await FaceLandmarker.createFromOptions(filesetResolver, {
          baseOptions: {
            modelAssetPath: MODEL_URL,
            delegate: "CPU",
          },
          runningMode: "IMAGE",
          numFaces: 5,
          minFaceDetectionConfidence: 0.5,
          minFacePresenceConfidence: 0.5,
        });
      }
    })().catch((err) => {
      // Allow retry on next call if init fails.
      landmarkerPromise = null;
      throw err;
    });
  }
  return landmarkerPromise;
}

function normPointToPixels(
  normPoint: { x: number; y: number },
  width: number,
  height: number,
): Point {
  // face-detection-spec.md §3.1: x_px = x_norm * width, y_px = y_norm * height
  return { x: normPoint.x * width, y: normPoint.y * height };
}

export interface DetectionRunResult {
  faces: FaceLandmarks[];
  /** Mean confidence across all detected faces (0–1). */
  confidence: number;
}

/**
 * Runs face landmark detection on a bitmap and converts MediaPipe's raw
 * output into our domain model (chin/crown/eyes/nose), entirely in the
 * pixel space of the SUPPLIED bitmap. Callers detecting on the working
 * (downscaled) image are responsible for rescaling landmarks back into
 * original-image coordinates — see `rescaleLandmarks` below.
 */
export async function detectFaces(
  bitmap: ImageBitmap,
): Promise<DetectionRunResult> {
  const landmarker = await getFaceLandmarker();
  const result: FaceLandmarkerResult = landmarker.detect(bitmap);

  const width = bitmap.width;
  const height = bitmap.height;
  const imageBounds: Rect = { x: 0, y: 0, width, height };

  const faces: FaceLandmarks[] = [];
  const confidences: number[] = [];

  const landmarksList = result.faceLandmarks ?? [];
  const blendshapesList = result.faceBlendshapes ?? [];

  for (let i = 0; i < landmarksList.length; i++) {
    try {
      const mesh = landmarksList[i];
      const rawPoints = mesh.map((p) => normPointToPixels(p, width, height));

      const leftEye = midpoint(
        rawPoints[LEFT_EYE_CORNER_INDICES[0]],
        rawPoints[LEFT_EYE_CORNER_INDICES[1]],
      );
      const rightEye = midpoint(
        rawPoints[RIGHT_EYE_CORNER_INDICES[0]],
        rawPoints[RIGHT_EYE_CORNER_INDICES[1]],
      );
      const noseTip = rawPoints[NOSE_TIP_INDEX];

      const jawlinePoints = JAWLINE_INDICES.map((idx) => rawPoints[idx]).filter(
        Boolean,
      );
      if (jawlinePoints.length === 0) continue;

      const boundingBox = boundingBoxOf(rawPoints);
      const faceHeightPx = boundingBox.height;

      const chin = estimateChin(jawlinePoints);

      let crown = estimateCrown(leftEye, rightEye, noseTip, {
        imageBounds,
        faceHeightPx,
      });

      if (!isCrownEstimateStable(crown, imageBounds, leftEye, rightEye, noseTip)) {
        crown = estimateCrownFallback(boundingBox, faceHeightPx);
      }

      faces.push({
        rawPoints,
        leftEye,
        rightEye,
        noseTip,
        chin,
        crown,
        boundingBox,
      });

      // MediaPipe's blendshapes don't map 1:1 to a single "confidence" score;
      // we approximate using detection presence via landmark count as a
      // simple, deterministic stand-in, then refine using face size relative
      // to frame (very small faces => lower confidence) per spec §3.3.
      const sizeRatio = Math.min(
        1,
        (boundingBox.width * boundingBox.height) / (width * height) / 0.05,
      );
      const presenceScore = blendshapesList[i] ? 1 : 0.85;
      confidences.push(Math.min(1, 0.5 + 0.5 * sizeRatio) * presenceScore);
    } catch (faceErr) {
      // Skip this single malformed candidate rather than failing detection
      // entirely for every face in the image.
      console.warn("Skipping one face candidate due to a processing error:", faceErr);
    }
  }

  const confidence =
    confidences.length > 0
      ? confidences.reduce((a, b) => a + b, 0) / confidences.length
      : 0;

  return { faces, confidence };
}

/**
 * Rescales a FaceLandmarks set detected on the working (downscaled) bitmap
 * into ORIGINAL image pixel coordinates, per face-detection-spec.md
 * §2.2: "All geometry must reference original image coordinates, even if
 * preview uses a scaled version."
 */
export function rescaleLandmarks(
  landmarks: FaceLandmarks,
  workingWidth: number,
  workingHeight: number,
  originalWidth: number,
  originalHeight: number,
): FaceLandmarks {
  const sx = originalWidth / workingWidth;
  const sy = originalHeight / workingHeight;
  const scalePoint = (p: Point): Point => ({ x: p.x * sx, y: p.y * sy });
  const scaleRect = (r: Rect): Rect => ({
    x: r.x * sx,
    y: r.y * sy,
    width: r.width * sx,
    height: r.height * sy,
  });

  return {
    rawPoints: landmarks.rawPoints.map(scalePoint),
    leftEye: scalePoint(landmarks.leftEye),
    rightEye: scalePoint(landmarks.rightEye),
    noseTip: scalePoint(landmarks.noseTip),
    chin: scalePoint(landmarks.chin),
    crown: scalePoint(landmarks.crown),
    boundingBox: scaleRect(landmarks.boundingBox),
  };
}
