"use client";

import { useEffect, useRef, useState } from "react";
import { Ellipse, Transformer } from "react-konva";
import type Konva from "konva";
import type { ObjectData } from "@/types";
import { useBoardMutations } from "@/hooks/useBoardMutations";

const MIN_RADIUS = 10;
const DEFAULT_RADIUS = 50;

export function CircleShape({
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
  const shapeRef = useRef<Konva.Ellipse | null>(null);
  const trRef = useRef<Konva.Transformer | null>(null);
  const [pos, setPos] = useState({ x: data.x, y: data.y });
  const [isDragging, setIsDragging] = useState(false);
  const [localPos, setLocalPos] = useState<{ x: number; y: number } | null>(null);
  const [localSize, setLocalSize] = useState<{ radiusX: number; radiusY: number } | null>(null);
  const radiusX = localSize?.radiusX ?? data.radiusX ?? data.radius ?? DEFAULT_RADIUS;
  const radiusY = localSize?.radiusY ?? data.radiusY ?? data.radius ?? DEFAULT_RADIUS;
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

  const prevDataRef = useRef({
    radiusX: data.radiusX ?? data.radius ?? DEFAULT_RADIUS,
    radiusY: data.radiusY ?? data.radius ?? DEFAULT_RADIUS,
  });
  useEffect(() => {
    if (localSize != null) {
      const prev = prevDataRef.current;
      const currX = data.radiusX ?? data.radius ?? DEFAULT_RADIUS;
      const currY = data.radiusY ?? data.radius ?? DEFAULT_RADIUS;
      if (currX !== prev.radiusX || currY !== prev.radiusY) {
        setLocalSize(null);
      }
    }
    prevDataRef.current = {
      radiusX: data.radiusX ?? data.radius ?? DEFAULT_RADIUS,
      radiusY: data.radiusY ?? data.radius ?? DEFAULT_RADIUS,
    };
  }, [data.radiusX, data.radiusY, data.radius, localSize]);

  useEffect(() => {
    if (isSelected && shapeRef.current != null && trRef.current != null) {
      trRef.current.nodes([shapeRef.current]);
    }
  }, [isSelected]);

  return (
    <>
      <Ellipse
        ref={shapeRef}
        x={displayX}
        y={displayY}
        radiusX={radiusX}
        radiusY={radiusY}
        fill={data.color ?? "#10b981"}
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
          const newRadiusX = Math.max(MIN_RADIUS, node.radiusX() * scaleX);
          const newRadiusY = Math.max(MIN_RADIUS, node.radiusY() * scaleY);
          setLocalSize({ radiusX: newRadiusX, radiusY: newRadiusY });
          node.scaleX(1);
          node.scaleY(1);
          updateObject(data.id, {
            x: node.x(),
            y: node.y(),
            radiusX: newRadiusX,
            radiusY: newRadiusY,
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
            const minDim = MIN_RADIUS * 2;
            if (
              Math.abs(newBox.width) < minDim ||
              Math.abs(newBox.height) < minDim
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
