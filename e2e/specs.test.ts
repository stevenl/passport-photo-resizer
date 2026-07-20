import { test, expect } from "@playwright/test";
import { stubMediaPipe, uploadPortrait } from "./helpers/setup";

test.beforeEach(async ({ context, page }) => {
  await stubMediaPipe(context);
  await page.goto("/");
  await uploadPortrait(page);
  // Wait for the specs panel to be visible before each test
  await page.locator('[data-testid="specs-width"]').waitFor({ timeout: 8_000 });
});

// ---------------------------------------------------------------------------
// Default values
// ---------------------------------------------------------------------------
test.describe("specs panel — default values", () => {
  test("defaults to 35mm width", async ({ page }) => {
    await expect(page.locator('[data-testid="specs-width"]')).toHaveValue("35");
  });

  test("defaults to 45mm height", async ({ page }) => {
    await expect(page.locator('[data-testid="specs-height"]')).toHaveValue("45");
  });

  test("defaults to 34mm head height", async ({ page }) => {
    await expect(page.locator('[data-testid="specs-head-height"]')).toHaveValue("34");
  });

  test("defaults to 300 DPI", async ({ page }) => {
    await expect(page.locator('[data-testid="specs-dpi"]')).toHaveValue("300");
  });

  test("shows the output canvas pixel size", async ({ page }) => {
    // 35mm at 300dpi = 413px, 45mm at 300dpi = 531px
    await expect(page.getByText(/413.*531|531.*413/)).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Preset selection
// ---------------------------------------------------------------------------
test.describe("specs panel — presets", () => {
  test("selecting US Passport preset updates width to 50.8mm", async ({ page }) => {
    await page
      .locator('[data-testid="specs-preset"]')
      .selectOption({ label: "US Passport / Visa (2×2 in)" });
    await expect(page.locator('[data-testid="specs-width"]')).toHaveValue("50.8");
  });

  test("selecting US Passport preset updates height to 50.8mm", async ({ page }) => {
    await page
      .locator('[data-testid="specs-preset"]')
      .selectOption({ label: "US Passport / Visa (2×2 in)" });
    await expect(page.locator('[data-testid="specs-height"]')).toHaveValue("50.8");
  });

  test("selecting EU Visa preset updates width to 35mm", async ({ page }) => {
    await page
      .locator('[data-testid="specs-preset"]')
      .selectOption({ label: "Schengen / EU Visa (35×45mm)" });
    await expect(page.locator('[data-testid="specs-width"]')).toHaveValue("35");
  });

  test("applying a preset updates the output pixel size display", async ({ page }) => {
    await page
      .locator('[data-testid="specs-preset"]')
      .selectOption({ label: "US Passport / Visa (2×2 in)" });
    // 50.8mm at 300dpi = exactly 600px
    await expect(page.getByText(/600.*600/)).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Manual input
// ---------------------------------------------------------------------------
test.describe("specs panel — manual input", () => {
  test("typing a new width updates the value", async ({ page }) => {
    const input = page.locator('[data-testid="specs-width"]');
    await input.fill("40");
    await input.blur();
    await expect(input).toHaveValue("40");
  });

  test("typing a new DPI updates the pixel size display", async ({ page }) => {
    const dpiInput = page.locator('[data-testid="specs-dpi"]');
    await dpiInput.fill("600");
    await dpiInput.blur();
    // The UI rounds 35mm at 600 DPI (826.77px) to 827px.
    await expect(page.getByText(/827/)).toBeVisible();
  });
});
