"use client";

import { useCallback, useRef, useState } from "react";
import { Stage, Layer } from "react-konva";
import type Konva from "konva";
import { useBoardState } from "@/lib/liveblocks/hooks";
import { ShapeRenderer } from "./shapes/ShapeRenderer";
import { CursorOverlay } from "./CursorOverlay";
import { usePanZoom } from "@/hooks/usePanZoom";
import type { ObjectData } from "@/types";

export function BoardStage({ boardId }: { boardId: string }) {
  const stageRef = useRef<Konva.Stage>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const { scale, position, handleWheel, handleDragEnd, handleDragMove } =
    usePanZoom();

  const objects = useBoardState();
  const rawList = Object.values(objects).filter(
    (obj) =>
      obj != null &&
      typeof obj === "object" &&
      "id" in obj &&
      "type" in obj &&
      "x" in obj &&
      "y" in obj
  );
  const objectList = rawList as unknown as ObjectData[];

  const containerRef = useCallback((node: HTMLDivElement | null) => {
    if (node) {
      const resize = () => {
        setDimensions({
          width: node.offsetWidth,
          height: node.offsetHeight,
        });
      };
      resize();
      const observer = new ResizeObserver(resize);
      observer.observe(node);
      return () => observer.disconnect();
    }
  }, []);

  return (
    <div ref={containerRef} className="w-full h-full">
      <Stage
        ref={stageRef}
        width={dimensions.width}
        height={dimensions.height}
        scaleX={scale}
        scaleY={scale}
        x={position.x}
        y={position.y}
        draggable
        onWheel={handleWheel}
        onDragEnd={handleDragEnd}
        onDragMove={handleDragMove}
      >
        <Layer>
          {objectList.map((obj) => (
            <ShapeRenderer key={obj.id} data={obj} />
          ))}
          <CursorOverlay stageRef={stageRef} />
        </Layer>
      </Stage>
    </div>
  );
}
