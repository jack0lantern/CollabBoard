"use client";

import { Fragment, useEffect, useLayoutEffect, useRef, useState } from "react";
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

function setCursor(e: Konva.KonvaEventObject<MouseEvent>, cursor: string) {
  const container = e.target.getStage()?.container();
  if (container) container.style.cursor = cursor;
}

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
  const lineRef = useRef<Konva.Line | Konva.Arrow | null>(null);
  const pointsRef = useRef<number[]>([]);
  const [pos, setPos] = useState({ x: data.x, y: data.y });
  const [isDragging, setIsDragging] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [localPos, setLocalPos] = useState<{ x: number; y: number } | null>(null);
  const [localPoints, setLocalPoints] = useState<number[] | null>(null);

  const points = localPoints ?? data.points ?? [0, 0, 100, 100];
  pointsRef.current = points;
  const displayX = isDragging ? pos.x : (localPos?.x ?? data.x);
  const displayY = isDragging ? pos.y : (localPos?.y ?? data.y);
  const displayPoints = points;

  const lineColor = data.color ?? "#6b7280";
  const hasArrowStart = data.arrowStart === true;
  const hasArrowEnd = data.arrowEnd === true;
  const hasArrows = hasArrowStart || hasArrowEnd;
  const safeScale = Math.max(0.01, stageScale);
  const inverseScale = 1 / safeScale;

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
    const newPoints = [...pointsRef.current];
    const baseIdx = knobIndex * 2;
    newPoints[baseIdx] = target.x() - displayX;
    newPoints[baseIdx + 1] = target.y() - displayY;
    setLocalPoints(newPoints);
    updateObject(data.id, { points: newPoints });
    onShapeDragEnd?.();
    setCursor(e as unknown as Konva.KonvaEventObject<MouseEvent>, "grab");
  };

  const handleKnobDragMove = (knobIndex: 0 | 1) => (e: Konva.KonvaEventObject<DragEvent>) => {
    const target = e.target;
    const relX = target.x() - displayX;
    const relY = target.y() - displayY;
    const pts = pointsRef.current;
    const newPoints =
      knobIndex === 0
        ? [relX, relY, pts[2], pts[3]]
        : [pts[0], pts[1], relX, relY];
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
    strokeWidth: LINE_STROKE_WIDTH,
    strokeScaleEnabled: false,
    hitStrokeWidth: HIT_STROKE_WIDTH,
    listening: true,
    onMouseEnter: handleLineMouseEnter,
    onMouseLeave: handleLineMouseLeave,
  };

  const knob0X = displayX + points[0];
  const knob0Y = displayY + points[1];
  const knob1X = displayX + points[2];
  const knob1Y = displayY + points[3];

  return (
    <Fragment>
      {/* Line Group - draggable for whole-line move, contains only the line */}
      <Group
        key={`${data.id}-line`}
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
            draggable
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
            draggable
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
