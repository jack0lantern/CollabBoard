"use client";

import { useEffect, useRef, useState } from "react";
import { Rect, Transformer } from "react-konva";
import type Konva from "konva";
import type { ObjectData } from "@/types";
import { useBoardMutations } from "@/hooks/useBoardMutations";

const MIN_SIZE = 20;

export function RectShape({
  data,
  onSelect,
  isSelected,
  onShapeDragEnd,
  onContextMenu,
}: {
  data: ObjectData;
  onSelect: (id: string) => void;
  isSelected?: boolean;
  onShapeDragEnd?: () => void;
  onContextMenu?: (id: string, clientX: number, clientY: number) => void;
}) {
  const { updateObject } = useBoardMutations();
  const shapeRef = useRef<Konva.Rect | null>(null);
  const trRef = useRef<Konva.Transformer | null>(null);
  const [pos, setPos] = useState({ x: data.x, y: data.y });
  const [isDragging, setIsDragging] = useState(false);
  const [localPos, setLocalPos] = useState<{ x: number; y: number } | null>(null);
  const [localSize, setLocalSize] = useState<{ width: number; height: number } | null>(null);
  const width = localSize?.width ?? data.width ?? 100;
  const height = localSize?.height ?? data.height ?? 80;
  const displayX = isDragging ? pos.x : (localPos?.x ?? data.x);
  const displayY = isDragging ? pos.y : (localPos?.y ?? data.y);

  const prevPosRef = useRef({ x: data.x, y: data.y });
  useEffect(() => {
    if (localPos != null) {
      const prev = prevPosRef.current;
      if (data.x !== prev.x || data.y !== prev.y) {
        setLocalPos(null);
      }
    }
    prevPosRef.current = { x: data.x, y: data.y };
    if (!isDragging && localPos == null) {
      setPos({ x: data.x, y: data.y });
    }
  }, [data.x, data.y, isDragging, localPos]);

  const prevDataRef = useRef({ width: data.width, height: data.height });
  useEffect(() => {
    if (localSize != null) {
      const prev = prevDataRef.current;
      if (data.width !== prev.width || data.height !== prev.height) {
        setLocalSize(null);
      }
    }
    prevDataRef.current = { width: data.width, height: data.height };
  }, [data.width, data.height, localSize]);

  useEffect(() => {
    if (isSelected && shapeRef.current != null && trRef.current != null) {
      trRef.current.nodes([shapeRef.current]);
    }
  }, [isSelected]);

  return (
    <>
      <Rect
        ref={shapeRef}
        x={displayX}
        y={displayY}
        width={width}
        height={height}
        fill={data.color ?? "#3b82f6"}
        stroke={isSelected ? "#2563eb" : undefined}
        strokeWidth={isSelected ? 2 : undefined}
        strokeScaleEnabled={false}
        draggable
        onMouseDown={(e) => {
          e.cancelBubble = true;
          onSelect(data.id);
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
        onTransformEnd={() => {
          const node = shapeRef.current;
          if (!node) return;
          const scaleX = node.scaleX();
          const scaleY = node.scaleY();
          const newWidth = Math.max(MIN_SIZE, node.width() * scaleX);
          const newHeight = Math.max(MIN_SIZE, node.height() * scaleY);
          setLocalSize({ width: newWidth, height: newHeight });
          node.scaleX(1);
          node.scaleY(1);
          updateObject(data.id, {
            x: node.x(),
            y: node.y(),
            width: newWidth,
            height: newHeight,
          });
        }}
      />
      {isSelected && (
        <Transformer
          ref={trRef}
          flipEnabled={false}
          keepRatio={false}
          ignoreStroke
          boundBoxFunc={(oldBox, newBox) => {
            if (
              Math.abs(newBox.width) < MIN_SIZE ||
              Math.abs(newBox.height) < MIN_SIZE
            ) {
              return oldBox;
            }
            return newBox;
          }}
        />
      )}
    </>
  );
}
