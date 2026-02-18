export type ShapeType = "sticky" | "rect" | "circle" | "line";

export interface ObjectData {
  id: string;
  type: ShapeType;
  x: number;
  y: number;
  zIndex?: number;
  width?: number;
  height?: number;
  radius?: number;
  radiusX?: number;
  radiusY?: number;
  points?: number[];
  color?: string;
  text?: string;
  rotation?: number;
  arrowStart?: boolean;
  arrowEnd?: boolean;
  /** Font family for text (e.g. sticky notes) */
  fontFamily?: string;
  /** Font size in pixels */
  fontSize?: number;
  /** Font weight: "normal" | "bold" */
  fontWeight?: string;
  /** Font style: "normal" | "italic" */
  fontStyle?: string;
  /** Text color (fill) */
  textColor?: string;
  /** Border/stroke color */
  strokeColor?: string;
  /** Border/stroke width in pixels */
  strokeWidth?: number;
}

export type ShareRole = "editor" | "viewer";

export interface Board {
  id: string;
  title: string;
  created_at: string;
  owner_id: string | null;
  last_snapshot: Record<string, ObjectData> | null;
  is_public?: boolean;
  shared_with?: Record<string, ShareRole>;
}

export interface BoardElement {
  id: string;
  board_id: string;
  type: ShapeType;
  x: number;
  y: number;
  data: Record<string, unknown>;
  updated_at: string;
}
