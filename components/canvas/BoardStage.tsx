"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Stage, Layer } from "react-konva";
import type Konva from "konva";
import { useBoardObjects } from "@/hooks/useBoardObjects";
import { usePresence } from "@/hooks/usePresence";
import { ShapeRenderer } from "./shapes/ShapeRenderer";
import { CursorOverlay } from "./CursorOverlay";
import { usePanZoom } from "@/hooks/usePanZoom";
import { useBoardMutations } from "@/hooks/useBoardMutations";
import type { ObjectData } from "@/types";

export function BoardStage({ boardId }: { boardId: string }) {
  const stageRef = useRef<Konva.Stage>(null);
  const panningRef = useRef(false);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const { scale, position, handleWheel, setPosition } = usePanZoom();

  const objects = useBoardObjects();
  const { others, updateCursor } = usePresence();
  const { updateObject } = useBoardMutations();

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
  const sortedObjects = [...objectList].sort(
    (a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0)
  );

  const bringToFront = useCallback(
    (id: string) => {
      const maxZ = Math.max(
        0,
        ...objectList.map((o) => o.zIndex ?? 0)
      );
      updateObject(id, { zIndex: maxZ + 1 });
    },
    [objectList, updateObject]
  );

  const panStartRef = useRef<{ pointer: { x: number; y: number }; position: { x: number; y: number } } | null>(null);

  const handleStageMouseDown = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      if (e.evt.button === 1 || e.evt.button === 2) {
        e.evt.preventDefault();
        const stage = e.target.getStage();
        const pointer = stage?.getPointerPosition();
        if (stage && pointer) {
          panningRef.current = true;
          panStartRef.current = {
            pointer: { x: pointer.x, y: pointer.y },
            position: { x: position.x, y: position.y },
          };
        }
      }
    },
    [position.x, position.y]
  );

  useEffect(() => {
    const handleMouseUp = () => {
      panningRef.current = false;
      panStartRef.current = null;
    };
    window.addEventListener("mouseup", handleMouseUp);
    return () => window.removeEventListener("mouseup", handleMouseUp);
  }, []);

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

  const handleMouseMove = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      const stage = e.target.getStage();
      if (!stage) return;
      const pos = stage.getPointerPosition();
      if (pos) {
        updateCursor({ x: pos.x, y: pos.y });
        if (panningRef.current && panStartRef.current) {
          const deltaX = pos.x - panStartRef.current.pointer.x;
          const deltaY = pos.y - panStartRef.current.pointer.y;
          const newPosition = {
            x: panStartRef.current.position.x + deltaX,
            y: panStartRef.current.position.y + deltaY,
          };
          setPosition(newPosition);
          panStartRef.current = {
            pointer: { x: pos.x, y: pos.y },
            position: newPosition,
          };
        }
      }
    },
    [updateCursor, setPosition]
  );

  const handleMouseLeave = useCallback(() => {
    updateCursor(null);
  }, [updateCursor]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full"
      data-testid="board-stage"
      data-stage-x={position.x}
      data-stage-y={position.y}
    >
      <Stage
        ref={stageRef}
        width={dimensions.width}
        height={dimensions.height}
        scaleX={scale}
        scaleY={scale}
        x={position.x}
        y={position.y}
        draggable={false}
        onWheel={handleWheel}
        onMouseDown={handleStageMouseDown}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        <Layer>
          {sortedObjects.map((obj) => (
            <ShapeRenderer
              key={obj.id}
              data={obj}
              onSelect={bringToFront}
            />
          ))}
          <CursorOverlay stageRef={stageRef} others={others} />
        </Layer>
      </Stage>
    </div>
  );
}
