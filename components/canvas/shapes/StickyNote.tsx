"use client";

import { useEffect, useState } from "react";
import { Group, Rect, Text } from "react-konva";
import type { ObjectData } from "@/types";
import { useBoardMutations } from "@/hooks/useBoardMutations";

const WIDTH = 200;
const HEIGHT = 150;

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

  useEffect(() => {
    if (!isDragging) {
      setPos({ x: data.x, y: data.y });
    }
  }, [data.x, data.y, isDragging]);

  return (
    <Group
      x={pos.x}
      y={pos.y}
      draggable
      onMouseDown={() => onSelect(data.id)}
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
        shadowColor="black"
        shadowBlur={4}
        shadowOpacity={0.2}
        cornerRadius={4}
      />
      <Text
        text={data.text ?? ""}
        x={8}
        y={8}
        width={WIDTH - 16}
        height={HEIGHT - 16}
        fontSize={14}
        fill="black"
        listening={false}
      />
    </Group>
  );
}
