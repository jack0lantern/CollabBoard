"use client";

import { useEffect, useState } from "react";
import { Rect } from "react-konva";

const GRID_SPACING = 40;
const DOT_RADIUS = 1.5;
const DOT_COLOR = "#94a3b8";

function createDotPatternDataUrl(): string {
  const size = GRID_SPACING;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = DOT_COLOR;
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, DOT_RADIUS, 0, Math.PI * 2);
  ctx.fill();

  return canvas.toDataURL("image/png");
}

export function GridBackground() {
  const [patternImage, setPatternImage] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    const dataUrl = createDotPatternDataUrl();
    const img = new Image();
    img.onload = () => {
      setPatternImage(img);
    };
    img.src = dataUrl;
  }, []);

  if (!patternImage) {
    return (
      <Rect
        x={-5000}
        y={-5000}
        width={10000}
        height={10000}
        fill="#ffffff"
        listening={false}
      />
    );
  }

  return (
    <Rect
      x={-5000}
      y={-5000}
      width={10000}
      height={10000}
      fillPatternImage={patternImage}
      fillPatternRepeat="repeat"
      listening={false}
    />
  );
}
