"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Ellipse, Transformer } from "react-konva";
import type Konva from "konva";
import type { ObjectData } from "@/types";
import { useBoardMutations } from "@/hooks/useBoardMutations";
import type { TransformBox } from "@/lib/utils/boundingBox";
import { boundBoxWithAnchorPreservation } from "@/lib/utils/boundingBox";

const MIN_RADIUS = 10;
const DEFAULT_RADIUS = 50;

export function CircleShape({
  data,
  onSelect,
  isSelected,
  isMultiSelect,
  registerShapeRef,
  onShapeDragEnd,
  onContextMenu,
  onDragMoveTick,
  onDragEndAt,
  onDragMoveAt,
}: {
  data: ObjectData;
  onSelect: (id: string, addToSelection?: boolean) => void;
  isSelected?: boolean;
  isMultiSelect?: boolean;
  registerShapeRef?: (id: string, node: Konva.Node | null) => void;
  onShapeDragEnd?: () => void;
  onDragEndAt?: (objectId: string, newX: number, newY: number) => void;
  onDragMoveAt?: (objectId: string, newX: number, newY: number) => void;
  onContextMenu?: (id: string, clientX: number, clientY: number) => void;
  onDragMoveTick?: () => void;
}) {
  const { updateObject } = useBoardMutations();
  const shapeRef = useRef<Konva.Ellipse | null>(null);
  const trRef = useRef<Konva.Transformer | null>(null);
  const anchorBoxRef = useRef<TransformBox | null>(null);
  const isTransformingRef = useRef(false);
  const [pos, setPos] = useState({ x: data.x, y: data.y });
  const [isDragging, setIsDragging] = useState(false);
  const [localPos, setLocalPos] = useState<{ x: number; y: number } | null>(null);
  const [localSize, setLocalSize] = useState<{ radiusX: number; radiusY: number } | null>(null);
  const radiusX = localSize?.radiusX ?? data.radiusX ?? data.radius ?? DEFAULT_RADIUS;
  const radiusY = localSize?.radiusY ?? data.radiusY ?? data.radius ?? DEFAULT_RADIUS;
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

  const prevDataRef = useRef({
    radiusX: data.radiusX ?? data.radius ?? DEFAULT_RADIUS,
    radiusY: data.radiusY ?? data.radius ?? DEFAULT_RADIUS,
  });
  useEffect(() => {
    if (isTransformingRef.current) return;
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

  useLayoutEffect(() => {
    if (shapeRef.current != null) {
      registerShapeRef?.(data.id, shapeRef.current);
    }
    return () => registerShapeRef?.(data.id, null);
  }, [data.id, registerShapeRef]);

  useLayoutEffect(() => {
    if (isSelected && !isMultiSelect && shapeRef.current != null && trRef.current != null) {
      trRef.current.nodes([shapeRef.current]);
      trRef.current.getLayer()?.batchDraw();
    }
  }, [isSelected, isMultiSelect]);

  return (
    <>
      <Ellipse
        ref={shapeRef}
        x={displayX}
        y={displayY}
        rotation={displayRotation}
        radiusX={radiusX}
        radiusY={radiusY}
        fill={data.color ?? "#10b981"}
        stroke={
          (data.strokeWidth ?? 0) > 0
            ? (data.strokeColor ?? data.color ?? "#059669")
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
        onDragMove={(e) => {
          const x = e.target.x();
          const y = e.target.y();
          setPos({ x, y });
          onDragMoveAt?.(data.id, x, y);
          onDragMoveTick?.();
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
        onTransformEnd={() => {
          anchorBoxRef.current = null;
          isTransformingRef.current = false;
          if (isMultiSelect) return;
          const node = shapeRef.current;
          if (!node) return;
          const scaleX = node.scaleX();
          const scaleY = node.scaleY();
          const rawRx = node.radiusX() * scaleX;
          const rawRy = node.radiusY() * scaleY;
          const newRadiusX =
            rawRx >= 0 ? Math.max(MIN_RADIUS, rawRx) : -Math.max(MIN_RADIUS, Math.abs(rawRx));
          const newRadiusY =
            rawRy >= 0 ? Math.max(MIN_RADIUS, rawRy) : -Math.max(MIN_RADIUS, Math.abs(rawRy));
          setLocalSize({ radiusX: newRadiusX, radiusY: newRadiusY });
          node.scaleX(1);
          node.scaleY(1);
          const newRotation = node.rotation();
          updateObject(data.id, {
            x: node.x(),
            y: node.y(),
            radiusX: newRadiusX,
            radiusY: newRadiusY,
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
            anchorBoxRef.current = null;
          }}
          onTransform={onDragMoveTick}
          boundBoxFunc={(oldBox, newBox) => {
            if (anchorBoxRef.current == null) {
              anchorBoxRef.current = { ...oldBox };
            }
            const minDim = MIN_RADIUS * 2;
            return boundBoxWithAnchorPreservation(
              oldBox,
              newBox,
              minDim,
              minDim,
              anchorBoxRef.current,
              trRef.current?.getActiveAnchor() ?? undefined
            );
          }}
        />
      )}
    </>
  );
}
