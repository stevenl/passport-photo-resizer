import { describe, it, expect } from "vitest";
import { toScreen, clearCanvas, type ViewTransform } from "./draw";

// ---------------------------------------------------------------------------
// toScreen — the core coordinate transform math
// ---------------------------------------------------------------------------
//
// The full pipeline is:
//   original px  →  (÷ bitmapToOriginalScale)  →  working-bitmap px
//                →  (× zoom + pan)              →  CSS px
//                →  (× dpr)                     →  device px (canvas backing store)

function makeView(overrides: Partial<ViewTransform> = {}): ViewTransform {
  return {
    zoom: 1,
    panX: 0,
    panY: 0,
    bitmapToOriginalScale: 1,
    dpr: 1,
    ...overrides,
  };
}

describe("toScreen — identity transform", () => {
  it("returns the original point unchanged when all transforms are identity", () => {
    const v = makeView();
    expect(toScreen({ x: 100, y: 200 }, v)).toEqual({ x: 100, y: 200 });
  });

  it("maps the origin to the origin", () => {
    expect(toScreen({ x: 0, y: 0 }, makeView())).toEqual({ x: 0, y: 0 });
  });
});

describe("toScreen — bitmapToOriginalScale", () => {
  it("divides original coords by the scale factor", () => {
    // working image is half the resolution of the original
    const v = makeView({ bitmapToOriginalScale: 2 });
    expect(toScreen({ x: 200, y: 400 }, v)).toEqual({ x: 100, y: 200 });
  });

  it("scale of 1 leaves coords unchanged", () => {
    const v = makeView({ bitmapToOriginalScale: 1 });
    expect(toScreen({ x: 50, y: 80 }, v)).toEqual({ x: 50, y: 80 });
  });

  it("scale of 0.5 doubles the screen position (zoomed-out working image)", () => {
    const v = makeView({ bitmapToOriginalScale: 0.5 });
    expect(toScreen({ x: 50, y: 100 }, v)).toEqual({ x: 100, y: 200 });
  });
});

describe("toScreen — zoom", () => {
  it("multiplies the working-bitmap position by zoom", () => {
    const v = makeView({ zoom: 2 });
    expect(toScreen({ x: 100, y: 50 }, v)).toEqual({ x: 200, y: 100 });
  });

  it("zoom of 0.5 halves the screen position", () => {
    const v = makeView({ zoom: 0.5 });
    expect(toScreen({ x: 100, y: 200 }, v)).toEqual({ x: 50, y: 100 });
  });

  it("zoom of 1 is identity", () => {
    const v = makeView({ zoom: 1 });
    expect(toScreen({ x: 75, y: 120 }, v)).toEqual({ x: 75, y: 120 });
  });
});

describe("toScreen — pan", () => {
  it("adds panX and panY to the zoomed position", () => {
    const v = makeView({ panX: 30, panY: -10 });
    expect(toScreen({ x: 100, y: 200 }, v)).toEqual({ x: 130, y: 190 });
  });

  it("pan is applied after zoom", () => {
    // zoom first: x=100 → 200, then pan: 200+50 = 250
    const v = makeView({ zoom: 2, panX: 50, panY: 0 });
    expect(toScreen({ x: 100, y: 0 }, v)).toEqual({ x: 250, y: 0 });
  });

  it("negative pan offsets move the image left/up", () => {
    const v = makeView({ panX: -40, panY: -20 });
    expect(toScreen({ x: 100, y: 100 }, v)).toEqual({ x: 60, y: 80 });
  });
});

describe("toScreen — dpr", () => {
  it("multiplies the final CSS-pixel position by dpr", () => {
    const v = makeView({ dpr: 2 });
    expect(toScreen({ x: 100, y: 50 }, v)).toEqual({ x: 200, y: 100 });
  });

  it("dpr of 3 (high-density display) triples device-pixel output", () => {
    const v = makeView({ dpr: 3 });
    expect(toScreen({ x: 10, y: 20 }, v)).toEqual({ x: 30, y: 60 });
  });

  it("dpr of 1 is identity", () => {
    const v = makeView({ dpr: 1 });
    expect(toScreen({ x: 55, y: 77 }, v)).toEqual({ x: 55, y: 77 });
  });
});

