export const TEXT_BOX_PADDING = 10;

const DEFAULT_MIN_SIZE = 20;
const DEFAULT_MIN_FONT_SIZE = 8;
const DEFAULT_MAX_FONT_SIZE = 120;

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

export function shouldDeleteEmptyTextOnBlur(value: string): boolean {
  return value.trim() === "";
}
