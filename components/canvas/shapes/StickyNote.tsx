"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Group, Rect, Text, Transformer } from "react-konva";
import type Konva from "konva";
import type { ObjectData } from "@/types";
import { useBoardMutations } from "@/hooks/useBoardMutations";
import type { TransformBox } from "@/lib/utils/boundingBox";
import { boundBoxWithAnchorPreservation } from "@/lib/utils/boundingBox";

const WIDTH = 200;
const HEIGHT = 150;
const MIN_SIZE = 40;
const TEXT_PADDING = 8;
const DEFAULT_FONT_SIZE = 14;
const DEFAULT_TEXT_COLOR = "black";
const DEFAULT_FONT_FAMILY = "sans-serif";

export function StickyNote({
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
  const groupRef = useRef<Konva.Group | null>(null);
  const trRef = useRef<Konva.Transformer | null>(null);
  const anchorBoxRef = useRef<TransformBox | null>(null);
  const isTransformingRef = useRef(false);
  const [pos, setPos] = useState({ x: data.x, y: data.y });
  const [isDragging, setIsDragging] = useState(false);
  const [localPos, setLocalPos] = useState<{ x: number; y: number } | null>(null);
  const [localSize, setLocalSize] = useState<{ width: number; height: number } | null>(null);
  const [localRotation, setLocalRotation] = useState<number | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const displayX = isDragging ? pos.x : (localPos?.x ?? data.x);
  const displayY = isDragging ? pos.y : (localPos?.y ?? data.y);
  const displayRotation = localRotation ?? data.rotation ?? 0;
  const editInfoRef = useRef<{
    stage: Konva.Stage;
    pos: { x: number; y: number };
  } | null>(null);

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

  const prevRotationRef = useRef(data.rotation);
  useEffect(() => {
    if (isTransformingRef.current) return;
    if (localRotation != null) {
      const prev = prevRotationRef.current;
      if (data.rotation !== prev) {
        setLocalRotation(null);
      }
    }
    prevRotationRef.current = data.rotation ?? 0;
  }, [data.rotation, localRotation]);

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

  const width = localSize?.width ?? data.width ?? WIDTH;
  const height = localSize?.height ?? data.height ?? HEIGHT;
  const absWidth = Math.abs(width);
  const absHeight = Math.abs(height);
  const flipX = width < 0;
  const flipY = height < 0;

  const handleDblClick = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      e.cancelBubble = true;
      const stage = e.target.getStage();
      if (!stage) return;
      editInfoRef.current = { stage, pos: { x: displayX, y: displayY } };
      setIsEditing(true);
    },
    [displayX, displayY]
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
    const areaW = (Math.abs(width) - TEXT_PADDING * 2) * scaleX;
    const areaH = (Math.abs(height) - TEXT_PADDING * 2) * scaleY;

    const textarea = document.createElement("textarea");
    document.body.appendChild(textarea);

    textarea.value = data.text ?? "";
    textarea.style.position = "fixed";
    textarea.style.left = `${String(areaX)}px`;
    textarea.style.top = `${String(areaY)}px`;
    textarea.style.width = `${String(areaW)}px`;
    textarea.style.height = `${String(areaH)}px`;
    textarea.style.fontSize = `${String(data.fontSize ?? DEFAULT_FONT_SIZE)}px`;
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
  ]);

  return (
    <>
      <Group
        ref={groupRef}
        x={displayX}
        y={displayY}
        rotation={displayRotation}
        draggable={!isEditing}
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
          const node = groupRef.current;
          if (!node) return;
          const scaleX = node.scaleX();
          const scaleY = node.scaleY();
          const newRotation = node.rotation();
          const rawW = width * scaleX;
          const rawH = height * scaleY;
          const newWidth = Math.max(MIN_SIZE, Math.abs(rawW));
          const newHeight = Math.max(MIN_SIZE, Math.abs(rawH));
          setLocalSize({ width: newWidth, height: newHeight });
          setLocalRotation(newRotation);
          node.scaleX(1);
          node.scaleY(1);
          updateObject(data.id, {
            x: node.x(),
            y: node.y(),
            width: newWidth,
            height: newHeight,
            rotation: newRotation,
          });
        }}
      >
        <Rect
          width={absWidth}
          height={absHeight}
          fill={data.color ?? "#fef08a"}
          stroke={
            (data.strokeWidth ?? 0) > 0
              ? (data.strokeColor ?? data.color ?? "#eab308")
              : isEditing || isSelected
                ? "#2563eb"
                : undefined
          }
          strokeWidth={
            (data.strokeWidth ?? 0) > 0
              ? (data.strokeWidth ?? 1)
              : isEditing || isSelected
                ? 3
                : undefined
          }
          strokeScaleEnabled={false}
        shadowColor="black"
        shadowBlur={4}
        shadowOpacity={0.2}
        cornerRadius={4}
      />
      {!isEditing && (
        <>
          {data.textHighlightColor != null &&
            data.textHighlightColor !== "" && (
              <Rect
                x={flipX ? width + TEXT_PADDING : TEXT_PADDING}
                y={flipY ? height + TEXT_PADDING : TEXT_PADDING}
                width={absWidth - TEXT_PADDING * 2}
                height={absHeight - TEXT_PADDING * 2}
                fill={data.textHighlightColor}
                listening={false}
              />
            )}
          <Text
            text={data.text ?? ""}
            x={flipX ? width + TEXT_PADDING : TEXT_PADDING}
            y={flipY ? height + TEXT_PADDING : TEXT_PADDING}
            width={absWidth - TEXT_PADDING * 2}
            height={absHeight - TEXT_PADDING * 2}
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
