import type Konva from "konva";

/**
 * Convert screen coordinates (e.g. from pointer event) to board coordinates
 * using the Stage's inverse transform.
 */
export function screenToBoard(
  stage: Konva.Stage,
  screenX: number,
  screenY: number
): { x: number; y: number } {
  const transform = stage.getAbsoluteTransform().copy().invert();
  const point = transform.point({ x: screenX, y: screenY });
  return { x: point.x, y: point.y };
}

/**
 * Convert board coordinates to screen coordinates.
 */
export function boardToScreen(
  stage: Konva.Stage,
  boardX: number,
  boardY: number
): { x: number; y: number } {
  const transform = stage.getAbsoluteTransform();
  const point = transform.point({ x: boardX, y: boardY });
  return { x: point.x, y: point.y };
}
