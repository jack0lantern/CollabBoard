"use client";

import { Rect } from "react-konva";

interface SelectionBoxProps {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Blue selection box shown during left-click drag (marquee selection).
 */
export function SelectionBox({ x, y, width, height }: SelectionBoxProps) {
  return (
    <Rect
      x={x}
      y={y}
      width={width}
      height={height}
      fill="rgba(59, 130, 246, 0.15)"
      stroke="#3b82f6"
      strokeWidth={2}
      dash={[4, 4]}
      listening={false}
    />
  );
}
