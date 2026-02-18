"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Rect, Transformer } from "react-konva";
import type Konva from "konva";
import type { ObjectData } from "@/types";
import { useBoardMutations } from "@/hooks/useBoardMutations";
import type { TransformBox } from "@/lib/utils/boundingBox";
import { boundBoxWithAnchorPreservation } from "@/lib/utils/boundingBox";

const MIN_SIZE = 20;

/**
 * Single-select transform: use data as source of truth. No localSize during
 * transform—Konva applies scaleX/scaleY to the node. On transform end, bake
 * scale into width/height and persist. isTransforming ref prevents external
 * data sync from causing flicker during the transform.
 */
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
  const anchorBoxRef = useRef<TransformBox | null>(null);
  const isTransformingRef = useRef(false);
  const [pos, setPos] = useState({ x: data.x, y: data.y });
  const [isDragging, setIsDragging] = useState(false);
  const [localPos, setLocalPos] = useState<{ x: number; y: number } | null>(null);
  const [localSize, setLocalSize] = useState<{ width: number; height: number } | null>(null);
  const width = localSize?.width ?? data.width ?? 100;
  const height = localSize?.height ?? data.height ?? 80;
  const displayX = isDragging ? pos.x : (localPos?.x ?? data.x);
  const displayY = isDragging ? pos.y : (localPos?.y ?? data.y);
  const displayRotation = data.rotation ?? 0;

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
    if (isTransformingRef.current) return;
    if (localSize != null) {
      const prev = prevDataRef.current;
      if (data.width !== prev.width || data.height !== prev.height) {
        setLocalSize(null);
      }
    }
    prevDataRef.current = { width: data.width, height: data.height };
  }, [data.width, data.height, localSize]);

  useLayoutEffect(() => {
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
        rotation={displayRotation}
        width={Math.max(MIN_SIZE, Math.abs(width))}
        height={Math.max(MIN_SIZE, Math.abs(height))}
        fill={data.color ?? "#3b82f6"}
        stroke={
          (data.strokeWidth ?? 0) > 0
            ? (data.strokeColor ?? data.color ?? "#2563eb")
            : isSelected
              ? "#2563eb"
              : undefined
        }
        strokeWidth={
          (data.strokeWidth ?? 0) > 0
            ? (data.strokeWidth ?? 1)
            : isSelected
              ? 2
              : undefined
        }
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
          anchorBoxRef.current = null;
          isTransformingRef.current = false;
          if (isMultiSelect) return;
          const node = shapeRef.current;
          if (!node) return;
          const scaleX = node.scaleX();
          const scaleY = node.scaleY();
          const rawW = node.width() * scaleX;
          const rawH = node.height() * scaleY;
          const newWidth = Math.max(MIN_SIZE, Math.abs(rawW));
          const newHeight = Math.max(MIN_SIZE, Math.abs(rawH));
          setLocalSize({ width: newWidth, height: newHeight });
          node.scaleX(1);
          node.scaleY(1);
          const newRotation = node.rotation();
          updateObject(data.id, {
            x: node.x(),
            y: node.y(),
            width: newWidth,
            height: newHeight,
            rotation: newRotation,
          });
          node.rotation(0);
        }}
      />
      {isSelected && !isMultiSelect && (
        <Transformer
          ref={trRef}
          flipEnabled
          keepRatio={false}
          ignoreStroke
          onTransformStart={() => {
            isTransformingRef.current = true;
            const node = shapeRef.current;
            if (node) {
              const rect = node.getClientRect({
                relativeTo: node.getLayer() ?? undefined,
              });
              anchorBoxRef.current = {
                x: rect.x,
                y: rect.y,
                width: rect.width,
                height: rect.height,
                rotation: node.rotation(),
              };
            }
          }}
          boundBoxFunc={(oldBox, newBox) =>
            boundBoxWithAnchorPreservation(
              oldBox,
              newBox,
              MIN_SIZE,
              MIN_SIZE,
              anchorBoxRef.current
            )
          }
        />
      )}
    </>
  );
}