describe("toScreen — composed transforms", () => {
  it("applies scale → zoom → pan → dpr in the correct order", () => {
    // bitmapToOriginalScale=2: 200/2=100, 400/2=200
    // zoom=2:                  100*2=200, 200*2=400
    // pan(+30,-10):            200+30=230, 400-10=390
    // dpr=2:                   230*2=460, 390*2=780
    const v = makeView({ bitmapToOriginalScale: 2, zoom: 2, panX: 30, panY: -10, dpr: 2 });
    const result = toScreen({ x: 200, y: 400 }, v);
    expect(result.x).toBeCloseTo(460);
    expect(result.y).toBeCloseTo(780);
  });

  it("a retina display at 2× zoom and centred pan", () => {
    // bitmapToOriginalScale=1, zoom=2, pan centred at (-100,-150), dpr=2
    // x=200: 200*2 + (-100) = 300, *2 = 600
    // y=300: 300*2 + (-150) = 450, *2 = 900
    const v = makeView({ zoom: 2, panX: -100, panY: -150, dpr: 2 });
    const result = toScreen({ x: 200, y: 300 }, v);
    expect(result.x).toBeCloseTo(600);
    expect(result.y).toBeCloseTo(900);
  });

  it("origin maps to (panX*dpr, panY*dpr) regardless of zoom and scale", () => {
    // The origin of the image (0,0) always lands at the pan offset
    const v = makeView({ zoom: 3, panX: 50, panY: 80, bitmapToOriginalScale: 4, dpr: 2 });
    const result = toScreen({ x: 0, y: 0 }, v);
    expect(result.x).toBeCloseTo(50 * 2);
    expect(result.y).toBeCloseTo(80 * 2);
  });

  it("is linear: toScreen(2p) = 2 * toScreen(p) when pan=0", () => {
    const v = makeView({ zoom: 1.5, bitmapToOriginalScale: 2, dpr: 2 });
    const p = { x: 100, y: 200 };
    const r1 = toScreen(p, v);
    const r2 = toScreen({ x: p.x * 2, y: p.y * 2 }, v);
    expect(r2.x).toBeCloseTo(r1.x * 2);
    expect(r2.y).toBeCloseTo(r1.y * 2);
  });
});

// ---------------------------------------------------------------------------
// clearCanvas — resets transform to identity and clears the full surface
// ---------------------------------------------------------------------------
describe("clearCanvas", () => {
  function makeCtx(width = 200, height = 100) {
    const calls: Array<{ method: string; args: unknown[] }> = [];
    const ctx = {
      canvas: { width, height },
      save: () => calls.push({ method: "save", args: [] }),
      restore: () => calls.push({ method: "restore", args: [] }),
      setTransform: (...args: unknown[]) => calls.push({ method: "setTransform", args }),
      clearRect: (...args: unknown[]) => calls.push({ method: "clearRect", args }),
      _calls: calls,
    } as unknown as CanvasRenderingContext2D & { _calls: typeof calls };
    return ctx;
  }

  it("calls save before any operations", () => {
    const ctx = makeCtx();
    clearCanvas(ctx);
    expect((ctx as any)._calls[0].method).toBe("save");
  });

  it("resets transform to the identity matrix", () => {
    const ctx = makeCtx();
    clearCanvas(ctx);
    const setTransformCall = (ctx as any)._calls.find(
      (c: any) => c.method === "setTransform",
    );
    expect(setTransformCall).toBeDefined();
    expect(setTransformCall.args).toEqual([1, 0, 0, 1, 0, 0]);
  });

  it("clears the full canvas surface using device-pixel dimensions", () => {
    const ctx = makeCtx(400, 200);
    clearCanvas(ctx);
    const clearCall = (ctx as any)._calls.find((c: any) => c.method === "clearRect");
    expect(clearCall).toBeDefined();
    expect(clearCall.args).toEqual([0, 0, 400, 200]);
  });

  it("calls restore after clearing", () => {
    const ctx = makeCtx();
    clearCanvas(ctx);
    const calls = (ctx as any)._calls;
    expect(calls[calls.length - 1].method).toBe("restore");
  });

  it("issues operations in the order: save → setTransform → clearRect → restore", () => {
    const ctx = makeCtx();
    clearCanvas(ctx);
    const methods = (ctx as any)._calls.map((c: any) => c.method);
    expect(methods).toEqual(["save", "setTransform", "clearRect", "restore"]);
  });
});
