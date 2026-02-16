"use client";

import { Group, Rect, Text } from "react-konva";
import type { ObjectData } from "@/types";
import { useUpdateObject } from "@/lib/liveblocks/hooks";

const WIDTH = 200;
const HEIGHT = 150;

export function StickyNote({ data }: { data: ObjectData }) {
  const updateObject = useUpdateObject();

  return (
    <Group
      x={data.x}
      y={data.y}
      draggable
      onDragEnd={(e) => {
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
