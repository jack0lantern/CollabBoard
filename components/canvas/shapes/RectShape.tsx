"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Group, Rect, Text, Transformer } from "react-konva";
import type Konva from "konva";
import type { ObjectData } from "@/types";
import { useBoardMutations } from "@/hooks/useBoardMutations";
import type { TransformBox } from "@/lib/utils/boundingBox";
import { boundBoxWithAnchorPreservation } from "@/lib/utils/boundingBox";

const MIN_SIZE = 20;
const TEXT_PADDING = 8;
const DEFAULT_FONT_SIZE = 14;
const DEFAULT_TEXT_COLOR = "black";
const DEFAULT_FONT_FAMILY = "sans-serif";

/**
 * Single-select transform: use data as source of truth. No localSize during
 * transform—Konva applies scaleX/scaleY to the node. On transform end, bake
 * scale into width/height and persist. isTransforming ref prevents external
 * data sync from causing flicker during the transform.
 */
function useRerenderWatch(
  props: {
    data: ObjectData;
    ephemeralPosition?: { x: number; y: number };
    isSelected?: boolean;
    isMultiSelect?: boolean;
    frameDragOffset?: { dx: number; dy: number };
    readOnly?: boolean;
    onSelect?: (id: string, addToSelection?: boolean) => void;
    registerShapeRef?: (id: string, node: Konva.Node | null) => void;
    onShapeDragEnd?: () => void;
    onContextMenu?: (id: string, clientX: number, clientY: number) => void;
    onDragMoveTick?: () => void;
    onDragStart?: (objectId: string) => void;
    onDragEndAt?: (objectId: string, newX: number, newY: number) => void;
    onDragMoveAt?: (objectId: string, newX: number, newY: number) => void;
  }
) {
  const prevRef = useRef<unknown>(null);
  if (prevRef.current !== null) {
    const prev = prevRef.current as typeof props;
    const changed: string[] = [];
    if (prev.data !== props.data) {
      const dPrev = prev.data;
      const dCur = props.data;
      if (dPrev.id !== dCur.id) changed.push("data.id");
      if (dPrev.x !== dCur.x) changed.push("data.x");
      if (dPrev.y !== dCur.y) changed.push("data.y");
      if (dPrev.width !== dCur.width) changed.push("data.width");
      if (dPrev.height !== dCur.height) changed.push("data.height");
      if (dPrev.rotation !== dCur.rotation) changed.push("data.rotation");
      if (dPrev.color !== dCur.color) changed.push("data.color");
      if (dPrev.text !== dCur.text) changed.push("data.text");
      if (dPrev.zIndex !== dCur.zIndex) changed.push("data.zIndex");
      if (dPrev.strokeColor !== dCur.strokeColor) changed.push("data.strokeColor");
      if (dPrev.strokeWidth !== dCur.strokeWidth) changed.push("data.strokeWidth");
      if (changed.length === 0) changed.push("data (reference changed)");
    }
    if (
      prev.ephemeralPosition?.x !== props.ephemeralPosition?.x ||
      prev.ephemeralPosition?.y !== props.ephemeralPosition?.y
    ) {
      changed.push("ephemeralPosition");
    }
    if (prev.isSelected !== props.isSelected) changed.push("isSelected");
    if (prev.isMultiSelect !== props.isMultiSelect) changed.push("isMultiSelect");
    if (prev.readOnly !== props.readOnly) changed.push("readOnly");
    if (
      prev.frameDragOffset?.dx !== props.frameDragOffset?.dx ||
      prev.frameDragOffset?.dy !== props.frameDragOffset?.dy
    ) {
      changed.push("frameDragOffset");
    }
    if (prev.onSelect !== props.onSelect) changed.push("onSelect");
    if (prev.registerShapeRef !== props.registerShapeRef) changed.push("registerShapeRef");
    if (prev.onShapeDragEnd !== props.onShapeDragEnd) changed.push("onShapeDragEnd");
    if (prev.onContextMenu !== props.onContextMenu) changed.push("onContextMenu");
    if (prev.onDragMoveTick !== props.onDragMoveTick) changed.push("onDragMoveTick");
    if (prev.onDragStart !== props.onDragStart) changed.push("onDragStart");
    if (prev.onDragEndAt !== props.onDragEndAt) changed.push("onDragEndAt");
    if (prev.onDragMoveAt !== props.onDragMoveAt) changed.push("onDragMoveAt");
  }
  prevRef.current = props;
}

