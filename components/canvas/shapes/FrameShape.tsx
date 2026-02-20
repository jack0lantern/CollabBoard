"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Group, Rect, Text, Transformer } from "react-konva";
import type Konva from "konva";
import type { ObjectData } from "@/types";
import { useBoardMutations } from "@/hooks/useBoardMutations";
import type { TransformBox } from "@/lib/utils/boundingBox";
import { boundBoxWithAnchorPreservation } from "@/lib/utils/boundingBox";

const MIN_SIZE = 80;
const TITLE_BAR_HEIGHT = 32;
const TITLE_PADDING = 8;

/**
 * Miro-style frame: rectangular container with optional title bar.
 * Acts as a visual underlayer for organizing board content.
 */
export function FrameShape({
  data,
  onSelect,
  isSelected,
  isMultiSelect,
  registerShapeRef,
  onShapeDragEnd,
  onContextMenu,
  onDragMoveTick,
  onDragStart,
  onFrameDragWithContents,
  onFrameDragStart,
  onFrameDragEnd,
  readOnly = false,
}: {
  data: ObjectData;
  onSelect: (id: string, addToSelection?: boolean) => void;
  isSelected?: boolean;
  isMultiSelect?: boolean;
  registerShapeRef?: (id: string, node: Konva.Node | null) => void;
  onShapeDragEnd?: () => void;
  onContextMenu?: (id: string, clientX: number, clientY: number) => void;
  onDragMoveTick?: () => void;
  onFrameDragWithContents?: (
    frameId: string,
    prevX: number,
    prevY: number,
    deltaX: number,
    deltaY: number
  ) => void;
  onDragStart?: (objectId: string) => void;
  onFrameDragStart?: (frameId: string, startX: number, startY: number) => void;
  onFrameDragEnd?: (frameId: string, newX: number, newY: number) => void;
  readOnly?: boolean;
}) {
  const { updateObject } = useBoardMutations();
  const groupRef = useRef<Konva.Group | null>(null);
  const trRef = useRef<Konva.Transformer | null>(null);
  const anchorBoxRef = useRef<TransformBox | null>(null);
  const isTransformingRef = useRef(false);
  const [pos, setPos] = useState({ x: data.x, y: data.y });
  const [isDragging, setIsDragging] = useState(false);
  const [localPos, setLocalPos] = useState<{ x: number; y: number } | null>(null);
  const [localSize, setLocalSize] = useState<{ width: number; height: number } | null>(null);
  const width = localSize?.width ?? data.width ?? 600;
  const height = localSize?.height ?? data.height ?? 400;
  const displayX = isDragging ? pos.x : (localPos?.x ?? data.x);
  const displayY = isDragging ? pos.y : (localPos?.y ?? data.y);
  const displayRotation = data.rotation ?? 0;

  const fillColor = data.frameColor ?? data.color ?? "#ffffff";
  const strokeColor = data.strokeColor ?? "#e5e7eb";
  const strokeWidth = data.strokeWidth ?? 1;
  const title = data.title ?? "";

  const prevPosRef = useRef({ x: data.x, y: data.y });
  const dragPrevPosRef = useRef<{ x: number; y: number } | null>(null);
  useEffect(() => {
    if (localPos != null) {
      const prev = prevPosRef.current;
      if (data.x !== prev.x || data.y !== prev.y) {
        queueMicrotask(() => setLocalPos(null));
      }
    }
    prevPosRef.current = { x: data.x, y: data.y };
    if (!isDragging && localPos == null) {
      queueMicrotask(() => setPos({ x: data.x, y: data.y }));
    }
  }, [data.x, data.y, isDragging, localPos]);

  const prevDataRef = useRef({ width: data.width, height: data.height });
  useEffect(() => {
    if (isTransformingRef.current) return;
    if (localSize != null) {
      const prev = prevDataRef.current;
      if (data.width !== prev.width || data.height !== prev.height) {
        queueMicrotask(() => setLocalSize(null));
      }
    }
    prevDataRef.current = { width: data.width, height: data.height };
  }, [data.width, data.height, localSize]);

  useLayoutEffect(() => {
    if (groupRef.current != null) {
      registerShapeRef?.(data.id, groupRef.current);
    }
    return () => registerShapeRef?.(data.id, null);
  }, [data.id, registerShapeRef]);

  useLayoutEffect(() => {
    if (isSelected && !isMultiSelect && groupRef.current != null && trRef.current != null) {
      trRef.current.nodes([groupRef.current]);
      trRef.current.getLayer()?.batchDraw();
    }
  }, [isSelected, isMultiSelect]);

  const w = Math.max(MIN_SIZE, Math.abs(width));
  const h = Math.max(MIN_SIZE, Math.abs(height));

  return (
    <>
      <Group
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
        onDragStart={(e) => {
          const x = e.target.x();
          const y = e.target.y();
          setIsDragging(true);
          dragPrevPosRef.current = { x, y };
          onDragStart?.(data.id);
          onFrameDragStart?.(data.id, x, y);
        }}
        onDragMove={(e) => {
          const newX = e.target.x();
          const newY = e.target.y();
          setPos({ x: newX, y: newY });
          const prev = dragPrevPosRef.current;
          if (prev != null) {
            const deltaX = newX - prev.x;
            const deltaY = newY - prev.y;
            onFrameDragWithContents?.(data.id, prev.x, prev.y, deltaX, deltaY);
            dragPrevPosRef.current = { x: newX, y: newY };
          }
        }}
        onDragEnd={(e) => {
          const newX = e.target.x();
          const newY = e.target.y();
          dragPrevPosRef.current = null;
          if (onFrameDragEnd) {
            onFrameDragEnd(data.id, newX, newY);
          } else {
            updateObject(data.id, { x: newX, y: newY });
          }
          setLocalPos({ x: newX, y: newY });
          setIsDragging(false);
          onShapeDragEnd?.();
        }}
        onTransformEnd={() => {
          anchorBoxRef.current = null;
          isTransformingRef.current = false;
          if (isMultiSelect) return;
          const node = groupRef.current;
          if (!node) return;
          const scaleX = node.scaleX();
          const scaleY = node.scaleY();
          const rawW = w * scaleX;
          const rawH = h * scaleY;
          const newWidth = Math.max(MIN_SIZE, Math.abs(rawW));
          const newHeight = Math.max(MIN_SIZE, Math.abs(rawH));
          setLocalSize({ width: newWidth, height: newHeight });
          node.scaleX(1);
          node.scaleY(1);
          updateObject(data.id, {
            x: node.x(),
            y: node.y(),
            width: newWidth,
            height: newHeight,
            rotation: 0,
          });
          node.rotation(0);
        }}
      >
        <Rect
          x={0}
          y={0}
          width={w}
          height={h}
          fill={fillColor}
          stroke={strokeWidth > 0 ? strokeColor : isSelected ? "#3b82f6" : undefined}
          strokeWidth={strokeWidth > 0 ? strokeWidth : isSelected ? 2 : 0}
          strokeScaleEnabled={false}
        />
        {title && (
          <Rect
            x={0}
            y={0}
            width={w}
            height={TITLE_BAR_HEIGHT}
            fill={fillColor}
            stroke={strokeWidth > 0 ? strokeColor : undefined}
            strokeWidth={0}
          />
        )}
        {title && (
          <Text
            x={TITLE_PADDING}
            y={TITLE_PADDING}
            width={w - TITLE_PADDING * 2}
            height={TITLE_BAR_HEIGHT - TITLE_PADDING * 2}
            text={title}
            fontSize={14}
            fontFamily="sans-serif"
            fill="#374151"
            listening={false}
          />
        )}
      </Group>
      {isSelected && !isMultiSelect && (
        <Transformer
          ref={trRef}
          rotateEnabled={false}
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
            return boundBoxWithAnchorPreservation(
              oldBox,
              newBox,
              MIN_SIZE,
              MIN_SIZE,
              anchorBoxRef.current,
              trRef.current?.getActiveAnchor() ?? undefined
            );
          }}
        />
      )}
    </>
  );
}
