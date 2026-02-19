import { describe, expect, it } from "vitest";
import {
  TEXT_BOX_PADDING,
  computeTextBoxDimensions,
  computeScaledFontSize,
  shouldDeleteEmptyTextOnBlur,
} from "@/lib/utils/textShapeLayout";

describe("computeTextBoxDimensions", () => {
  it("adds padding to measured text size", () => {
    const size = computeTextBoxDimensions({ measuredWidth: 120, measuredHeight: 24 });
    expect(size.width).toBe(120 + TEXT_BOX_PADDING * 2);
    expect(size.height).toBe(24 + TEXT_BOX_PADDING * 2);
  });

  it("respects minimum box dimensions", () => {
    const size = computeTextBoxDimensions({
      measuredWidth: 1,
      measuredHeight: 1,
      padding: 0,
      minWidth: 20,
      minHeight: 20,
    });
    expect(size.width).toBe(20);
    expect(size.height).toBe(20);
  });
});

describe("computeScaledFontSize", () => {
  it("scales font size when dragging a corner handle", () => {
    const fontSize = computeScaledFontSize({
      baseFontSize: 20,
      widthScale: 1.5,
      heightScale: 1.5,
      activeAnchor: "bottom-right",
    });
    expect(fontSize).toBe(30);
  });

  it("keeps font size unchanged on side-handle resize", () => {
    const fontSize = computeScaledFontSize({
      baseFontSize: 20,
      widthScale: 2,
      heightScale: 1,
      activeAnchor: "middle-right",
    });
    expect(fontSize).toBe(20);
  });
});

describe("shouldDeleteEmptyTextOnBlur", () => {
  it("returns true for empty text", () => {
    expect(shouldDeleteEmptyTextOnBlur("")).toBe(true);
    expect(shouldDeleteEmptyTextOnBlur("   ")).toBe(true);
  });

  it("returns false when text has visible content", () => {
    expect(shouldDeleteEmptyTextOnBlur("hello")).toBe(false);
  });
});
