"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Rect, Transformer } from "react-konva";
import type Konva from "konva";
import type { ObjectData } from "@/types";
import { useBoardMutations } from "@/hooks/useBoardMutations";

const MIN_SIZE = 20;

export function RectShape({
  data,
  onSelect,
  isSelected,
  isMultiSelect,
  registerShapeRef,
  onShapeDragEnd,
  onContextMenu,
}: {
  data: ObjectData;
  onSelect: (id: string, addToSelection?: boolean) => void;
  isSelected?: boolean;
  isMultiSelect?: boolean;
  registerShapeRef?: (id: string, node: Konva.Node | null) => void;
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
    if (isSelected && shapeRef.current != null) {
      registerShapeRef?.(data.id, shapeRef.current);
    } else {
      registerShapeRef?.(data.id, null);
    }
    return () => registerShapeRef?.(data.id, null);
  }, [isSelected, data.id, registerShapeRef]);

  useLayoutEffect(() => {
    if (isSelected && !isMultiSelect && shapeRef.current != null && trRef.current != null) {
      trRef.current.nodes([shapeRef.current]);
      trRef.current.getLayer()?.batchDraw();
    }
  }, [isSelected, isMultiSelect]);

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
        onTransformEnd={() => {
          if (isMultiSelect) return;
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
      {isSelected && !isMultiSelect && (
        <Transformer
          ref={trRef}
          flipEnabled={false}
          keepRatio={false}
          ignoreStroke
          boundBoxFunc={(oldBox, newBox) => {
            let { x, y, width, height, rotation } = newBox;
            // Prevent flip and enforce minimum: clamp to MIN_SIZE when cursor goes beyond border
            if (width < 0) {
              x = newBox.x + newBox.width;
              width = MIN_SIZE;
            } else if (width < MIN_SIZE) {
              width = MIN_SIZE;
              if (Math.abs(newBox.x - oldBox.x) > 0.5) {
                x = newBox.x + newBox.width - MIN_SIZE;
              }
            }
            if (height < 0) {
              y = newBox.y + newBox.height;
              height = MIN_SIZE;
            } else if (height < MIN_SIZE) {
              height = MIN_SIZE;
              if (Math.abs(newBox.y - oldBox.y) > 0.5) {
                y = newBox.y + newBox.height - MIN_SIZE;
              }
            }
            return { x, y, width, height, rotation };
          }}
        />
      )}
    </>
  );
}
