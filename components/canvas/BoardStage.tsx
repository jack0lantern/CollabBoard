"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Stage, Layer } from "react-konva";
import type Konva from "konva";
import { useBoardObjectsContext } from "@/hooks/useBoardObjects";
import { usePresence } from "@/hooks/usePresence";
import { ShapeRenderer } from "./shapes/ShapeRenderer";
import { CursorOverlay } from "./CursorOverlay";
import { GridBackground } from "./GridBackground";
import { SelectionBox } from "./SelectionBox";
import { MultiSelectTransformer } from "./MultiSelectTransformer";
import { usePanZoom } from "@/hooks/usePanZoom";
import { useGrid } from "@/components/providers/GridProvider";
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
import { screenToBoard } from "@/lib/utils/coordinates";
import {
  getObjectBoundingBox,
  rectsIntersect,
  computeGroupBoundingBox,
  getTopmostFrameZIndex,
  getObjectsOnTopOfFrame,
} from "@/lib/utils/boundingBox";
import { getNodeSnapPoints } from "@/lib/utils/snapPoints";
import { ShapeToolbar } from "./ShapeToolbar";

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
  const { gridVisible } = useGrid();
  const {
    selectedIds,
    select,
    setSelection,
    addToSelection,
    clearSelection,
    isSelected,
  } = useSelection();

  const [selectionBox, setSelectionBox] = useState<{
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
  } | null>(null);
  const selectionBoxRef = useRef(selectionBox);
  selectionBoxRef.current = selectionBox;

  const shapeRefsRef = useRef<Map<string, Konva.Node>>(new Map());
  const [refsVersion, setRefsVersion] = useState(0);
  const [dragMoveVersion, setDragMoveVersion] = useState(0);
  const copiedObjectsRef = useRef<ObjectData[]>([]);

  const onDragMoveTick = useCallback(() => {
    setDragMoveVersion((v) => v + 1);
  }, []);

  const registerShapeRef = useCallback((id: string, node: Konva.Node | null) => {
    const map = shapeRefsRef.current;
    if (node) {
      map.set(id, node);
      setRefsVersion((v) => v + 1);
    } else {
      map.delete(id);
    }
  }, []);

  const { objects, patchObject, addObject: addObjectLocal, removeObject } =
    useBoardObjectsContext();
  const { others, updateCursor } = usePresence();
  const { addObject, updateObject, deleteObject } = useBoardMutations();

  const getLiveSnapPoints = useCallback(
    (objectId: string): { x: number; y: number }[] | null => {
      const node = shapeRefsRef.current.get(objectId);
      const obj = objects[objectId] as ObjectData | undefined;
      if (!node || !obj) return null;
      return getNodeSnapPoints(node, obj.type);
    },
    [objects]
  );

  const objectListRef = useRef<ObjectData[]>([]);
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
  objectListRef.current = objectList;
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
  const selectionStartRef = useRef<{ x: number; y: number } | null>(null);
  const cursorBoardPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const handleStageMouseDown = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      const stage = e.target.getStage();
      const clickedOnEmpty = stage != null && e.target === stage;

      if (clickedOnEmpty && e.evt.button === 0) {
        const pos = stage.getPointerPosition();
        if (pos) {
          const board = screenToBoard(stage, pos.x, pos.y);
          selectionStartRef.current = { x: board.x, y: board.y };
        }
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
    (id: string, addToSelectionMode?: boolean) => {
      if (addToSelectionMode) {
        addToSelection(id);
      } else {
        select(id);
      }
    },
    [select, addToSelection]
  );

  const handleShapeDragEnd = useCallback(() => {
    setLastDragEnd(Date.now());
  }, []);

  const lastDragMoveZUpdateRef = useRef<{
    objectId: string;
    time: number;
  }>({ objectId: "", time: 0 });
  const DRAG_MOVE_THROTTLE_MS = 50;

  const handleDragEndAt = useCallback(
    (objectId: string, newX: number, newY: number) => {
      const obj = objectListRef.current.find((o) => o.id === objectId);
      if (!obj || obj.type === "frame") return;
      const objWithNewPos = { ...obj, x: newX, y: newY };
      const maxFrameZ = getTopmostFrameZIndex(
        objWithNewPos,
        objectListRef.current
      );
      if (maxFrameZ != null && (obj.zIndex ?? 0) <= maxFrameZ) {
        updateObject(objectId, { zIndex: maxFrameZ + 1 });
      }
    },
    [updateObject]
  );

  const handleFrameDragWithContents = useCallback(
    (
      frameId: string,
      prevX: number,
      prevY: number,
      deltaX: number,
      deltaY: number
    ) => {
      const frame = objectListRef.current.find((o) => o.id === frameId);
      if (!frame || frame.type !== "frame") return;
      const frameBox = getObjectBoundingBox({ ...frame, x: prevX, y: prevY });
      const frameZ = frame.zIndex ?? 0;
      const objectsOnTop = getObjectsOnTopOfFrame(
        frameId,
        frameBox,
        frameZ,
        objectListRef.current
      );
      for (const obj of objectsOnTop) {
        updateObject(obj.id, {
          x: obj.x + deltaX,
          y: obj.y + deltaY,
        });
      }
    },
    [updateObject]
  );

  const handleDragMoveAt = useCallback(
    (objectId: string, newX: number, newY: number) => {
      const now = Date.now();
      const last = lastDragMoveZUpdateRef.current;
      if (
        last.objectId === objectId &&
        now - last.time < DRAG_MOVE_THROTTLE_MS
      ) {
        return;
      }
      lastDragMoveZUpdateRef.current = { objectId, time: now };
      handleDragEndAt(objectId, newX, newY);
    },
    [handleDragEndAt]
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

  const handleCopy = useCallback(() => {
    const toCopy = selectedIds
      .map((id) => objectListRef.current.find((o) => o.id === id))
      .filter((o): o is ObjectData => o != null);
    copiedObjectsRef.current = toCopy.map((obj) => ({ ...obj }));
  }, [selectedIds]);

  const handlePaste = useCallback(() => {
    if (copiedObjectsRef.current.length === 0) return;
    const offset = 20;
    const newObjects: ObjectData[] = copiedObjectsRef.current.map((obj) => {
      const id = crypto.randomUUID();
      return { ...obj, id, x: obj.x + offset, y: obj.y + offset };
    });
    for (const obj of newObjects) {
      addObject(obj);
    }
    setSelection(newObjects.map((o) => o.id));
    setContextMenu(null);
  }, [addObject, setSelection]);

  const handleAddFrame = useCallback(
    (atX: number, atY: number) => {
      const FRAME_WIDTH = 600;
      const FRAME_HEIGHT = 400;
      const maxZ = Math.max(0, ...objectListRef.current.map((o) => o.zIndex ?? 0));
      addObject({
        id: crypto.randomUUID(),
        type: "frame",
        x: atX - FRAME_WIDTH / 2,
        y: atY - FRAME_HEIGHT / 2,
        zIndex: maxZ + 1,
        width: FRAME_WIDTH,
        height: FRAME_HEIGHT,
        frameColor: "#ffffff",
        strokeColor: "#e5e7eb",
        strokeWidth: 1,
      });
    },
    [addObject]
  );

  const handleCreateFrameFromSelection = useCallback(() => {
    const ids = contextMenu?.targetIds ?? selectedIds;
    if (ids.length < 2) return;
    const selected = ids
      .map((id) => objectListRef.current.find((o) => o.id === id))
      .filter((o): o is ObjectData => o != null);
    if (selected.length < 2) return;
    const box = computeGroupBoundingBox(selected);
    const PADDING = 24;
    const frameX = box.x - PADDING;
    const frameY = box.y - PADDING;
    const frameWidth = box.width + PADDING * 2;
    const frameHeight = box.height + PADDING * 2;
    const minZ = Math.min(0, ...objectListRef.current.map((o) => o.zIndex ?? 0));
    const newFrame: ObjectData = {
      id: crypto.randomUUID(),
      type: "frame",
      x: frameX,
      y: frameY,
      zIndex: minZ - 1,
      width: frameWidth,
      height: frameHeight,
      frameColor: "#ffffff",
      strokeColor: "#e5e7eb",
      strokeWidth: 1,
    };
    addObject(newFrame);
    setSelection([newFrame.id]);
    setContextMenu(null);
  }, [addObject, setSelection, selectedIds, contextMenu?.targetIds]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (["INPUT", "TEXTAREA"].includes((e.target as HTMLElement)?.tagName ?? "")) {
        return;
      }
      if ((e.key === "Delete" || e.key === "Backspace") && selectedIds.length > 0) {
        e.preventDefault();
        handleDeleteSelected();
      } else if (e.key === "f" || e.key === "F") {
        if (!e.metaKey && !e.ctrlKey && !e.altKey) {
          e.preventDefault();
          const pos = cursorBoardPosRef.current;
          const isDefaultPos = pos.x === 0 && pos.y === 0;
          const centerX = isDefaultPos
            ? (dimensions.width / 2 - position.x) / scale
            : pos.x;
          const centerY = isDefaultPos
            ? (dimensions.height / 2 - position.y) / scale
            : pos.y;
          handleAddFrame(centerX, centerY);
        }
      } else if ((e.metaKey || e.ctrlKey) && e.key === "c" && selectedIds.length > 0) {
        e.preventDefault();
        const toCopy = selectedIds
          .map((id) => objectListRef.current.find((o) => o.id === id))
          .filter((o): o is ObjectData => o != null);
        copiedObjectsRef.current = toCopy.map((obj) => ({ ...obj }));
      } else if ((e.metaKey || e.ctrlKey) && e.key === "v" && copiedObjectsRef.current.length > 0) {
        e.preventDefault();
        const offset = 20;
        const newObjects: ObjectData[] = copiedObjectsRef.current.map((obj) => {
          const id = crypto.randomUUID();
          return { ...obj, id, x: obj.x + offset, y: obj.y + offset };
        });
        for (const obj of newObjects) {
          addObject(obj);
        }
        setSelection(newObjects.map((o) => o.id));
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    selectedIds.length,
    handleDeleteSelected,
    addObject,
    setSelection,
    handleAddFrame,
    dimensions,
    position,
    scale,
  ]);

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

  const handleTransformerContextMenu = useCallback(
    (clientX: number, clientY: number) => {
      if (panningRef.current) {
        pendingContextMenuRef.current = {
          x: clientX,
          y: clientY,
          targetIds: selectedIds,
        };
        return;
      }
      setContextMenu({ x: clientX, y: clientY, targetIds: selectedIds });
    },
    [selectedIds]
  );

  const handleStageContextMenu = useCallback((e: Konva.KonvaEventObject<PointerEvent>) => {
    const stage = e.target.getStage();
    if (stage != null && e.target === stage) {
      e.evt.preventDefault();
      const targetIds = selectedIds.length > 0 ? selectedIds : [];
      if (panningRef.current) {
        pendingContextMenuRef.current = { x: e.evt.clientX, y: e.evt.clientY, targetIds };
        return;
      }
      if (selectedIds.length === 0) {
        clearSelection();
      }
      setContextMenu({ x: e.evt.clientX, y: e.evt.clientY, targetIds });
    }
  }, [clearSelection, selectedIds]);

  useEffect(() => {
    const handleMouseUp = (e: MouseEvent) => {
      const box = selectionBoxRef.current;
      if (e.button === 0 && box) {
        const rect = {
          x: Math.min(box.startX, box.currentX),
          y: Math.min(box.startY, box.currentY),
          width: Math.abs(box.currentX - box.startX),
          height: Math.abs(box.currentY - box.startY),
        };
        const ids = objectListRef.current.filter((obj) =>
          rectsIntersect(rect, getObjectBoundingBox(obj))
        ).map((o) => o.id);
        if (ids.length > 0) {
          setSelection(ids);
        }
      } else if (e.button === 0 && selectionStartRef.current) {
        clearSelection();
      }
      setSelectionBox(null);
      selectionStartRef.current = null;

      if ((e.button === 1 || e.button === 2) && panningRef.current && !panningMovedRef.current && pendingContextMenuRef.current) {
        const pending = pendingContextMenuRef.current;
        setContextMenu(pending);
        if (pending.targetIds.length > 0) {
          setSelection(pending.targetIds);
        }
      }
      panningRef.current = false;
      panStartRef.current = null;
      panningMovedRef.current = false;
      pendingContextMenuRef.current = null;
    };
    window.addEventListener("mouseup", handleMouseUp);
    return () => window.removeEventListener("mouseup", handleMouseUp);
  }, [select, setSelection, clearSelection]);

  const [containerRect, setContainerRect] = useState<DOMRect | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const containerRef = useCallback((node: HTMLDivElement | null) => {
    resizeObserverRef.current?.disconnect();
    resizeObserverRef.current = null;
    if (node) {
      const updateRect = () => {
        setContainerRect(node.getBoundingClientRect());
      };
      const resize = () => {
        setDimensions({
          width: node.offsetWidth,
          height: node.offsetHeight,
        });
        updateRect();
      };
      resize();
      const observer = new ResizeObserver(resize);
      observer.observe(node);
      resizeObserverRef.current = observer;
    } else {
      setContainerRect(null);
    }
  }, []);

  const selectedSingleObject =
    selectedIds.length === 1
      ? objectList.find((o) => o.id === selectedIds[0])
      : null;

  const handleMouseMove = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      const stage = e.target.getStage();
      if (!stage) return;
      const pos = stage.getPointerPosition();
      if (pos) {
        const boardX = (pos.x - stage.x()) / stage.scaleX();
        const boardY = (pos.y - stage.y()) / stage.scaleY();
        cursorBoardPosRef.current = { x: boardX, y: boardY };
        updateCursor({ x: boardX, y: boardY });

        if (selectionStartRef.current) {
          const start = selectionStartRef.current;
          const dx = Math.abs(boardX - start.x);
          const dy = Math.abs(boardY - start.y);
          if (dx > 2 || dy > 2) {
            setSelectionBox({
              startX: start.x,
              startY: start.y,
              currentX: boardX,
              currentY: boardY,
            });
          }
        }

        if (panningRef.current && panStartRef.current) {
          panningMovedRef.current = true;
          pendingContextMenuRef.current = null;
          selectionStartRef.current = null;
          setSelectionBox(null);
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
    <>
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
                {gridVisible && <GridBackground />}
                {sortedObjects.map((obj) => (
                  <ShapeRenderer
                    key={obj.id}
                    data={obj}
                    otherObjects={objectList.filter((o) => o.id !== obj.id)}
                    onSelect={handleSelect}
                    isSelected={isSelected(obj.id)}
                    isMultiSelect={selectedIds.length > 1}
                    registerShapeRef={registerShapeRef}
                    onShapeDragEnd={handleShapeDragEnd}
                    onContextMenu={handleShapeContextMenu}
                    stageScale={scale}
                    onDragMoveTick={onDragMoveTick}
                    getLiveSnapPoints={getLiveSnapPoints}
                    dragMoveVersion={dragMoveVersion}
                    onDragEndAt={handleDragEndAt}
                    onDragMoveAt={handleDragMoveAt}
                    onFrameDragWithContents={handleFrameDragWithContents}
                  />
                ))}
                <MultiSelectTransformer
                  selectedIds={selectedIds}
                  nodeRefsRef={shapeRefsRef}
                  refsVersion={refsVersion}
                  objects={objects}
                  onTransformEnd={() => setLastDragEnd(Date.now())}
                  onTransform={onDragMoveTick}
                  onContextMenu={handleTransformerContextMenu}
                  onDragEndAt={handleDragEndAt}
                  onDragMoveAt={handleDragMoveAt}
                />
              </Layer>
              <Layer listening={false}>
                {selectionBox && (
                  <SelectionBox
                    x={Math.min(selectionBox.startX, selectionBox.currentX)}
                    y={Math.min(selectionBox.startY, selectionBox.currentY)}
                    width={Math.abs(selectionBox.currentX - selectionBox.startX)}
                    height={Math.abs(selectionBox.currentY - selectionBox.startY)}
                  />
                )}
              </Layer>
              <Layer listening={false}>
                <CursorOverlay stageRef={stageRef} others={others} />
              </Layer>
            </Stage>
            {selectedSingleObject != null &&
              containerRect != null &&
              selectedIds.length === 1 && (
                <ShapeToolbar
                  object={selectedSingleObject}
                  containerRect={containerRect}
                  shapeRect={(() => {
                    const box = getObjectBoundingBox(selectedSingleObject);
                    return {
                      x: position.x + box.x * scale,
                      y: position.y + box.y * scale,
                      width: box.width * scale,
                      height: box.height * scale,
                    };
                  })()}
                  onUpdate={(updates) =>
                    updateObject(selectedSingleObject.id, updates)
                  }
                />
              )}
            {contextMenu != null && (
              <ContextMenu
                x={contextMenu.x}
                y={contextMenu.y}
                visible
                onClose={() => setContextMenu(null)}
                items={
                  contextMenu.targetIds.length === 0
                    ? [
                        {
                          label: "Paste",
                          onClick: handlePaste,
                        },
                      ]
                    : [
                        {
                          label: "Copy",
                          onClick: handleCopy,
                        },
                        {
                          label: "Paste",
                          onClick: handlePaste,
                        },
                        ...(contextMenu.targetIds.length >= 2
                          ? [
                              {
                                label: "Create frame",
                                onClick: handleCreateFrameFromSelection,
                              },
                            ]
                          : []),
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
                      ]
                }
              />
            )}
          </div>
    </>
  );
}
