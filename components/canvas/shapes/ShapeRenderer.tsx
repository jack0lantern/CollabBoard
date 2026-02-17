"use client";

import type { ObjectData } from "@/types";
import { StickyNote } from "./StickyNote";
import { RectShape } from "./RectShape";
import { CircleShape } from "./CircleShape";
import { LineShape } from "./LineShape";

export function ShapeRenderer({
  data,
  onSelect,
}: {
  data: ObjectData;
  onSelect: (id: string) => void;
}) {
  const common = { data, onSelect };
  switch (data.type) {
    case "sticky":
      return <StickyNote {...common} />;
    case "rect":
      return <RectShape {...common} />;
    case "circle":
      return <CircleShape {...common} />;
    case "line":
      return <LineShape {...common} />;
    default:
      return null;
  }
}
