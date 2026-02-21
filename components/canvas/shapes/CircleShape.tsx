"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Ellipse, Group, Rect, Text, Transformer } from "react-konva";
import type Konva from "konva";
import type { ObjectData } from "@/types";
import { useBoardMutations } from "@/hooks/useBoardMutations";
import type { TransformBox } from "@/lib/utils/boundingBox";
import { boundBoxWithAnchorPreservation } from "@/lib/utils/boundingBox";

const MIN_RADIUS = 10;
const DEFAULT_RADIUS = 50;
const TEXT_PADDING = 8;
const DEFAULT_FONT_SIZE = 14;
const DEFAULT_TEXT_COLOR = "black";
const DEFAULT_FONT_FAMILY = "sans-serif";

export function CircleShape({
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
  const { updateObject } = useBoardMutations();
  const groupRef = useRef<Konva.Group | null>(null);
  const trRef = useRef<Konva.Transformer | null>(null);
  const anchorBoxRef = useRef<TransformBox | null>(null);
  const isTransformingRef = useRef(false);
  const [pos, setPos] = useState({ x: data.x, y: data.y });
  const [isDragging, setIsDragging] = useState(false);
  const [localPos, setLocalPos] = useState<{ x: number; y: number } | null>(null);
  const [localSize, setLocalSize] = useState<{ radiusX: number; radiusY: number } | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const editInfoRef = useRef<{
    stage: Konva.Stage;
    pos: { x: number; y: number };
  } | null>(null);

  const radiusX = localSize?.radiusX ?? data.radiusX ?? data.radius ?? DEFAULT_RADIUS;
  const radiusY = localSize?.radiusY ?? data.radiusY ?? data.radius ?? DEFAULT_RADIUS;
  const absRadiusX = Math.max(MIN_RADIUS, Math.abs(radiusX));
  const absRadiusY = Math.max(MIN_RADIUS, Math.abs(radiusY));
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
        queueMicrotask(() => setLocalSize(null));
      }
    }
    prevDataRef.current = {
      radiusX: data.radiusX ?? data.radius ?? DEFAULT_RADIUS,
      radiusY: data.radiusY ?? data.radius ?? DEFAULT_RADIUS,
    };
  }, [data.radiusX, data.radiusY, data.radius, localSize]);

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

    const textX = pos.x - absRadiusX + TEXT_PADDING;
    const textY = pos.y - absRadiusY + TEXT_PADDING;
    const areaW = (absRadiusX * 2 - TEXT_PADDING * 2) * scaleX;
    const areaH = (absRadiusY * 2 - TEXT_PADDING * 2) * scaleY;
    const areaX = stageBox.left + stageX + textX * scaleX;
    const areaY = stageBox.top + stageY + textY * scaleY;
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
    absRadiusX,
    absRadiusY,
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
          const rawRx = absRadiusX * scaleX;
          const rawRy = absRadiusY * scaleY;
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
      >
        <Ellipse
          x={0}
          y={0}
          radiusX={radiusX}
          radiusY={radiusY}
          fill={data.color ?? "#10b981"}
          stroke={
            (data.strokeWidth ?? 0) > 0
              ? (data.strokeColor ?? data.color ?? "#059669")
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
                x={-absRadiusX + TEXT_PADDING}
                y={-absRadiusY + TEXT_PADDING}
                width={absRadiusX * 2 - TEXT_PADDING * 2}
                height={absRadiusY * 2 - TEXT_PADDING * 2}
                fill={data.textHighlightColor}
                listening={false}
              />
            )}
            <Text
              text={data.text ?? ""}
              x={-absRadiusX + TEXT_PADDING}
              y={-absRadiusY + TEXT_PADDING}
              width={absRadiusX * 2 - TEXT_PADDING * 2}
              height={absRadiusY * 2 - TEXT_PADDING * 2}
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
