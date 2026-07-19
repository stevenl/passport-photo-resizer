import { describe, it, expect } from "vitest";
import { mmToPx, pxToMm } from "./units";

describe("mmToPx", () => {
  it("converts 25.4 mm at 1 DPI to exactly 1 px", () => {
    expect(mmToPx(25.4, 1)).toBeCloseTo(1);
  });
  it("converts 1 mm at 300 DPI to ~11.81 px", () => {
    expect(mmToPx(1, 300)).toBeCloseTo(11.811, 2);
  });
  it("converts 35 mm at 300 DPI (standard passport width)", () => {
    // 35 / 25.4 * 300 = 413.386…
    expect(mmToPx(35, 300)).toBeCloseTo(413.386, 2);
  });
  it("returns 0 for 0 mm", () => {
    expect(mmToPx(0, 300)).toBe(0);
  });
  it("scales linearly with mm", () => {
    expect(mmToPx(20, 300)).toBeCloseTo(mmToPx(10, 300) * 2);
  });
  it("scales linearly with DPI", () => {
    expect(mmToPx(35, 600)).toBeCloseTo(mmToPx(35, 300) * 2);
  });
});

describe("pxToMm", () => {
  it("converts 1 px at 1 DPI to 25.4 mm", () => {
    expect(pxToMm(1, 1)).toBeCloseTo(25.4);
  });
  it("returns 0 for 0 px", () => {
    expect(pxToMm(0, 300)).toBe(0);
  });
  it("is the exact inverse of mmToPx", () => {
    const px = mmToPx(34, 300);
    expect(pxToMm(px, 300)).toBeCloseTo(34, 10);
  });
  it("round-trips correctly for common passport dimensions", () => {
    for (const mm of [35, 45, 50.8, 34]) {
      expect(pxToMm(mmToPx(mm, 300), 300)).toBeCloseTo(mm, 8);
    }
  });
});
