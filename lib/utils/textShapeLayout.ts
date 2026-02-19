export const TEXT_BOX_PADDING = 10;

const DEFAULT_MIN_SIZE = 20;
const DEFAULT_MIN_FONT_SIZE = 8;
const DEFAULT_MAX_FONT_SIZE = 240;

const CORNER_ANCHORS = new Set([
  "top-left",
  "top-right",
  "bottom-left",
  "bottom-right",
]);

export function computeTextBoxDimensions({
  measuredWidth,
  measuredHeight,
  padding = TEXT_BOX_PADDING,
  minWidth = DEFAULT_MIN_SIZE,
  minHeight = DEFAULT_MIN_SIZE,
}: {
  measuredWidth: number;
  measuredHeight: number;
  padding?: number;
  minWidth?: number;
  minHeight?: number;
}): { width: number; height: number } {
  const widthWithPadding = Math.ceil(measuredWidth + padding * 2);
  const heightWithPadding = Math.ceil(measuredHeight + padding * 2);

  return {
    width: Math.max(minWidth, widthWithPadding),
    height: Math.max(minHeight, heightWithPadding),
  };
}

export function computeScaledFontSize({
  baseFontSize,
  widthScale,
  heightScale,
  activeAnchor,
  minFontSize = DEFAULT_MIN_FONT_SIZE,
  maxFontSize = DEFAULT_MAX_FONT_SIZE,
}: {
  baseFontSize: number;
  widthScale: number;
  heightScale: number;
  activeAnchor?: string;
  minFontSize?: number;
  maxFontSize?: number;
}): number {
  if (activeAnchor == null || !CORNER_ANCHORS.has(activeAnchor)) {
    return baseFontSize;
  }

  const sizeScale = Math.sqrt(Math.abs(widthScale * heightScale));
  const scaled = Math.round(baseFontSize * sizeScale);
  return Math.max(minFontSize, Math.min(maxFontSize, scaled));
}

/**
 * When transforming a text box by a corner handle, returns clamped width, height,
 * and fontSize. If the stretch would exceed max font size, shrinks the box to the
 * boundary so the selection box matches the actual rendered size.
 */
export function computeClampedCornerTransform({
  baseFontSize,
  rawWidth,
  rawHeight,
  prevWidth,
  prevHeight,
  activeAnchor,
  minFontSize = DEFAULT_MIN_FONT_SIZE,
  maxFontSize = DEFAULT_MAX_FONT_SIZE,
  minSize = DEFAULT_MIN_SIZE,
}: {
  baseFontSize: number;
  rawWidth: number;
  rawHeight: number;
  prevWidth: number;
  prevHeight: number;
  activeAnchor?: string;
  minFontSize?: number;
  maxFontSize?: number;
  minSize?: number;
}): { width: number; height: number; fontSize: number } {
  if (
    activeAnchor == null ||
    !CORNER_ANCHORS.has(activeAnchor) ||
    prevWidth <= 0 ||
    prevHeight <= 0
  ) {
    const w = Math.max(minSize, Math.abs(rawWidth));
    const h = Math.max(minSize, Math.abs(rawHeight));
    return { width: w, height: h, fontSize: baseFontSize };
  }

  const widthScale = Math.abs(rawWidth) / prevWidth;
  const heightScale = Math.abs(rawHeight) / prevHeight;
  const sizeScale = Math.sqrt(widthScale * heightScale);
  const unscaledFont = baseFontSize * sizeScale;
  const newFontSize = Math.round(
    Math.max(minFontSize, Math.min(maxFontSize, unscaledFont))
  );

  let newWidth = Math.max(minSize, Math.abs(rawWidth));
  let newHeight = Math.max(minSize, Math.abs(rawHeight));

  if (sizeScale > 0 && unscaledFont > maxFontSize) {
    const clampedSizeScale = maxFontSize / baseFontSize;
    const ratio = clampedSizeScale / sizeScale;
    newWidth = Math.max(minSize, Math.round(newWidth * ratio));
    newHeight = Math.max(minSize, Math.round(newHeight * ratio));
  } else if (sizeScale > 0 && unscaledFont < minFontSize) {
    const clampedSizeScale = minFontSize / baseFontSize;
    const ratio = clampedSizeScale / sizeScale;
    newWidth = Math.max(minSize, Math.round(newWidth * ratio));
    newHeight = Math.max(minSize, Math.round(newHeight * ratio));
  }

  return { width: newWidth, height: newHeight, fontSize: newFontSize };
}

export function shouldDeleteEmptyTextOnBlur(value: string): boolean {
  return value.trim() === "";
}
