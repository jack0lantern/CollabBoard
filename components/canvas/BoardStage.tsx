"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Stage, Layer } from "react-konva";
import type Konva from "konva";
import {
  useBoardObjects,
  PatchObjectContext,
  AddObjectContext,
  RemoveObjectContext,
} from "@/hooks/useBoardObjects";
import { usePresence } from "@/hooks/usePresence";
import { ShapeRenderer } from "./shapes/ShapeRenderer";
import { CursorOverlay } from "./CursorOverlay";
import { GridBackground } from "./GridBackground";
import { usePanZoom } from "@/hooks/usePanZoom";
import { useBoardMutations } from "@/hooks/useBoardMutations";
import { useSelection } from "@/hooks/useSelection";
import { ContextMenu } from "@/components/ui/ContextMenu";
import type { ObjectData } from "@/types";
import {
  computeBringToFront,
  computeSendToBack,
  computeBringForward,
  computeSendBackward,
} from "@/lib/utils/zorder";

export function BoardStage({ boardId }: { boardId: string }) {
  const stageRef = useRef<Konva.Stage>(null);
  const panningRef = useRef(false);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [lastDragEnd, setLastDragEnd] = useState(0);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    targetIds: string[];
  } | null>(null);
  const { scale, position, handleWheel, setPosition } = usePanZoom();
  const { selectedIds, select, clearSelection, isSelected } = useSelection();

  const { objects, patchObject, addObject, removeObject } = useBoardObjects();
  const { others, updateCursor } = usePresence();
  const { updateObject, deleteObject } = useBoardMutations();

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

  const applyZOrderUpdates = useCallback(
    (updates: Map<string, number>) => {
      updates.forEach((zIndex, id) => {
        updateObject(id, { zIndex });
      });
    },
    [updateObject]
  );

  const panStartRef = useRef<{ pointer: { x: number; y: number }; position: { x: number; y: number } } | null>(null);
  const panningMovedRef = useRef(false);
  const pendingContextMenuRef = useRef<{ x: number; y: number; targetIds: string[] } | null>(null);

  const handleStageMouseDown = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      const stage = e.target.getStage();
      const clickedOnEmpty = stage != null && e.target === stage;

      if (clickedOnEmpty && e.evt.button === 0) {
        clearSelection();
      }

      if (e.evt.button === 1 || e.evt.button === 2) {
        e.evt.preventDefault();
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
    [position.x, position.y, clearSelection]
  );

  const handleContainerMouseDownCapture = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.button === 1 || e.button === 2) {
        e.preventDefault();
        e.stopPropagation();
        panningMovedRef.current = false;
        pendingContextMenuRef.current = null;
        const stage = stageRef.current;
        const container = stage?.container();
        if (stage && container) {
          const rect = container.getBoundingClientRect();
          const pointer = {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
          };
          panningRef.current = true;
          panStartRef.current = {
            pointer,
            position: { x: position.x, y: position.y },
          };
        }
      }
    },
    [position.x, position.y]
  );

  const handleSelect = useCallback(
    (id: string) => {
      select(id);
    },
    [select]
  );

  const handleDeleteSelected = useCallback(
    (ids?: string[]) => {
      const toDelete = ids ?? selectedIds;
      for (const id of toDelete) {
        deleteObject(id);
      }
      clearSelection();
      setContextMenu(null);
    },
    [selectedIds, deleteObject, clearSelection]
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === "Delete" || e.key === "Backspace") && selectedIds.length > 0) {
        if (!["INPUT", "TEXTAREA"].includes((e.target as HTMLElement)?.tagName ?? "")) {
          e.preventDefault();
          handleDeleteSelected();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedIds.length, handleDeleteSelected]);

  const handleShapeContextMenu = useCallback(
    (id: string, clientX: number, clientY: number) => {
      if (panningRef.current) {
        pendingContextMenuRef.current = { x: clientX, y: clientY, targetIds: [id] };
        return;
      }
      const targetIds = isSelected(id) ? selectedIds : [id];
      if (!isSelected(id)) {
        select(id);
      }
      setContextMenu({ x: clientX, y: clientY, targetIds });
    },
    [select, isSelected, selectedIds]
  );

  const handleStageContextMenu = useCallback((e: Konva.KonvaEventObject<PointerEvent>) => {
    const stage = e.target.getStage();
    if (stage != null && e.target === stage) {
      e.evt.preventDefault();
      setContextMenu(null);
    }
  }, []);

  useEffect(() => {
    const handleMouseUp = (e: MouseEvent) => {
      if ((e.button === 1 || e.button === 2) && panningRef.current && !panningMovedRef.current && pendingContextMenuRef.current) {
        const pending = pendingContextMenuRef.current;
        setContextMenu(pending);
        if (pending.targetIds.length > 0) {
          select(pending.targetIds[0]);
        }
      }
      panningRef.current = false;
      panStartRef.current = null;
      panningMovedRef.current = false;
      pendingContextMenuRef.current = null;
    };
    window.addEventListener("mouseup", handleMouseUp);
    return () => window.removeEventListener("mouseup", handleMouseUp);
  }, [select]);

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
        // Convert container coords to board coords so cursors sync correctly across users with different pan/zoom
        const boardX = (pos.x - stage.x()) / stage.scaleX();
        const boardY = (pos.y - stage.y()) / stage.scaleY();
        updateCursor({ x: boardX, y: boardY });
        if (panningRef.current && panStartRef.current) {
          panningMovedRef.current = true;
          pendingContextMenuRef.current = null;
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
          setContextMenu(null);
        }
      }
    },
    [updateCursor, setPosition]
  );

  const handleMouseLeave = useCallback(() => {
    updateCursor(null);
  }, [updateCursor]);

  return (
    <PatchObjectContext.Provider value={patchObject}>
      <AddObjectContext.Provider value={addObject}>
        <RemoveObjectContext.Provider value={removeObject}>
          <div
            ref={containerRef}
            className="w-full h-full"
            data-testid="board-stage"
            onMouseDownCapture={handleContainerMouseDownCapture}
            data-stage-x={position.x}
            data-stage-y={position.y}
            data-object-count={objectList.length}
            data-selected-id={selectedIds[0] ?? ""}
            data-last-drag-end={lastDragEnd}
            data-first-object-x={sortedObjects[0]?.x ?? ""}
            data-first-object-y={sortedObjects[0]?.y ?? ""}
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
              onContextMenu={handleStageContextMenu}
            >
              <Layer>
                <GridBackground />
                {sortedObjects.map((obj) => (
                  <ShapeRenderer
                    key={obj.id}
                    data={obj}
                    onSelect={handleSelect}
                    isSelected={isSelected(obj.id)}
                    onShapeDragEnd={() => setLastDragEnd(Date.now())}
                    onContextMenu={handleShapeContextMenu}
                  />
                ))}
                <CursorOverlay stageRef={stageRef} others={others} />
              </Layer>
            </Stage>
            {contextMenu != null && (
              <ContextMenu
                x={contextMenu.x}
                y={contextMenu.y}
                visible
                onClose={() => setContextMenu(null)}
                items={[
                  {
                    label: "Bring to front",
                    onClick: () => {
                      const targetIds = contextMenu.targetIds;
                      const updates = computeBringToFront(objectList, targetIds);
                      queueMicrotask(() => applyZOrderUpdates(updates));
                    },
                  },
                  {
                    label: "Send to back",
                    onClick: () => {
                      const targetIds = contextMenu.targetIds;
                      const updates = computeSendToBack(objectList, targetIds);
                      queueMicrotask(() => applyZOrderUpdates(updates));
                    },
                  },
                  {
                    label: "Bring forward",
                    onClick: () => {
                      const targetIds = contextMenu.targetIds;
                      const updates = computeBringForward(objectList, targetIds);
                      queueMicrotask(() => applyZOrderUpdates(updates));
                    },
                  },
                  {
                    label: "Send backward",
                    onClick: () => {
                      const targetIds = contextMenu.targetIds;
                      const updates = computeSendBackward(objectList, targetIds);
                      queueMicrotask(() => applyZOrderUpdates(updates));
                    },
                  },
                  {
                    label: "Delete",
                    onClick: () => handleDeleteSelected(contextMenu.targetIds),
                  },
                ]}
              />
            )}
          </div>
        </RemoveObjectContext.Provider>
      </AddObjectContext.Provider>
    </PatchObjectContext.Provider>
  );
}