export function RectShape({
  data,
  ephemeralPosition,
  onSelect,
  isSelected,
  isMultiSelect,
  registerShapeRef,
  onShapeDragEnd,
  onContextMenu,
  onDragMoveTick,
  onDragStart,
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
  onDragMoveTick?: () => void;
  onDragStart?: (objectId: string) => void;
  frameDragOffset?: { dx: number; dy: number };
  readOnly?: boolean;
}) {
  useRerenderWatch({
    data,
    ephemeralPosition,
    isSelected,
    isMultiSelect,
    frameDragOffset,
    readOnly,
    onSelect,
    registerShapeRef,
    onShapeDragEnd,
    onContextMenu,
    onDragMoveTick,
    onDragStart,
    onDragEndAt,
    onDragMoveAt,
  });
  const { updateObject } = useBoardMutations();
  const groupRef = useRef<Konva.Group | null>(null);
  const trRef = useRef<Konva.Transformer | null>(null);
  const anchorBoxRef = useRef<TransformBox | null>(null);
  const isTransformingRef = useRef(false);
  const [pos, setPos] = useState({ x: data.x, y: data.y });
  const [isDragging, setIsDragging] = useState(false);
  const [localPos, setLocalPos] = useState<{ x: number; y: number } | null>(null);
  const [localSize, setLocalSize] = useState<{ width: number; height: number } | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const editInfoRef = useRef<{
    stage: Konva.Stage;
    pos: { x: number; y: number };
  } | null>(null);

  const width = localSize?.width ?? data.width ?? 100;
  const height = localSize?.height ?? data.height ?? 80;
  const absWidth = Math.max(MIN_SIZE, Math.abs(width));
  const absHeight = Math.max(MIN_SIZE, Math.abs(height));
  const baseX = isDragging ? pos.x : (localPos?.x ?? data.x);
  const baseY = isDragging ? pos.y : (localPos?.y ?? data.y);
  const displayX = (ephemeralPosition?.x ?? baseX) + (frameDragOffset?.dx ?? 0);
  const displayY = (ephemeralPosition?.y ?? baseY) + (frameDragOffset?.dy ?? 0);
  const displayRotation = data.rotation ?? 0;

  const prevPosRef = useRef({ x: data.x, y: data.y });
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

  const handleDblClick = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      if (readOnly) return;
      e.cancelBubble = true;
      const stage = e.target.getStage();
      if (!stage) return;
      editInfoRef.current = { stage, pos: { x: displayX, y: displayY } };
      setIsEditing(true);
    },
    [displayX, displayY, readOnly]
  );

  useEffect(() => {
    if (!isEditing || !editInfoRef.current) return;

    const { stage, pos } = editInfoRef.current;
    const stageBox = stage.container().getBoundingClientRect();
    const scaleX = stage.scaleX();
    const scaleY = stage.scaleY();
    const stageX = stage.x();
    const stageY = stage.y();

    const textX = width >= 0 ? pos.x + TEXT_PADDING : pos.x + width + TEXT_PADDING;
    const textY = height >= 0 ? pos.y + TEXT_PADDING : pos.y + height + TEXT_PADDING;
    const areaX = stageBox.left + stageX + textX * scaleX;
    const areaY = stageBox.top + stageY + textY * scaleY;
    const areaW = (absWidth - TEXT_PADDING * 2) * scaleX;
    const areaH = (absHeight - TEXT_PADDING * 2) * scaleY;
    const scaledFontSize = (data.fontSize ?? DEFAULT_FONT_SIZE) * scaleX;

    const textarea = document.createElement("textarea");
    document.body.appendChild(textarea);

    textarea.value = data.text ?? "";
    textarea.style.position = "fixed";
    textarea.style.left = `${String(areaX)}px`;
    textarea.style.top = `${String(areaY)}px`;
    textarea.style.width = `${String(areaW)}px`;
    textarea.style.height = `${String(areaH)}px`;
    textarea.style.fontSize = `${String(scaledFontSize)}px`;
    textarea.style.fontFamily = data.fontFamily ?? DEFAULT_FONT_FAMILY;
    textarea.style.fontWeight = data.fontWeight ?? "normal";
    textarea.style.fontStyle = data.fontStyle ?? "normal";
    textarea.style.textDecoration = data.textDecoration ?? "none";
    textarea.style.color = data.textColor ?? DEFAULT_TEXT_COLOR;
    textarea.style.border = "none";
    textarea.style.padding = "0";
    textarea.style.margin = "0";
    textarea.style.overflow = "hidden";
    textarea.style.background = "transparent";
    textarea.style.outline = "none";
    textarea.style.resize = "none";
    textarea.style.lineHeight = "1.2";
    textarea.style.overflowWrap = "break-word";
    textarea.style.textAlign = "center";

    textarea.focus();

    const saveAndClose = () => {
      const value = textarea.value;
      textarea.parentNode?.removeChild(textarea);
      window.removeEventListener("click", handleOutsideClick);
      window.removeEventListener("touchstart", handleOutsideClick);
      updateObject(data.id, { text: value });
      setIsEditing(false);
      editInfoRef.current = null;
    };

    const handleOutsideClick = (evt: MouseEvent | TouchEvent) => {
      if (evt.target !== textarea) {
        saveAndClose();
      }
    };

    textarea.addEventListener("keydown", (evt) => {
      if (evt.key === "Enter" && !evt.shiftKey) {
        evt.preventDefault();
        saveAndClose();
      }
      if (evt.key === "Escape") {
        evt.preventDefault();
        textarea.value = data.text ?? "";
        saveAndClose();
      }
    });

    setTimeout(() => {
      window.addEventListener("click", handleOutsideClick);
      window.addEventListener("touchstart", handleOutsideClick);
    }, 0);

    return () => {
      if (textarea.parentNode) {
        textarea.parentNode.removeChild(textarea);
      }
      window.removeEventListener("click", handleOutsideClick);
      window.removeEventListener("touchstart", handleOutsideClick);
    };
  }, [
    isEditing,
    data.id,
    data.text,
    data.fontFamily,
    data.fontSize,
    data.fontStyle,
    data.fontWeight,
    data.textColor,
    data.textDecoration,
    updateObject,
    width,
    height,
    absWidth,
    absHeight,
  ]);

  return (
    <>
      <Group
        ref={groupRef}
        x={displayX}
        y={displayY}
        rotation={displayRotation}
        draggable={!readOnly && !isEditing}
        onMouseDown={(e) => {
          if (e.evt.button !== 0) return;
          e.cancelBubble = true;
          onSelect(data.id, e.evt.shiftKey);
        }}
        onContextMenu={(e) => {
          e.evt.preventDefault();
          onContextMenu?.(data.id, e.evt.clientX, e.evt.clientY);
        }}
        onDblClick={handleDblClick}
        onDragStart={() => {
          setIsDragging(true);
          onDragStart?.(data.id);
        }}
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
          const node = groupRef.current;
          if (!node) return;
          const scaleX = node.scaleX();
          const scaleY = node.scaleY();
          const rawW = absWidth * scaleX;
          const rawH = absHeight * scaleY;
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
      >
        <Rect
          width={absWidth}
          height={absHeight}
          fill={data.color ?? "#3b82f6"}
          stroke={
            (data.strokeWidth ?? 0) > 0
              ? (data.strokeColor ?? data.color ?? "#2563eb")
              : isEditing || isSelected
                ? "#2563eb"
                : undefined
          }
          strokeWidth={
            (data.strokeWidth ?? 0) > 0
              ? (data.strokeWidth ?? 1)
              : isEditing || isSelected
                ? 2
                : undefined
          }
          strokeScaleEnabled={false}
        />
        {!isEditing && (
          <>
            {data.textHighlightColor != null && data.textHighlightColor !== "" && (
              <Rect
                x={width < 0 ? width + TEXT_PADDING : TEXT_PADDING}
                y={height < 0 ? height + TEXT_PADDING : TEXT_PADDING}
                width={absWidth - TEXT_PADDING * 2}
                height={absHeight - TEXT_PADDING * 2}
                fill={data.textHighlightColor}
                listening={false}
              />
            )}
            <Text
              text={data.text ?? ""}
              x={width < 0 ? width + TEXT_PADDING : TEXT_PADDING}
              y={height < 0 ? height + TEXT_PADDING : TEXT_PADDING}
              width={absWidth - TEXT_PADDING * 2}
              height={absHeight - TEXT_PADDING * 2}
              align="center"
              verticalAlign="middle"
              fontSize={data.fontSize ?? DEFAULT_FONT_SIZE}
              fontFamily={data.fontFamily ?? DEFAULT_FONT_FAMILY}
              fontStyle={
                [data.fontWeight === "bold" && "bold", data.fontStyle === "italic" && "italic"]
                  .filter(Boolean)
                  .join(" ") || "normal"
              }
              textDecoration={data.textDecoration ?? "none"}
              fill={data.textColor ?? DEFAULT_TEXT_COLOR}
              listening={false}
            />
          </>
        )}
      </Group>
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
