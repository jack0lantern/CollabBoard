"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Stage, Layer, Line } from "react-konva";
import type Konva from "konva";
import { useBoardObjectsContext } from "@/hooks/useBoardObjects";
import { useThrottledDragBroadcast } from "@/hooks/useThrottledDragBroadcast";
import { usePresence } from "@/hooks/usePresence";
import { useBoardContext } from "@/components/providers/RealtimeBoardProvider";
import { ShapeRenderer } from "./shapes/ShapeRenderer";
import { CursorOverlay } from "./CursorOverlay";
import { GridBackground } from "./GridBackground";
import { SelectionBox } from "./SelectionBox";
import { MultiSelectTransformer } from "./MultiSelectTransformer";
import { usePanZoom } from "@/hooks/usePanZoom";
import { useGrid } from "@/components/providers/GridProvider";
import { useSetViewport } from "@/components/providers/ViewportProvider";
import { useBoardMutations } from "@/hooks/useBoardMutations";
import { useSelection } from "@/hooks/useSelection";
import { useTool } from "@/components/providers/ToolProvider";
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
  isLinePartOfFrame,
  getLineEffectiveZIndex,
} from "@/lib/utils/boundingBox";
import { applyObjectToKonvaNode } from "@/lib/utils/applyObjectToKonvaNode";
import { getNodeSnapPoints } from "@/lib/utils/snapPoints";
import { ShapeToolbar } from "./ShapeToolbar";

