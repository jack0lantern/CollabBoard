/**
 * Measure text dimensions using an offscreen canvas.
 * Returns tight bounding box for the given text and font options.
 */
export function measureText(
  text: string,
  options: {
    fontFamily: string;
    fontSize: number;
    fontWeight?: string;
    fontStyle?: string;
    maxWidth?: number;
    lineHeight?: number;
  }
): { width: number; height: number } {
  const {
    fontFamily,
    fontSize,
    fontWeight = "normal",
    fontStyle = "normal",
    maxWidth = 10000,
    lineHeight = 1.2,
  } = options;

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return { width: 0, height: 0 };

  const fontStr = `${fontStyle} ${fontWeight} ${String(fontSize)}px ${fontFamily}`;
  ctx.font = fontStr;

  const lines: string[] = [];
  const paragraphs = text.split("\n");

  for (const para of paragraphs) {
    if (para === "") {
      lines.push("");
      continue;
    }
    const words = para.split(" ");
    let currentLine = "";

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) lines.push(currentLine);
  }

  let maxLineWidth = 0;
  for (const line of lines) {
    const w = ctx.measureText(line).width;
    maxLineWidth = Math.max(maxLineWidth, w);
  }

  const height = lines.length * fontSize * lineHeight;
  const width = Math.min(maxLineWidth, maxWidth);

  return { width: Math.ceil(width), height: Math.ceil(height) };
}

/**
 * Get the character index (caret position) from a click position within text bounds.
 * Used for positioning cursor when user clicks on text.
 */
export function getCaretIndexFromPosition(
  text: string,
  clickX: number,
  clickY: number,
  options: {
    fontFamily: string;
    fontSize: number;
    fontWeight?: string;
    fontStyle?: string;
    maxWidth?: number;
    lineHeight?: number;
  }
): number {
  const {
    fontFamily,
    fontSize,
    fontWeight = "normal",
    fontStyle = "normal",
    maxWidth = 10000,
    lineHeight = 1.2,
  } = options;

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return 0;

  const fontStr = `${fontStyle} ${fontWeight} ${String(fontSize)}px ${fontFamily}`;
  ctx.font = fontStr;

  const lineHeightPx = fontSize * lineHeight;
  const paragraphs = text.split("\n");
  let index = 0;
  let currentY = 0;

  for (const para of paragraphs) {
    if (para === "") {
      if (clickY < currentY + lineHeightPx) {
        return index;
      }
      index += 1;
      currentY += lineHeightPx;
      continue;
    }
    const words = para.split(" ");
    let currentLine = "";
    const lines: string[] = [];

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) lines.push(currentLine);

    for (const line of lines) {
      if (clickY < currentY + lineHeightPx) {
        const lineWidth = ctx.measureText(line).width;
        const clampedX = Math.min(Math.max(clickX, 0), lineWidth);
        for (let i = 0; i <= line.length; i++) {
          const subWidth = ctx.measureText(line.slice(0, i)).width;
          if (clampedX <= subWidth) {
            return index + i;
          }
        }
        return index + line.length;
      }
      index += line.length;
      currentY += lineHeightPx;
    }
    index += 1;
    currentY += lineHeightPx;
  }
  return index;
}
