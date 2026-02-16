"use client";

import type { ObjectData } from "@/types";
import { StickyNote } from "./StickyNote";
import { RectShape } from "./RectShape";
import { CircleShape } from "./CircleShape";
import { LineShape } from "./LineShape";

export function ShapeRenderer({ data }: { data: ObjectData }) {
  switch (data.type) {
    case "sticky":
      return <StickyNote data={data} />;
    case "rect":
      return <RectShape data={data} />;
    case "circle":
      return <CircleShape data={data} />;
    case "line":
      return <LineShape data={data} />;
    default:
      return null;
  }
}
