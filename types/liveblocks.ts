import type { ObjectData } from "./board";

export interface Presence {
  cursor: { x: number; y: number } | null;
  status: "typing" | "idle";
  user?: {
    id: string;
    name: string;
    avatar?: string;
  };
}

export interface Storage {
  objects: LiveMap<string, ObjectData>;
}

export type LiveMap<K extends string, V> = Map<K, V>;

export interface RoomMetadata {
  boardId: string;
}
