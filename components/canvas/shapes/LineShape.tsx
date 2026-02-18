"use client";

import { useEffect, useRef, useState } from "react";
import { Group, Arrow, Line, Circle } from "react-konva";
import type Konva from "konva";
import type { ObjectData } from "@/types";
import { useBoardMutations } from "@/hooks/useBoardMutations";

const HIT_STROKE_WIDTH = 16;
const KNOB_RADIUS = 6;
const KNOB_STROKE = "#2563eb";
const KNOB_FILL = "#fff";
const HOVER_COLOR = "#3b82f6";
const HOVER_STROKE_WIDTH = 8;
const HOVER_OPACITY = 0.2;
const ARROW_LENGTH = 12;
const ARROW_WIDTH = 10;
const LINE_STROKE_WIDTH = 2;

export function LineShape({
  data,
  onSelect,
  isSelected,
  isMultiSelect,
  registerShapeRef,
  onShapeDragEnd,
  onContextMenu,
  stageScale = 1,
}: {
  data: ObjectData;
  onSelect: (id: string, addToSelection?: boolean) => void;
  isSelected?: boolean;
  isMultiSelect?: boolean;
  registerShapeRef?: (id: string, node: Konva.Node | null) => void;
  onShapeDragEnd?: () => void;
  onContextMenu?: (id: string, clientX: number, clientY: number) => void;
  stageScale?: number;
}) {
  const { updateObject } = useBoardMutations();
  const groupRef = useRef<Konva.Group | null>(null);
  const pointsRef = useRef<number[]>([]);
  const [pos, setPos] = useState({ x: data.x, y: data.y });
  const [isDragging, setIsDragging] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [localPos, setLocalPos] = useState<{ x: number; y: number } | null>(null);
  const [localPoints, setLocalPoints] = useState<number[] | null>(null);
  const [dragKnobPosition, setDragKnobPosition] = useState<{
    index: 0 | 1;
    x: number;
    y: number;
  } | null>(null);
  const rafRef = useRef<number | null>(null);
  const pendingDragRef = useRef<{
    index: 0 | 1;
    x: number;
    y: number;
  } | null>(null);

  const scheduleDragUpdate = (index: 0 | 1, x: number, y: number) => {
    pendingDragRef.current = { index, x, y };
    if (rafRef.current == null) {
      rafRef.current = requestAnimationFrame(() => {
        const p = pendingDragRef.current;
        if (p) {
          setDragKnobPosition(p);
          pendingDragRef.current = null;
        }
        rafRef.current = null;
      });
    }
  };

  const points = localPoints ?? data.points ?? [0, 0, 100, 100];
  pointsRef.current = points;
  const displayX = isDragging ? pos.x : (localPos?.x ?? data.x);
  const displayY = isDragging ? pos.y : (localPos?.y ?? data.y);

  const displayPoints =
    dragKnobPosition != null
      ? dragKnobPosition.index === 0
        ? [dragKnobPosition.x, dragKnobPosition.y, points[2], points[3]]
        : [points[0], points[1], dragKnobPosition.x, dragKnobPosition.y]
      : points;

  const lineColor = data.color ?? "#6b7280";
  const hasArrowStart = data.arrowStart === true;
  const hasArrowEnd = data.arrowEnd === true;
  const hasArrows = hasArrowStart || hasArrowEnd;
  const safeScale = Math.max(0.01, stageScale);
  const inverseScale = 1 / safeScale;

  useEffect(() => {
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
    const container = e.target.getStage()?.container();
    if (container) container.style.cursor = "pointer";
  };

  const handleLineMouseLeave = (e: Konva.KonvaEventObject<MouseEvent>) => {
    setIsHovered(false);
    const container = e.target.getStage()?.container();
    if (container) container.style.cursor = "default";
  };

  const handleKnobMouseEnter = (e: Konva.KonvaEventObject<MouseEvent>) => {
    const container = e.target.getStage()?.container();
    if (container) container.style.cursor = "grab";
  };

  const handleKnobMouseLeave = (e: Konva.KonvaEventObject<MouseEvent>) => {
    const container = e.target.getStage()?.container();
    if (container) container.style.cursor = "default";
  };

  const makeKnobDragEnd = (knobIndex: 0 | 1) => (e: Konva.KonvaEventObject<DragEvent>) => {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    pendingDragRef.current = null;
    const target = e.target;
    const newPoints = [...pointsRef.current];
    const baseIdx = knobIndex * 2;
    newPoints[baseIdx] = target.x();
    newPoints[baseIdx + 1] = target.y();
    setDragKnobPosition(null);
    setLocalPoints(newPoints);
    updateObject(data.id, { points: newPoints });
    onShapeDragEnd?.();
  };

  const sharedLineProps = {
    points: displayPoints,
    x: 0,
    y: 0,
    strokeWidth: LINE_STROKE_WIDTH,
    strokeScaleEnabled: false,
    hitStrokeWidth: HIT_STROKE_WIDTH,
    listening: true,
    onMouseEnter: handleLineMouseEnter,
    onMouseLeave: handleLineMouseLeave,
  };

  return (
    <Group
      ref={groupRef}
      x={displayX}
      y={displayY}
      draggable
      onMouseDown={(e) => {
        if (e.evt.button !== 0) return;
        e.cancelBubble = true;
        onSelect(data.id, e.evt.shiftKey);
      }}
      onContextMenu={(e) => {
        e.evt.preventDefault();
        onContextMenu?.(data.id, e.evt.clientX, e.evt.clientY);
      }}
      onDragStart={() => setIsDragging(true)}
      onDragMove={(e) => setPos({ x: e.target.x(), y: e.target.y() })}
      onDragEnd={(e) => {
        const newX = e.target.x();
        const newY = e.target.y();
        setLocalPos({ x: newX, y: newY });
        setIsDragging(false);
        updateObject(data.id, { x: newX, y: newY });
        onShapeDragEnd?.();
      }}
    >
      {/* Hover highlight glow rendered behind the main line */}
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

      {/* Main line body (Arrow when arrowheads are configured) */}
      {hasArrows ? (
        <Arrow
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
          {...sharedLineProps}
          stroke={lineColor}
          dash={isSelected ? [8, 4] : undefined}
        />
      )}

      {/* Endpoint knobs (single selection only, zoom-independent size) */}
      {showKnobs && (
        <>
          <Circle
            x={displayPoints[0]}
            y={displayPoints[1]}
            radius={KNOB_RADIUS}
            fill={KNOB_FILL}
            stroke={KNOB_STROKE}
            strokeWidth={2}
            scaleX={inverseScale}
            scaleY={inverseScale}
            draggable
            onMouseDown={(e) => { e.cancelBubble = true; }}
            onMouseEnter={handleKnobMouseEnter}
            onMouseLeave={handleKnobMouseLeave}
            onDragStart={() =>
              setDragKnobPosition({ index: 0, x: points[0], y: points[1] })
            }
            onDragMove={(e) => scheduleDragUpdate(0, e.target.x(), e.target.y())}
            onDragEnd={makeKnobDragEnd(0)}
          />
          <Circle
            x={displayPoints[2]}
            y={displayPoints[3]}
            radius={KNOB_RADIUS}
            fill={KNOB_FILL}
            stroke={KNOB_STROKE}
            strokeWidth={2}
            scaleX={inverseScale}
            scaleY={inverseScale}
            draggable
            onMouseDown={(e) => { e.cancelBubble = true; }}
            onMouseEnter={handleKnobMouseEnter}
            onMouseLeave={handleKnobMouseLeave}
            onDragStart={() =>
              setDragKnobPosition({ index: 1, x: points[2], y: points[3] })
            }
            onDragMove={(e) => scheduleDragUpdate(1, e.target.x(), e.target.y())}
            onDragEnd={makeKnobDragEnd(1)}
          />
        </>
      )}
    </Group>
  );
}
