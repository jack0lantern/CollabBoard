"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Group, Rect, Text, Transformer } from "react-konva";
import type Konva from "konva";
import type { ObjectData } from "@/types";
import { useBoardMutations } from "@/hooks/useBoardMutations";

const WIDTH = 200;
const HEIGHT = 150;
const MIN_SIZE = 40;
const TEXT_PADDING = 8;
const FONT_SIZE = 14;
const TEXT_COLOR = "black";
const FONT_FAMILY = "sans-serif";

export function StickyNote({
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
  const groupRef = useRef<Konva.Group | null>(null);
  const trRef = useRef<Konva.Transformer | null>(null);
  const [pos, setPos] = useState({ x: data.x, y: data.y });
  const [isDragging, setIsDragging] = useState(false);
  const [localPos, setLocalPos] = useState<{ x: number; y: number } | null>(null);
  const [localSize, setLocalSize] = useState<{ width: number; height: number } | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const displayX = isDragging ? pos.x : (localPos?.x ?? data.x);
  const displayY = isDragging ? pos.y : (localPos?.y ?? data.y);
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
    if (localSize != null) {
      const prev = prevDataRef.current;
      if (data.width !== prev.width || data.height !== prev.height) {
        setLocalSize(null);
      }
    }
    prevDataRef.current = { width: data.width, height: data.height };
  }, [data.width, data.height, localSize]);

  useEffect(() => {
    if (isSelected && groupRef.current != null && trRef.current != null) {
      trRef.current.nodes([groupRef.current]);
    }
  }, [isSelected]);

  const width = localSize?.width ?? data.width ?? WIDTH;
  const height = localSize?.height ?? data.height ?? HEIGHT;

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

    const areaX = stageBox.left + stageX + (pos.x + TEXT_PADDING) * scaleX;
    const areaY = stageBox.top + stageY + (pos.y + TEXT_PADDING) * scaleY;
    const areaW = (width - TEXT_PADDING * 2) * scaleX;
    const areaH = (height - TEXT_PADDING * 2) * scaleY;

    const textarea = document.createElement("textarea");
    document.body.appendChild(textarea);

    textarea.value = data.text ?? "";
    textarea.style.position = "fixed";
    textarea.style.left = `${areaX}px`;
    textarea.style.top = `${areaY}px`;
    textarea.style.width = `${areaW}px`;
    textarea.style.height = `${areaH}px`;
    textarea.style.fontSize = `${FONT_SIZE}px`;
    textarea.style.fontFamily = FONT_FAMILY;
    textarea.style.color = TEXT_COLOR;
    textarea.style.border = "none";
    textarea.style.padding = "0";
    textarea.style.margin = "0";
    textarea.style.overflow = "hidden";
    textarea.style.background = "transparent";
    textarea.style.outline = "none";
    textarea.style.resize = "none";
    textarea.style.lineHeight = "1.2";
    textarea.style.wordWrap = "break-word";

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
  }, [isEditing, data.id, data.text, updateObject, width, height]);

  return (
    <>
      <Group
        ref={groupRef}
        x={displayX}
        y={displayY}
        draggable={!isEditing}
        onMouseDown={(e) => {
          e.cancelBubble = true;
          onSelect(data.id);
        }}
        onContextMenu={(e) => {
          e.evt.preventDefault();
          onContextMenu?.(data.id, e.evt.clientX, e.evt.clientY);
        }}
        onDblClick={handleDblClick}
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
          const node = groupRef.current;
          if (!node) return;
          const scaleX = node.scaleX();
          const scaleY = node.scaleY();
          const newWidth = Math.max(MIN_SIZE, width * scaleX);
          const newHeight = Math.max(MIN_SIZE, height * scaleY);
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
      >
        <Rect
          width={width}
          height={height}
          fill={data.color ?? "#fef08a"}
          stroke={isEditing || isSelected ? "#2563eb" : undefined}
          strokeWidth={isEditing || isSelected ? 3 : undefined}
          strokeScaleEnabled={false}
        shadowColor="black"
        shadowBlur={4}
        shadowOpacity={0.2}
        cornerRadius={4}
      />
      <Text
        text={data.text ?? ""}
        x={TEXT_PADDING}
        y={TEXT_PADDING}
        width={width - TEXT_PADDING * 2}
        height={height - TEXT_PADDING * 2}
        fontSize={FONT_SIZE}
        fontFamily={FONT_FAMILY}
        fill={TEXT_COLOR}
        listening={false}
      />
    </Group>
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
