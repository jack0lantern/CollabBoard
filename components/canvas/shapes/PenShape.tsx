"use client";

import { useRef, useState } from "react";
import { Group, Line } from "react-konva";
import type Konva from "konva";
import type { ObjectData } from "@/types";
import { useBoardMutations } from "@/hooks/useBoardMutations";

const HIT_STROKE_WIDTH = 20;
const DEFAULT_STROKE_WIDTH = 2;
const PEN_TENSION = 0.5; // Smooth bezier curves like Miro

export function PenShape({
  data,
  ephemeralPosition,
  onSelect,
  isSelected: _isSelected,
  isMultiSelect: _isMultiSelect,
  registerShapeRef,
  onShapeDragEnd,
  onContextMenu,
  onDragEndAt,
  onDragMoveAt,
  frameDragOffset,
  readOnly = false,
}: {
  data: ObjectData;
  ephemeralPosition?: { x: number; y: number };
  onSelect: (id: string, addToSelection?: boolean) => void;
  isSelected?: boolean;
  isMultiSelect?: boolean;
  registerShapeRef?: (id: string, node: Konva.Node | null) => void;
  onShapeDragEnd?: () => void;
  onDragEndAt?: (objectId: string, newX: number, newY: number) => void;
  onDragMoveAt?: (objectId: string, newX: number, newY: number) => void;
  onContextMenu?: (id: string, clientX: number, clientY: number) => void;
  frameDragOffset?: { dx: number; dy: number };
  readOnly?: boolean;
}) {
  const { updateObject } = useBoardMutations();
  const groupRef = useRef<Konva.Group | null>(null);
  const [pos, setPos] = useState({ x: data.x, y: data.y });
  const [isDragging, setIsDragging] = useState(false);
  const [localPos, setLocalPos] = useState<{ x: number; y: number } | null>(null);

  const baseX = isDragging ? pos.x : (localPos?.x ?? data.x);
  const baseY = isDragging ? pos.y : (localPos?.y ?? data.y);
  const displayX = (ephemeralPosition?.x ?? baseX) + (frameDragOffset?.dx ?? 0);
  const displayY = (ephemeralPosition?.y ?? baseY) + (frameDragOffset?.dy ?? 0);

  const strokeColor = data.strokeColor ?? data.color ?? "#1a1a2e";
  const strokeWidth = Math.max(
    1,
    (data.strokeWidth ?? 0) > 0 ? (data.strokeWidth ?? DEFAULT_STROKE_WIDTH) : DEFAULT_STROKE_WIDTH
  );
  const points = data.points ?? [];

  return (
    <Group
      ref={(node) => {
        groupRef.current = node;
        registerShapeRef?.(data.id, node);
      }}
      x={displayX}
      y={displayY}
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
        setIsDragging(true);
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
        setLocalPos({ x: newX, y: newY });
        setIsDragging(false);
        updateObject(data.id, { x: newX, y: newY });
        onDragEndAt?.(data.id, newX, newY);
        onShapeDragEnd?.();
      }}
    >
      <Line
        points={points}
        tension={PEN_TENSION}
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        strokeScaleEnabled={false}
        lineCap="round"
        lineJoin="round"
        hitStrokeWidth={HIT_STROKE_WIDTH}
        listening={true}
        perfectDrawEnabled={false}
      />
    </Group>
  );
}
