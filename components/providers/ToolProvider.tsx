"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

export type ActiveTool = "select" | "pen";

const DEFAULT_PEN_COLOR = "#1a1a2e";
const DEFAULT_PEN_STROKE_WIDTH = 2;

const ToolContext = createContext<{
  activeTool: ActiveTool;
  setActiveTool: (tool: ActiveTool) => void;
  penColor: string;
  penStrokeWidth: number;
  setPenColor: (color: string) => void;
  setPenStrokeWidth: (width: number) => void;
} | null>(null);

export function ToolProvider({ children }: { children: React.ReactNode }) {
  const [activeTool, setActiveToolState] = useState<ActiveTool>("select");
  const [penColor, setPenColorState] = useState(DEFAULT_PEN_COLOR);
  const [penStrokeWidth, setPenStrokeWidthState] = useState(DEFAULT_PEN_STROKE_WIDTH);

  const setActiveTool = useCallback((tool: ActiveTool) => {
    setActiveToolState(tool);
  }, []);

  const setPenColor = useCallback((color: string) => {
    setPenColorState(color);
  }, []);

  const setPenStrokeWidth = useCallback((width: number) => {
    setPenStrokeWidthState(width);
  }, []);

  const value = useMemo(
    () => ({
      activeTool,
      setActiveTool,
      penColor,
      penStrokeWidth,
      setPenColor,
      setPenStrokeWidth,
    }),
    [activeTool, setActiveTool, penColor, penStrokeWidth, setPenColor, setPenStrokeWidth]
  );

  return (
    <ToolContext.Provider value={value}>{children}</ToolContext.Provider>
  );
}

export function useTool() {
  const ctx = useContext(ToolContext);
  if (!ctx) {
    return {
      activeTool: "select" as ActiveTool,
      setActiveTool: () => {},
      penColor: DEFAULT_PEN_COLOR,
      penStrokeWidth: DEFAULT_PEN_STROKE_WIDTH,
      setPenColor: () => {},
      setPenStrokeWidth: () => {},
    };
  }
  return ctx;
}
