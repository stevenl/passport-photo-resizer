import { test, expect } from "@playwright/test";
import path from "path";
import { fileURLToPath } from "url";
import { stubMediaPipe, uploadPortrait, PORTRAIT_FIXTURE } from "./helpers/setup";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

test.beforeEach(async ({ context, page }) => {
  await stubMediaPipe(context);
  await page.goto("/");
});

// ---------------------------------------------------------------------------
// Initial load
// ---------------------------------------------------------------------------
test.describe("upload screen — initial load", () => {
  test("shows the app title", async ({ page }) => {
    await expect(page.getByRole("heading", { name: /passport photo resizer/i })).toBeVisible();
  });

  test("shows the upload drop zone", async ({ page }) => {
    await expect(page.locator('[data-testid="upload-dropzone"]')).toBeVisible();
  });

  test("shows the privacy assurance message", async ({ page }) => {
    await expect(page.getByText(/nothing you upload ever leaves/i)).toBeVisible();
  });

  test("progress rail is on the Upload step", async ({ page }) => {
    // The RulerProgress component renders step labels
    await expect(page.getByText("Upload").first()).toBeVisible();
  });

  test("does not show Start over button on the upload screen", async ({ page }) => {
    await expect(page.locator('[data-testid="btn-start-over"]')).not.toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// File validation errors
// ---------------------------------------------------------------------------
test.describe("upload screen — file validation", () => {
  test("rejects an unsupported file format", async ({ page }) => {
    const fileInput = page.locator('[data-testid="file-input"]');
    await fileInput.setInputFiles({
      name: "photo.gif",
      mimeType: "image/gif",
      buffer: Buffer.from("GIF89a"),
    });
    await expect(page.locator('[data-testid="upload-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="upload-error"]')).toContainText(/jpg/i);
  });

  test("rejects a file that is too large", async ({ page }) => {
    // Create a buffer just over 20 MB
    const over20mb = Buffer.alloc(20 * 1024 * 1024 + 1, 0xff);
    const fileInput = page.locator('[data-testid="file-input"]');
    await fileInput.setInputFiles({
      name: "huge.jpg",
      mimeType: "image/jpeg",
      buffer: over20mb,
    });
    await expect(page.locator('[data-testid="upload-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="upload-error"]')).toContainText(/20 MB/i);
  });

  test("error disappears when a valid file is subsequently uploaded", async ({ page }) => {
    const fileInput = page.locator('[data-testid="file-input"]');

    // First upload something bad
    await fileInput.setInputFiles({
      name: "bad.bmp",
      mimeType: "image/bmp",
      buffer: Buffer.from("BM"),
    });
    await expect(page.locator('[data-testid="upload-error"]')).toBeVisible();

    // Then upload something good — error should clear
    await fileInput.setInputFiles(PORTRAIT_FIXTURE);
    await expect(page.locator('[data-testid="upload-error"]')).not.toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Successful upload → transitions to specs/editing phase
// ---------------------------------------------------------------------------
test.describe("upload screen — successful upload", () => {
  test("transitions away from the upload screen after a valid image", async ({ page }) => {
    await uploadPortrait(page);
    // Upload screen drops away — the drop zone should be gone
    await expect(page.locator('[data-testid="upload-dropzone"]')).not.toBeVisible({ timeout: 8_000 });
  });

  test("shows the specs panel after upload", async ({ page }) => {
    await uploadPortrait(page);
    await expect(page.locator('[data-testid="specs-width"]')).toBeVisible({ timeout: 8_000 });
  });

  test("shows the Start over button after upload", async ({ page }) => {
    await uploadPortrait(page);
    await expect(page.locator('[data-testid="btn-start-over"]')).toBeVisible({ timeout: 8_000 });
  });

  test("Start over returns to the upload screen", async ({ page }) => {
    await uploadPortrait(page);
    await page.locator('[data-testid="btn-start-over"]').waitFor({ timeout: 8_000 });
    await page.locator('[data-testid="btn-start-over"]').click();
    // Page reloads — upload screen should reappear
    await expect(page.locator('[data-testid="upload-dropzone"]')).toBeVisible({ timeout: 8_000 });
  });
});
