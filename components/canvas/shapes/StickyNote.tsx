"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Group, Rect, Text } from "react-konva";
import type Konva from "konva";
import type { ObjectData } from "@/types";
import { useBoardMutations } from "@/hooks/useBoardMutations";

const WIDTH = 200;
const HEIGHT = 150;
const TEXT_PADDING = 8;
const FONT_SIZE = 14;
const TEXT_COLOR = "black";
const FONT_FAMILY = "sans-serif";

export function StickyNote({
  data,
  onSelect,
}: {
  data: ObjectData;
  onSelect: (id: string) => void;
}) {
  const { updateObject } = useBoardMutations();
  const [pos, setPos] = useState({ x: data.x, y: data.y });
  const [isDragging, setIsDragging] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const editInfoRef = useRef<{
    stage: Konva.Stage;
    pos: { x: number; y: number };
  } | null>(null);

  useEffect(() => {
    if (!isDragging) {
      setPos({ x: data.x, y: data.y });
    }
  }, [data.x, data.y, isDragging]);

  const handleDblClick = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      e.cancelBubble = true;
      const stage = e.target.getStage();
      if (!stage) return;
      editInfoRef.current = { stage, pos };
      setIsEditing(true);
    },
    [pos]
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
    const areaW = (WIDTH - TEXT_PADDING * 2) * scaleX;
    const areaH = (HEIGHT - TEXT_PADDING * 2) * scaleY;

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
  }, [isEditing, data.id, data.text, updateObject]);

  return (
    <Group
      x={pos.x}
      y={pos.y}
      draggable={!isEditing}
      onMouseDown={() => onSelect(data.id)}
      onDblClick={handleDblClick}
      onDragStart={() => setIsDragging(true)}
      onDragMove={(e) => setPos({ x: e.target.x(), y: e.target.y() })}
      onDragEnd={(e) => {
        setIsDragging(false);
        updateObject(data.id, {
          x: e.target.x(),
          y: e.target.y(),
        });
      }}
    >
      <Rect
        width={WIDTH}
        height={HEIGHT}
        fill={data.color ?? "#fef08a"}
        stroke={isEditing ? "#2563eb" : undefined}
        strokeWidth={isEditing ? 3 : undefined}
        shadowColor="black"
        shadowBlur={4}
        shadowOpacity={0.2}
        cornerRadius={4}
      />
      <Text
        text={data.text ?? ""}
        x={TEXT_PADDING}
        y={TEXT_PADDING}
        width={WIDTH - TEXT_PADDING * 2}
        height={HEIGHT - TEXT_PADDING * 2}
        fontSize={FONT_SIZE}
        fontFamily={FONT_FAMILY}
        fill={TEXT_COLOR}
        listening={false}
      />
    </Group>
  );
}