export function BoardStage({ boardId }: { boardId: string }) {
  const { readOnly = false } = useBoardContext();
  const stageRef = useRef<Konva.Stage | null>(null);
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
  const setViewport = useSetViewport();
  const {
    selectedIds,
    select,
    setSelection,
    addToSelection,
    clearSelection,
    isSelected,
  } = useSelection();
  const { activeTool, penColor, penStrokeWidth } = useTool();

  const [selectionBox, setSelectionBox] = useState<{
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
  } | null>(null);
  const selectionBoxRef = useRef(selectionBox);
  useLayoutEffect(() => {
    selectionBoxRef.current = selectionBox;
  });

  const shapeRefsRef = useRef<Map<string, Konva.Node>>(new Map());
  const [refsVersion, setRefsVersion] = useState(0);
  const draggedIdsRef = useRef<string[]>([]);
  const draggedPositionsRef = useRef<Record<string, { x: number; y: number }>>({});
  const copiedObjectsRef = useRef<ObjectData[]>([]);

  const rafIdRef = useRef<number | null>(null);
  const dragEmitter = useMemo(() => {
    const listeners = new Set<() => void>();
    return {
      emit: () => {
        if (rafIdRef.current != null) return;
        rafIdRef.current = requestAnimationFrame(() => {
          rafIdRef.current = null;
          listeners.forEach((fn) => fn());
        });
      },
      subscribe: (fn: () => void) => {
        listeners.add(fn);
        return () => listeners.delete(fn);
      },
    };
  }, []);

  const onDragMoveTick = useCallback(() => {
    dragEmitter.emit();
  }, [dragEmitter]);

  const handleDragStart = useCallback((objectId: string) => {
    draggedIdsRef.current = [objectId];
  }, []);

  useEffect(() => {
    setViewport({ position, scale, dimensions });
  }, [position, scale, dimensions, setViewport]);

  const registerShapeRef = useCallback((id: string, node: Konva.Node | null) => {
    const map = shapeRefsRef.current;
    if (node) {
      map.set(id, node);
      setRefsVersion((v) => v + 1);
    } else {
      map.delete(id);
    }
  }, []);

  const {
    objects,
    objectsRef,
    pushUndoSnapshot,
    broadcastDragMoveHandlerRef,
    applyUndoRedoRef,
  } = useBoardObjectsContext();
  const broadcastDragMove = useThrottledDragBroadcast(boardId);

  const handleMultiDragStart = useCallback(
    (ids: string[]) => {
      pushUndoSnapshot();
      draggedIdsRef.current = [...ids];
    },
    [pushUndoSnapshot]
  );

  useLayoutEffect(() => {
    if (readOnly) return;
    broadcastDragMoveHandlerRef.current = (positions) => {
      const refs = shapeRefsRef.current;
      let layer: ReturnType<Konva.Node["getLayer"]> = null;
      for (const [id, pos] of Object.entries(positions)) {
        const node = refs.get(id);
        if (node) {
          node.x(pos.x);
          node.y(pos.y);
          layer ??= node.getLayer();
        }
      }
      layer?.batchDraw();
    };
    applyUndoRedoRef.current = (changedObjects) => {
      const refs = shapeRefsRef.current;
      let layer: ReturnType<Konva.Node["getLayer"]> = null;
      for (const [id, obj] of Object.entries(changedObjects)) {
        const node = refs.get(id);
        if (node) {
          applyObjectToKonvaNode(node, obj);
          layer ??= node.getLayer();
        }
      }
      layer?.batchDraw();
    };
    return () => {
      broadcastDragMoveHandlerRef.current = null;
      applyUndoRedoRef.current = null;
    };
  }, [readOnly, broadcastDragMoveHandlerRef, applyUndoRedoRef]);
  const { others, updateCursor } = usePresence();
  const {
    addObject,
    updateObject,
    updateMultipleObjects,
    deleteObject,
  } = useBoardMutations();

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
    (obj): obj is ObjectData =>
      typeof obj === "object" &&
      "id" in obj &&
      "type" in obj &&
      "x" in obj &&
      "y" in obj
  );
  const objectList = rawList;
  useLayoutEffect(() => {
    objectListRef.current = objectList;
  });
  const sortedObjects = [...objectList].sort((a, b) => {
    const za = a.type === "line" ? getLineEffectiveZIndex(a, objectList) : (a.zIndex ?? 0);
    const zb = b.type === "line" ? getLineEffectiveZIndex(b, objectList) : (b.zIndex ?? 0);
    return za - zb;
  });

  const applyZOrderUpdates = useCallback(
    (updates: Map<string, number>) => {
      updates.forEach((zIndex, id) => {
        updateObject(id, { zIndex });
      });
    },
    [updateObject]
  );

  const panStartRef = useRef<{ pointer: { x: number; y: number }; position: { x: number; y: number } } | null>(null);
  const panRafIdRef = useRef<number | null>(null);
  const pendingPanRef = useRef<{ pointer: { x: number; y: number }; position: { x: number; y: number } } | null>(null);
  const panningMovedRef = useRef(false);
  const pendingContextMenuRef = useRef<{ x: number; y: number; targetIds: string[] } | null>(null);
  const selectionStartRef = useRef<{ x: number; y: number } | null>(null);
  const cursorBoardPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const [drawingStroke, setDrawingStroke] = useState<{
    originX: number;
    originY: number;
    points: number[];
  } | null>(null);
  const drawingStrokeRef = useRef(drawingStroke);
  useLayoutEffect(() => {
    drawingStrokeRef.current = drawingStroke;
  }, [drawingStroke]);

  const handleStageMouseDown = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      const stage = e.target.getStage();
      const clickedOnEmpty = stage != null && e.target === stage;

      if (clickedOnEmpty && e.evt.button === 0) {
        const pos = stage.getPointerPosition();
        if (pos) {
          const board = screenToBoard(stage, pos.x, pos.y);
          if (activeTool === "pen" && !readOnly) {
            setDrawingStroke({
              originX: board.x,
              originY: board.y,
              points: [0, 0],
            });
          } else {
            selectionStartRef.current = { x: board.x, y: board.y };
          }
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
    [position.x, position.y, activeTool, readOnly]
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
    draggedIdsRef.current = [];
  }, []);

  const handleDragEndAt = useCallback(
    (objectId: string, newX: number, newY: number) => {
      const obj = objectsRef.current[objectId];
      if (!obj || obj.type === "frame") return;
      const objWithNewPos = { ...obj, x: newX, y: newY };
      const objects = objectListRef.current;
      if (obj.type === "line") {
        const effectiveZ = getLineEffectiveZIndex(objWithNewPos, objects);
        if ((obj.zIndex ?? 0) < effectiveZ) {
          updateObject(objectId, { zIndex: effectiveZ });
        }
      } else {
        const maxFrameZ = getTopmostFrameZIndex(objWithNewPos, objects);
        if (maxFrameZ != null && (obj.zIndex ?? 0) <= maxFrameZ) {
          updateObject(objectId, { zIndex: maxFrameZ + 1 });
        }
      }
    },
    [updateObject]
  );

  const frameDragContentsRef = useRef<Set<string>>(new Set());

  const handleFrameDragWithContents = useCallback(
    (
      _frameId: string,
      _prevX: number,
      _prevY: number,
      deltaX: number,
      deltaY: number
    ) => {
      const refs = shapeRefsRef.current;
      for (const id of frameDragContentsRef.current) {
        const node = refs.get(id);
        if (node) {
          node.x(node.x() + deltaX);
          node.y(node.y() + deltaY);
        }
      }
      stageRef.current?.batchDraw();
    },
    []
  );

  const handleFrameDragStart = useCallback(
    (frameId: string, startX: number, startY: number) => {
      pushUndoSnapshot();
      const frame = objectsRef.current[frameId];
      if (!frame || frame.type !== "frame") return;
      const frameBox = getObjectBoundingBox({ ...frame, x: startX, y: startY });
      const frameZ = frame.zIndex ?? 0;
      const objectsOnTop = getObjectsOnTopOfFrame(
        frameId,
        frameBox,
        frameZ,
        objectListRef.current
      );
      const objectsOnFrameIds = new Set(
        objectsOnTop.filter((o) => o.type !== "line").map((o) => o.id)
      );
      const idsToMove = objectsOnTop.filter(
        (o) =>
          o.type !== "line" || isLinePartOfFrame(o, frameId, objectsOnFrameIds)
      );
      frameDragContentsRef.current = new Set(idsToMove.map((o) => o.id));
    },
    [pushUndoSnapshot]
  );

  const handleFrameDragEnd = useCallback(
    (frameId: string, newX: number, newY: number) => {
      const batch: Array<{ id: string; updates: Partial<ObjectData> }> = [
        { id: frameId, updates: { x: newX, y: newY } },
      ];
      const fullObjects: ObjectData[] = [];
      const refs = shapeRefsRef.current;
      const frame = objectsRef.current[frameId];
      if (frame) {
        fullObjects.push({ ...frame, x: newX, y: newY });
      }
      for (const id of frameDragContentsRef.current) {
        const node = refs.get(id);
        const obj = objectsRef.current[id];
        if (node && obj) {
          const x = node.x();
          const y = node.y();
          batch.push({ id, updates: { x, y } });
          fullObjects.push({ ...obj, x, y });
        }
      }
      frameDragContentsRef.current.clear();
      if (batch.length > 1) {
        updateMultipleObjects(batch, {
          skipUndo: true,
          fullObjects,
        });
      } else {
        updateObject(frameId, { x: newX, y: newY }, { skipUndo: true });
      }
    },
    [updateObject, updateMultipleObjects]
  );

  const handleDragMoveAt = useCallback(
    (objectId: string, newX: number, newY: number) => {
      broadcastDragMove({ [objectId]: { x: newX, y: newY } });
    },
    [broadcastDragMove]
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
      .map((id) => objectsRef.current[id])
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
      .map((id) => objectsRef.current[id])
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
    if (readOnly) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      const tagName = (e.target as HTMLElement).tagName;
      if (["INPUT", "TEXTAREA"].includes(tagName)) {
        return;
      }
      if (e.key === "Escape") {
        setDrawingStroke(null);
      } else if ((e.key === "Delete" || e.key === "Backspace") && selectedIds.length > 0) {
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
          .map((id) => objectsRef.current[id])
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
    readOnly,
    selectedIds,
    handleDeleteSelected,
    addObject,
    setSelection,
    handleAddFrame,
    dimensions,
    position,
    scale,
  ]);

  const selectedIdsRef = useRef(selectedIds);
  selectedIdsRef.current = selectedIds;

  const handleShapeContextMenu = useCallback(
    (id: string, clientX: number, clientY: number) => {
      if (panningRef.current) {
        pendingContextMenuRef.current = { x: clientX, y: clientY, targetIds: [id] };
        return;
      }
      const ids = selectedIdsRef.current;
      const idSelected = ids.includes(id);
      const targetIds = idSelected ? ids : [id];
      if (!idSelected) {
        select(id);
      }
      setContextMenu({ x: clientX, y: clientY, targetIds });
    },
    [select]
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
      const stroke = drawingStrokeRef.current;
      if (e.button === 0 && stroke) {
        pushUndoSnapshot();
        const maxZ = Math.max(0, ...objectListRef.current.map((o) => o.zIndex ?? 0));
        const points = stroke.points.length >= 4 ? stroke.points : [0, 0, 1, 1];
        addObject({
          id: crypto.randomUUID(),
          type: "pen",
          x: stroke.originX,
          y: stroke.originY,
          zIndex: maxZ + 1,
          points,
          strokeColor: penColor,
          strokeWidth: penStrokeWidth,
        });
        setDrawingStroke(null);
      }

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
      } else if (e.button === 0 && selectionStartRef.current && !stroke) {
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
      if (panRafIdRef.current != null) {
        cancelAnimationFrame(panRafIdRef.current);
        panRafIdRef.current = null;
        const pending = pendingPanRef.current;
        if (pending) {
          setPosition(pending.position);
        }
        pendingPanRef.current = null;
      }
    };
    window.addEventListener("mouseup", handleMouseUp);
    return () => window.removeEventListener("mouseup", handleMouseUp);
  }, [select, setSelection, clearSelection, setPosition, addObject, pushUndoSnapshot, penColor, penStrokeWidth]);

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
        if (!panningRef.current) updateCursor({ x: boardX, y: boardY });

        if (drawingStroke) {
          setDrawingStroke((prev) => {
            if (!prev) return null;
            const dx = boardX - prev.originX;
            const dy = boardY - prev.originY;
            const lastPx = prev.points[prev.points.length - 2];
            const lastPy = prev.points[prev.points.length - 1];
            if (Math.abs(dx - lastPx) < 0.5 && Math.abs(dy - lastPy) < 0.5) {
              return prev;
            }
            return {
              ...prev,
              points: [...prev.points, dx, dy],
            };
          });
        } else if (selectionStartRef.current) {
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
          setDrawingStroke(null);
          setSelectionBox(null);
          const deltaX = pos.x - panStartRef.current.pointer.x;
          const deltaY = pos.y - panStartRef.current.pointer.y;
          const newPosition = {
            x: panStartRef.current.position.x + deltaX,
            y: panStartRef.current.position.y + deltaY,
          };
          pendingPanRef.current = {
            pointer: { x: pos.x, y: pos.y },
            position: newPosition,
          };
          if (panRafIdRef.current == null) {
            panRafIdRef.current = requestAnimationFrame(() => {
              panRafIdRef.current = null;
              const pending = pendingPanRef.current;
              if (pending) {
                setPosition(pending.position);
                panStartRef.current = pending;
              }
            });
          }
          setContextMenu(null);
        }
      }
    },
    [updateCursor, setPosition, drawingStroke]
  );

  const handleMouseLeave = useCallback(() => {
    updateCursor(null);
  }, [updateCursor]);

  return (
    <>
          <div
            ref={containerRef}
            className="w-full h-full relative"
            data-testid="board-stage"
            onMouseDownCapture={handleContainerMouseDownCapture}
            onContextMenu={readOnly ? (e) => e.preventDefault() : undefined}
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
              onContextMenu={readOnly ? (e) => e.evt.preventDefault() : handleStageContextMenu}
            >
              <Layer>
                {gridVisible && <GridBackground />}
                {sortedObjects.map((obj) => (
                  <ShapeRenderer
                    key={obj.id}
                    data={obj}
                    objectsRef={objectsRef}
                    ephemeralPosition={
                      !readOnly && selectedIds.length > 1
                        ? draggedPositionsRef.current[obj.id]
                        : undefined
                    }
                    onSelect={readOnly ? () => {} : handleSelect}
                    isSelected={!readOnly && isSelected(obj.id)}
                    isMultiSelect={!readOnly && selectedIds.length > 1}
                    registerShapeRef={readOnly ? undefined : registerShapeRef}
                    onShapeDragEnd={readOnly ? undefined : handleShapeDragEnd}
                    onContextMenu={readOnly ? undefined : handleShapeContextMenu}
                    stageScale={scale}
                    onDragMoveTick={readOnly ? undefined : onDragMoveTick}
                    onDragStart={readOnly ? undefined : handleDragStart}
                    getLiveSnapPoints={readOnly ? undefined : getLiveSnapPoints}
                    draggedIdsRef={readOnly ? undefined : draggedIdsRef}
                    subscribeToDragMove={readOnly ? undefined : dragEmitter.subscribe}
                    onDragEndAt={readOnly ? undefined : handleDragEndAt}
                    onDragMoveAt={readOnly ? undefined : handleDragMoveAt}
                    onFrameDragWithContents={readOnly ? undefined : handleFrameDragWithContents}
                    onFrameDragStart={readOnly ? undefined : handleFrameDragStart}
                    onFrameDragEnd={readOnly ? undefined : handleFrameDragEnd}
                    readOnly={readOnly}
                  />
                ))}
                {!readOnly && drawingStroke && (
                  <Line
                    points={drawingStroke.points}
                    x={drawingStroke.originX}
                    y={drawingStroke.originY}
                    stroke={penColor}
                    strokeWidth={penStrokeWidth}
                    strokeScaleEnabled={false}
                    lineCap="round"
                    lineJoin="round"
                    tension={0.5}
                    listening={false}
                  />
                )}
                {!readOnly && (
                <MultiSelectTransformer
                  selectedIds={selectedIds}
                  nodeRefsRef={shapeRefsRef}
                  refsVersion={refsVersion}
                  objects={objects}
                  draggedPositionsRef={draggedPositionsRef}
                  onTransformEnd={() => {
                    setLastDragEnd(Date.now());
                    draggedIdsRef.current = [];
                  }}
                  onTransform={onDragMoveTick}
                  onDragStart={handleMultiDragStart}
                  onContextMenu={handleTransformerContextMenu}
                  onDragEndAt={handleDragEndAt}
                  onDragMoveAt={handleDragMoveAt}
                  onBroadcastDragMove={broadcastDragMove}
                />
                )}
              </Layer>
              <Layer listening={false}>
                {!readOnly && selectionBox && (
                  <SelectionBox
                    x={Math.min(selectionBox.startX, selectionBox.currentX)}
                    y={Math.min(selectionBox.startY, selectionBox.currentY)}
                    width={Math.abs(selectionBox.currentX - selectionBox.startX)}
                    height={Math.abs(selectionBox.currentY - selectionBox.startY)}
                  />
                )}
              </Layer>
              {!readOnly && (
              <Layer listening={false}>
                <CursorOverlay others={others} />
              </Layer>
              )}
            </Stage>
            {!readOnly &&
              selectedSingleObject != null &&
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
                  onUpdate={(updates) => {
                    updateObject(selectedSingleObject.id, updates);
                  }}
                />
              )}
            {readOnly && (
              <div
                className="absolute bottom-3 right-3 px-2 py-1 rounded text-xs text-gray-500 bg-white/80 backdrop-blur-sm pointer-events-none"
                style={{ boxShadow: "0 1px 2px rgba(0,0,0,0.1)" }}
              >
                Pan with middle or right click
              </div>
            )}
            {!readOnly && contextMenu != null && (
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
                            queueMicrotask(() => {
                              applyZOrderUpdates(updates);
                            });
                          },
                        },
                        {
                          label: "Send to back",
                          onClick: () => {
                            const targetIds = contextMenu.targetIds;
                            const updates = computeSendToBack(objectList, targetIds);
                            queueMicrotask(() => {
                              applyZOrderUpdates(updates);
                            });
                          },
                        },
                        {
                          label: "Bring forward",
                          onClick: () => {
                            const targetIds = contextMenu.targetIds;
                            const updates = computeBringForward(objectList, targetIds);
                            queueMicrotask(() => {
                              applyZOrderUpdates(updates);
                            });
                          },
                        },
                        {
                          label: "Send backward",
                          onClick: () => {
                            const targetIds = contextMenu.targetIds;
                            const updates = computeSendBackward(objectList, targetIds);
                            queueMicrotask(() => {
                              applyZOrderUpdates(updates);
                            });
                          },
                        },
                        {
                          label: "Delete",
                          onClick: () => {
                            handleDeleteSelected(contextMenu.targetIds);
                          },
                        },
                      ]
                }
              />
            )}
          </div>
    </>
  );
}
