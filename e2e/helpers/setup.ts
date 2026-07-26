import { type Page, type BrowserContext } from "@playwright/test";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const PORTRAIT_FIXTURE = path.join(__dirname, "../fixtures/portrait.jpg");

/**
 * Stubs all MediaPipe CDN requests so tests run without network access and
 * don't wait for the ~10MB model download.
 *
 * - WASM files → minimal valid WASM module (just the magic bytes + version)
 * - The .task model file → empty response with 200
 * - Any other jsDelivr / Google Storage request → 200 empty
 *
 * The app's getFaceLandmarker() will still attempt to initialise but will
 * fail gracefully (the stub isn't a real MediaPipe model). Face detection
 * errors are surfaced as the "detector-init-failed" error state, which the
 * tests account for by either:
 *   a) Testing UI flows that don't require a detection result, or
 *   b) Injecting fake landmarks directly via page.evaluate().
 */
export async function stubMediaPipe(context: BrowserContext): Promise<void> {
  // Minimal valid WASM: magic (0x00 0x61 0x73 0x6d) + version (0x01 0x00 0x00 0x00)
  const minimalWasm = Buffer.from([0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00]);

  await context.route(/cdn\.jsdelivr\.net|storage\.googleapis\.com/, (route) => {
    const url = route.request().url();
    if (url.endsWith(".wasm")) {
      route.fulfill({
        status: 200,
        contentType: "application/wasm",
        body: minimalWasm,
      });
    } else {
      // Model file and any other assets — return empty 200
      route.fulfill({ status: 200, body: "" });
    }
  });
}

/**
 * Uploads the portrait fixture via the hidden file input.
 * Works around the fact that the file input is hidden (opacity-0 / display
 * none approach) by using Playwright's setInputFiles directly on the input.
 */
export async function uploadPortrait(page: Page, fixturePath = PORTRAIT_FIXTURE): Promise<void> {
  const fileInput = page.locator('[data-testid="file-input"]');
  await fileInput.setInputFiles(fixturePath);
}

/**
 * Injects fake face detection landmarks directly into app state by
 * dispatching a custom event that the app listens for in test mode.
 *
 * Alternative when the MediaPipe stub causes detection to fail: call this
 * after upload to simulate a successful detection result.
 */
export async function injectFakeDetectionResult(page: Page): Promise<void> {
  await page.evaluate(() => {
    // Construct landmarks that look like a real detection result.
    // Coordinates are in original-image space (200×250 image).
    const fakeLandmarks = {
      rawPoints: [] as Array<{ x: number; y: number }>,
      leftEye: { x: 70, y: 90 },
      rightEye: { x: 130, y: 90 },
      noseTip: { x: 100, y: 130 },
      chin: { x: 100, y: 190 },
      crown: { x: 100, y: 50 },
      boundingBox: { x: 50, y: 40, width: 100, height: 160 },
    };

    // Dispatch a synthetic event that the test harness page script picks up.
    window.dispatchEvent(
      new CustomEvent("__e2e_inject_detection__", {
        detail: {
          candidates: [fakeLandmarks],
          confidence: 0.95,
        },
      }),
    );
  });
}

/**
 * Waits for the app to transition to the editing phase.
 * Either because detection succeeded, or because we injected a fake result.
 */
export async function waitForEditingPhase(page: Page): Promise<void> {
  // The preview stage and controls panel are both present in editing phase
  await page.waitForSelector('[data-testid="preview-stage"]', { timeout: 10_000 });
  await page.waitForSelector('[data-testid="btn-redetect"]', { timeout: 10_000 });
}
