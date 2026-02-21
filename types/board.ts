export type ShapeType = "sticky" | "rect" | "circle" | "diamond" | "triangle" | "line" | "frame" | "text" | "pen";

/** Connection from a line endpoint to a snap point on another object */
export interface LineConnection {
  objectId: string;
  pointIndex: number;
}

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
  /** Text decoration: "none" | "underline" */
  textDecoration?: string;
  /** Text color (fill) */
  textColor?: string;
  /** Highlight/background color for text (highlighter effect) */
  textHighlightColor?: string;
  /** Border/stroke color */
  strokeColor?: string;
  /** Border/stroke width in pixels */
  strokeWidth?: number;
  /** Bezier tension for pen strokes: 0 = straight lines, 0.5 = smooth curves */
  tension?: number;
  /** Line start endpoint connection to another object's snap point */
  lineStartConnection?: LineConnection;
  /** Line end endpoint connection to another object's snap point */
  lineEndConnection?: LineConnection;
  /** Frame title (displayed at top of frame) */
  title?: string;
  /** Frame background/fill color (default: white) */
  frameColor?: string;
}

export type ShareRole = "editor" | "viewer";

export interface Board {
  id: string;
  title: string;
  created_at: string;
  owner_id: string | null;
  last_snapshot: Record<string, ObjectData> | null;
  is_public?: boolean;
  is_public_readonly?: boolean;
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
