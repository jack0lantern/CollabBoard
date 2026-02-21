"use client";

import {
  Fragment,
  type RefObject,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Group, Arrow, Line, Circle } from "react-konva";
import type Konva from "konva";
import type { ObjectData } from "@/types";
import { useBoardMutations } from "@/hooks/useBoardMutations";
import {
  getSnapPointForConnection,
  findClosestSnapPointWithConnection,
} from "@/lib/utils/snapPoints";

const HIT_STROKE_WIDTH = 16;
const SNAP_THRESHOLD_SCREEN = 12;
const KNOB_RADIUS = 6;
const KNOB_STROKE = "#2563eb";
const KNOB_FILL = "#fff";
const HOVER_COLOR = "#3b82f6";
const HOVER_STROKE_WIDTH = 8;
const HOVER_OPACITY = 0.2;
const ARROW_LENGTH = 12;
const ARROW_WIDTH = 10;
const DEFAULT_LINE_STROKE_WIDTH = 2;

function setCursor(e: Konva.KonvaEventObject<MouseEvent>, cursor: string) {
  const container = e.target.getStage()?.container();
  if (container) container.style.cursor = cursor;
}

function rotatePoint(x: number, y: number, degrees: number) {
  const rad = (degrees * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return { x: x * cos - y * sin, y: x * sin + y * cos };
}

export function LineShape({
  data,
  objectsRef,
  ephemeralPosition,
  onSelect,
  isSelected,
  isMultiSelect,
  registerShapeRef,
  onShapeDragEnd,
  onDragStart,
  onContextMenu,
  stageScale = 1,
  getLiveSnapPoints,
  draggedIdsRef,
  subscribeToDragMove,
  onDragEndAt,
  onDragMoveAt,
  frameDragOffset,
  readOnly = false,
}: {
  data: ObjectData;
  objectsRef?: RefObject<Record<string, ObjectData>>;
  ephemeralPosition?: { x: number; y: number };
  onSelect: (id: string, addToSelection?: boolean) => void;
  isSelected?: boolean;
  isMultiSelect?: boolean;
  registerShapeRef?: (id: string, node: Konva.Node | null) => void;
  onShapeDragEnd?: () => void;
  onDragStart?: (objectId: string) => void;
  onDragEndAt?: (objectId: string, newX: number, newY: number) => void;
  onDragMoveAt?: (objectId: string, newX: number, newY: number) => void;
  onContextMenu?: (id: string, clientX: number, clientY: number) => void;
  stageScale?: number;
  getLiveSnapPoints?: (objectId: string) => { x: number; y: number }[] | null;
  draggedIdsRef?: RefObject<string[]>;
  subscribeToDragMove?: (fn: () => void) => () => void;
  frameDragOffset?: { dx: number; dy: number };
  readOnly?: boolean;
}) {
  const { updateObject } = useBoardMutations();
  const groupRef = useRef<Konva.Group | null>(null);
  const lineRef = useRef<Konva.Line | Konva.Arrow | null>(null);
  const pointsRef = useRef<number[]>([]);
  const dragStartPointsRef = useRef<number[] | null>(null);
  const [pos, setPos] = useState({ x: data.x, y: data.y });
  const [isDragging, setIsDragging] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [localPos, setLocalPos] = useState<{ x: number; y: number } | null>(null);
  const [localPoints, setLocalPoints] = useState<number[] | null>(null);
  const [dragUpdateTick, setDragUpdateTick] = useState(0);

  const hasConnections =
    data.lineStartConnection != null || data.lineEndConnection != null;

  useEffect(() => {
    if (!hasConnections || !subscribeToDragMove || !draggedIdsRef) return;
    return subscribeToDragMove(() => {
      const ids = draggedIdsRef.current ?? [];
      if (ids.length === 0) return;
      const connected =
        (data.lineStartConnection?.objectId != null &&
          ids.includes(data.lineStartConnection.objectId)) ||
        (data.lineEndConnection?.objectId != null &&
          ids.includes(data.lineEndConnection.objectId));
      if (connected) setDragUpdateTick((t) => t + 1);
    });
  }, [hasConnections, subscribeToDragMove, draggedIdsRef, data.lineStartConnection?.objectId, data.lineEndConnection?.objectId]);

  const baseX = isDragging ? pos.x : (localPos?.x ?? data.x);
  const baseY = isDragging ? pos.y : (localPos?.y ?? data.y);
  const displayX = (ephemeralPosition?.x ?? baseX) + (frameDragOffset?.dx ?? 0);
  const displayY = (ephemeralPosition?.y ?? baseY) + (frameDragOffset?.dy ?? 0);
  const displayRotation = data.rotation ?? 0;

  const lineColor = data.strokeColor ?? data.color ?? "#6b7280";
  const lineStrokeWidth = Math.max(
    1,
    (data.strokeWidth ?? 0) > 0 ? (data.strokeWidth ?? DEFAULT_LINE_STROKE_WIDTH) : DEFAULT_LINE_STROKE_WIDTH
  );
  const hasArrowStart = data.arrowStart === true;
  const hasArrowEnd = data.arrowEnd === true;
  const hasArrows = hasArrowStart || hasArrowEnd;
  const safeScale = Math.max(0.01, stageScale);
  const inverseScale = 1 / safeScale;
  const snapThreshold = SNAP_THRESHOLD_SCREEN / safeScale;

  const objectsById = (() => {
    const objs = objectsRef?.current ?? {};
    const map = new Map<string, ObjectData>();
    for (const obj of Object.values(objs)) {
      if (obj.id !== data.id) map.set(obj.id, obj);
    }
    return map;
  })();
  const otherObjects = Array.from(objectsById.values());

  const worldToLocal = useCallback(
    (worldX: number, worldY: number) => {
      const dx = worldX - displayX;
      const dy = worldY - displayY;
      return rotatePoint(dx, dy, -displayRotation);
    },
    [displayX, displayY, displayRotation]
  );

  const displayPoints = useMemo(() => {
    const base = localPoints ?? data.points ?? [0, 0, 100, 100];
    const pts = [...base];
    // Don't apply connections during whole-line drag—user is intentionally moving the line.
    // Use captured points from drag start to retain size and direction.
    if (isDragging && dragStartPointsRef.current != null) {
      return [...dragStartPointsRef.current];
    }
    if (isDragging) return pts;
    const startConn = data.lineStartConnection;
    const endConn = data.lineEndConnection;
    if (startConn) {
      const livePoints = getLiveSnapPoints?.(startConn.objectId);
      const liveSnap = livePoints?.[startConn.pointIndex];
      const snap =
        liveSnap ??
        (() => {
          const obj = objectsById.get(startConn.objectId);
          return obj ? getSnapPointForConnection(obj, startConn.pointIndex) : null;
        })();
      if (snap) {
        const local = worldToLocal(snap.x, snap.y);
        pts[0] = local.x;
        pts[1] = local.y;
      }
    }
    if (endConn) {
      const livePoints = getLiveSnapPoints?.(endConn.objectId);
      const liveSnap = livePoints?.[endConn.pointIndex];
      const snap =
        liveSnap ??
        (() => {
          const obj = objectsById.get(endConn.objectId);
          return obj ? getSnapPointForConnection(obj, endConn.pointIndex) : null;
        })();
      if (snap) {
        const local = worldToLocal(snap.x, snap.y);
        pts[2] = local.x;
        pts[3] = local.y;
      }
    }
    return pts;
  // eslint-disable-next-line react-hooks/exhaustive-deps -- dragUpdateTick forces refresh when connected shapes move
  }, [
    localPoints,
    data.points,
    data.lineStartConnection,
    data.lineEndConnection,
    objectsById,
    getLiveSnapPoints,
    isDragging,
    worldToLocal,
    dragUpdateTick,
  ]);

  pointsRef.current = displayPoints;

  useLayoutEffect(() => {
    if (isSelected && groupRef.current != null) {
      registerShapeRef?.(data.id, groupRef.current);
    } else {
      registerShapeRef?.(data.id, null);
    }
    return () => registerShapeRef?.(data.id, null);
  }, [isSelected, data.id, registerShapeRef]);

  const prevPosRef = useRef({ x: data.x, y: data.y });
  const prevPointsRef = useRef(data.points ?? [0, 0, 100, 100]);
  useEffect(() => {
    if (localPos != null) {
      const prev = prevPosRef.current;
      if (data.x !== prev.x || data.y !== prev.y) {
        setLocalPos(null);
      }
    }
    if (localPoints != null) {
      const prev = prevPointsRef.current;
      const curr = data.points ?? [0, 0, 100, 100];
      if (
        curr.length !== prev.length ||
        curr.some((v, i) => v !== prev[i])
      ) {
        setLocalPoints(null);
      }
    }
    prevPosRef.current = { x: data.x, y: data.y };
    prevPointsRef.current = data.points ?? [0, 0, 100, 100];
    if (!isDragging && localPos == null) {
      setPos({ x: data.x, y: data.y });
    }
  }, [data.x, data.y, data.points, isDragging, localPos, localPoints]);

  const showKnobs = isSelected && !isMultiSelect;
  const showHover = isHovered && !isSelected && !isDragging;

  const handleLineMouseEnter = (e: Konva.KonvaEventObject<MouseEvent>) => {
    setIsHovered(true);
    setCursor(e, "pointer");
  };

  const handleLineMouseLeave = (e: Konva.KonvaEventObject<MouseEvent>) => {
    setIsHovered(false);
    setCursor(e, "default");
  };

  const handleKnobMouseEnter = (e: Konva.KonvaEventObject<MouseEvent>) => {
    setCursor(e, "grab");
  };

  const handleKnobMouseLeave = (e: Konva.KonvaEventObject<MouseEvent>) => {
    setCursor(e, "pointer");
  };

  const makeKnobDragEnd = (knobIndex: 0 | 1) => (e: Konva.KonvaEventObject<DragEvent>) => {
    const target = e.target;
    let worldX = target.x();
    let worldY = target.y();
    const result = findClosestSnapPointWithConnection(
      worldX,
      worldY,
      otherObjects,
      data.id,
      snapThreshold
    );
    if (result.snapped) {
      worldX = result.x;
      worldY = result.y;
      target.position({ x: worldX, y: worldY });
    }
    const local = worldToLocal(worldX, worldY);
    const newPoints = [...pointsRef.current];
    const baseIdx = knobIndex * 2;
    newPoints[baseIdx] = local.x;
    newPoints[baseIdx + 1] = local.y;
    setLocalPoints(newPoints);
    const updates: Partial<ObjectData> = { points: newPoints };
    if (knobIndex === 0) {
      updates.lineStartConnection = result.connection ?? undefined;
    } else {
      updates.lineEndConnection = result.connection ?? undefined;
    }
    updateObject(data.id, updates);
    onShapeDragEnd?.();
    setCursor(e as unknown as Konva.KonvaEventObject<MouseEvent>, "grab");
  };

  const handleKnobDragMove = (knobIndex: 0 | 1) => (e: Konva.KonvaEventObject<DragEvent>) => {
    const target = e.target;
    let worldX = target.x();
    let worldY = target.y();
    const result = findClosestSnapPointWithConnection(
      worldX,
      worldY,
      otherObjects,
      data.id,
      snapThreshold
    );
    if (result.snapped) {
      worldX = result.x;
      worldY = result.y;
      target.position({ x: worldX, y: worldY });
    }
    const local = worldToLocal(worldX, worldY);
    const pts = pointsRef.current;
    const newPoints =
      knobIndex === 0
        ? [local.x, local.y, pts[2], pts[3]]
        : [pts[0], pts[1], local.x, local.y];
    const line = lineRef.current;
    if (line) {
      line.points(newPoints);
      line.getLayer()?.batchDraw();
    }
  };

  const sharedLineProps = {
    points: displayPoints,
    x: 0,
    y: 0,
    strokeWidth: lineStrokeWidth,
    strokeScaleEnabled: false,
    hitStrokeWidth: HIT_STROKE_WIDTH,
    listening: true,
    onMouseEnter: handleLineMouseEnter,
    onMouseLeave: handleLineMouseLeave,
  };

  const r0 = rotatePoint(displayPoints[0], displayPoints[1], displayRotation);
  const r1 = rotatePoint(displayPoints[2], displayPoints[3], displayRotation);
  const knob0X = displayX + r0.x;
  const knob0Y = displayY + r0.y;
  const knob1X = displayX + r1.x;
  const knob1Y = displayY + r1.y;

  return (
    <Fragment>
      {/* Line Group - draggable for whole-line move, contains only the line */}
      <Group
        key={`${data.id}-line`}
        ref={groupRef}
        x={displayX}
        y={displayY}
        rotation={displayRotation}
        draggable={!readOnly}
        onMouseDown={(e) => {
          if (e.evt.button !== 0) return;
          e.cancelBubble = true;
          onSelect(data.id, e.evt.shiftKey);
        }}
        onContextMenu={(e) => {
          e.evt.preventDefault();
          onContextMenu?.(data.id, e.evt.clientX, e.evt.clientY);
        }}
        onDragStart={() => {
          dragStartPointsRef.current = [...pointsRef.current];
          setIsDragging(true);
          onDragStart?.(data.id);
        }}
        onDragMove={(e) => {
          const x = e.target.x();
          const y = e.target.y();
          setPos({ x, y });
          onDragMoveAt?.(data.id, x, y);
        }}
        onDragEnd={(e) => {
          const newX = e.target.x();
          const newY = e.target.y();
          const pointsToPersist = dragStartPointsRef.current ?? pointsRef.current;
          dragStartPointsRef.current = null;
          setLocalPos({ x: newX, y: newY });
          setIsDragging(false);
          updateObject(data.id, {
            x: newX,
            y: newY,
            points: pointsToPersist,
            lineStartConnection: undefined,
            lineEndConnection: undefined,
          });
          onDragEndAt?.(data.id, newX, newY);
          onShapeDragEnd?.();
        }}
      >
        {showHover && (
          <Line
            points={displayPoints}
            stroke={HOVER_COLOR}
            strokeWidth={HOVER_STROKE_WIDTH}
            strokeScaleEnabled={false}
            opacity={HOVER_OPACITY}
            listening={false}
            lineCap="round"
            lineJoin="round"
            perfectDrawEnabled={false}
          />
        )}

        {hasArrows ? (
          <Arrow
            ref={lineRef as React.RefObject<Konva.Arrow>}
            {...sharedLineProps}
            stroke={lineColor}
            fill={lineColor}
            dash={isSelected ? [8, 4] : undefined}
            pointerAtBeginning={hasArrowStart}
            pointerAtEnding={hasArrowEnd}
            pointerLength={ARROW_LENGTH * inverseScale}
            pointerWidth={ARROW_WIDTH * inverseScale}
          />
        ) : (
          <Line
            ref={lineRef as React.RefObject<Konva.Line>}
            {...sharedLineProps}
            stroke={lineColor}
            dash={isSelected ? [8, 4] : undefined}
          />
        )}
      </Group>

      {/* Knobs as siblings - dragging them does not affect the Group */}
      {showKnobs && (
        <>
          <Circle
            key={`${data.id}-knob0`}
            x={knob0X}
            y={knob0Y}
              radius={KNOB_RADIUS}
              fill={KNOB_FILL}
              stroke={KNOB_STROKE}
              strokeWidth={2}
              scaleX={inverseScale}
              scaleY={inverseScale}
              draggable={!readOnly}
              onMouseDown={(e) => {
                e.cancelBubble = true;
                setCursor(e, "grabbing");
              }}
              onMouseEnter={handleKnobMouseEnter}
              onMouseLeave={handleKnobMouseLeave}
              onDragMove={handleKnobDragMove(0)}
              onDragEnd={makeKnobDragEnd(0)}
            />
            <Circle
              key={`${data.id}-knob1`}
              x={knob1X}
              y={knob1Y}
              radius={KNOB_RADIUS}
              fill={KNOB_FILL}
              stroke={KNOB_STROKE}
              strokeWidth={2}
              scaleX={inverseScale}
              scaleY={inverseScale}
              draggable={!readOnly}
              onMouseDown={(e) => {
                e.cancelBubble = true;
                setCursor(e, "grabbing");
              }}
              onMouseEnter={handleKnobMouseEnter}
              onMouseLeave={handleKnobMouseLeave}
              onDragMove={handleKnobDragMove(1)}
              onDragEnd={makeKnobDragEnd(1)}
            />
          </>
        )}
    </Fragment>
  );
}
