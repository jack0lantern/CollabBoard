"use client";

import { Group, Text, Line } from "react-konva";
import type Konva from "konva";
import type { OtherUser } from "@/hooks/usePresence";

const CURSOR_COLORS = [
  "#ef4444",
  "#f59e0b",
  "#10b981",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
  "#14b8a6",
  "#f97316",
];

function getCursorColor(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = (hash * 31 + userId.charCodeAt(i)) | 0;
  }
  return CURSOR_COLORS[Math.abs(hash) % CURSOR_COLORS.length];
}

export function CursorOverlay({
  stage,
  others,
}: {
  stage: Konva.Stage | null;
  others: OtherUser[];
}) {
  if (!stage) return null;

  return (
    <>
      {others.map((user) => {
        if (!user.cursor) return null;

        const color = getCursorColor(user.userId);
        const { x, y } = user.cursor;

        return (
          <Group key={user.userId} x={x} y={y}>
            <Line
              points={[0, 0, 0, 14, 4, 11, 7, 18, 9, 17, 6, 10, 11, 10]}
              fill={color}
              stroke="white"
              strokeWidth={1}
              closed
              listening={false}
            />
            <Group x={12} y={14}>
              <Text
                text={user.displayName}
                fontSize={11}
                fill="black"
                padding={2}
                listening={false}
              />
            </Group>
          </Group>
        );
      })}
    </>
  );
}
