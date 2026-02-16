import type { ObjectData } from "@/types";

export type Presence = {
  cursor: { x: number; y: number } | null;
  status: "typing" | "idle";
  user?: {
    id: string;
    name: string;
    avatar?: string;
  };
};

export type Storage = {
  objects: Record<string, ObjectData>;
};

export type RoomMetadata = {
  boardId: string;
};
