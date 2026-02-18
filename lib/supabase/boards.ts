import { createSupabaseClient } from "@/lib/supabase/client";
import type { Board, ObjectData, ShareRole } from "@/types";

function rowToBoard(row: {
  id: string;
  title: string;
  created_at: string;
  owner_id: string | null;
  last_snapshot: Record<string, ObjectData> | null;
  is_public: boolean;
  shared_with: Record<string, ShareRole>;
}): Board {
  return {
    id: row.id,
    title: row.title ?? "",
    created_at: row.created_at ?? "",
    owner_id: row.owner_id,
    last_snapshot: row.last_snapshot,
    is_public: row.is_public ?? false,
    shared_with: row.shared_with ?? {},
  };
}

const MIN_DIMENSION = 1;

function ensurePositiveDimension(val: number | null | undefined): number | undefined {
  if (val == null) return undefined;
  return Math.max(MIN_DIMENSION, Math.abs(val));
}

/** Sanitize ObjectData: ensure width, height, radius are always positive. */
function sanitizeObjectData(obj: ObjectData): ObjectData {
  const width = obj.width != null ? ensurePositiveDimension(obj.width) : obj.width;
  const height = obj.height != null ? ensurePositiveDimension(obj.height) : obj.height;
  const radius = obj.radius != null ? ensurePositiveDimension(obj.radius) : obj.radius;
  const radiusX = obj.radiusX != null ? ensurePositiveDimension(obj.radiusX) : obj.radiusX;
  const radiusY = obj.radiusY != null ? ensurePositiveDimension(obj.radiusY) : obj.radiusY;
  if (
    width === obj.width &&
    height === obj.height &&
    radius === obj.radius &&
    radiusX === obj.radiusX &&
    radiusY === obj.radiusY
  ) {
    return obj;
  }
  return { ...obj, width, height, radius, radiusX, radiusY };
}

function rowToObjectData(row: {
  id: string;
  type: string;
  x: number;
  y: number;
  z_index?: number;
  width?: number;
  height?: number;
  radius?: number;
  radius_x?: number;
  radius_y?: number;
  points?: number[];
  color?: string;
  text?: string;
  rotation?: number;
}): ObjectData {
  return sanitizeObjectData({
    id: row.id,
    type: row.type as ObjectData["type"],
    x: row.x,
    y: row.y,
    zIndex: row.z_index,
    width: row.width,
    height: row.height,
    radius: row.radius,
    radiusX: row.radius_x,
    radiusY: row.radius_y,
    points: row.points,
    color: row.color,
    text: row.text,
    rotation: row.rotation,
  });
}

function objectToRow(
  object: ObjectData,
  boardId: string
): Record<string, unknown> {
  return {
    id: object.id,
    board_id: boardId,
    type: object.type,
    x: object.x,
    y: object.y,
    z_index: object.zIndex ?? 0,
    width: object.width,
    height: object.height,
    radius: object.radius,
    radius_x: object.radiusX,
    radius_y: object.radiusY,
    points: object.points,
    color: object.color,
    text: object.text,
    rotation: object.rotation ?? 0,
  };
}

export async function getBoard(id: string): Promise<Board | null> {
  const supabase = createSupabaseClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("boards")
    .select("*")
    .eq("id", id)
    .single();

  if (error ?? !data) return null;
  return rowToBoard(data);
}

export async function getBoardsByOwner(ownerId: string): Promise<Board[]> {
  const supabase = createSupabaseClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("boards")
    .select("*")
    .eq("owner_id", ownerId)
    .order("created_at", { ascending: false });

  if (error) return [];
  return (data ?? []).map(rowToBoard);
}

export async function createBoard(
  title: string,
  ownerId: string
): Promise<Board | null> {
  const supabase = createSupabaseClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("boards")
    .insert({
      title: title.trim() || "Untitled Board",
      owner_id: ownerId,
      last_snapshot: null,
    })
    .select()
    .single();

  if (error) {
    console.error("[createBoard] Supabase error:", error.message, error.code, error.details);
    return null;
  }
  if (!data) return null;
  return rowToBoard(data);
}

export async function updateBoardTitle(
  boardId: string,
  title: string
): Promise<boolean> {
  const supabase = createSupabaseClient();
  if (!supabase) return false;

  const { error } = await supabase
    .from("boards")
    .update({ title: title.trim() || "Untitled Board" })
    .eq("id", boardId);

  return !error;
}

export async function updateBoardSharing(
  boardId: string,
  updates: { is_public?: boolean; shared_with?: Record<string, ShareRole> }
): Promise<boolean> {
  const supabase = createSupabaseClient();
  if (!supabase) return false;

  const updateData: Record<string, unknown> = {};
  if (updates.is_public !== undefined) updateData.is_public = updates.is_public;
  if (updates.shared_with !== undefined)
    updateData.shared_with = updates.shared_with;

  if (Object.keys(updateData).length === 0) return true;

  const { error } = await supabase
    .from("boards")
    .update(updateData)
    .eq("id", boardId);

  return !error;
}

export function subscribeToBoardsByOwner(
  ownerId: string,
  callback: (boards: Board[]) => void
): () => void {
  const supabase = createSupabaseClient();
  if (!supabase) return () => {};

  const channel = supabase
    .channel("boards-list")
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "boards",
        filter: `owner_id=eq.${ownerId}`,
      },
      () => {
        getBoardsByOwner(ownerId).then(callback);
      }
    )
    .subscribe();

  // Initial fetch
  getBoardsByOwner(ownerId).then(callback);

  return () => {
    supabase.removeChannel(channel);
  };
}

// --- Canvas objects ---

export async function setBoardObject(
  boardId: string,
  object: ObjectData
): Promise<void> {
  const supabase = createSupabaseClient();
  if (!supabase) return;

  const row = objectToRow(object, boardId);
  await supabase.from("board_objects").upsert(row, {
    onConflict: "id",
  });
}

export async function updateBoardObject(
  boardId: string,
  objectId: string,
  updates: Partial<ObjectData>
): Promise<void> {
  const supabase = createSupabaseClient();
  if (!supabase) return;

  const updateData: Record<string, unknown> = {};
  if (updates.x !== undefined) updateData.x = updates.x;
  if (updates.y !== undefined) updateData.y = updates.y;
  if (updates.zIndex !== undefined) updateData.z_index = updates.zIndex;
  if (updates.width !== undefined) updateData.width = updates.width;
  if (updates.height !== undefined) updateData.height = updates.height;
  if (updates.radius !== undefined) updateData.radius = updates.radius;
  if (updates.radiusX !== undefined) updateData.radius_x = updates.radiusX;
  if (updates.radiusY !== undefined) updateData.radius_y = updates.radiusY;
  if (updates.points !== undefined) updateData.points = updates.points;
  if (updates.color !== undefined) updateData.color = updates.color;
  if (updates.text !== undefined) updateData.text = updates.text;
  if (updates.rotation !== undefined) updateData.rotation = updates.rotation;

  if (Object.keys(updateData).length === 0) return;

  const { error } = await supabase
    .from("board_objects")
    .update(updateData)
    .eq("board_id", boardId)
    .eq("id", objectId);

  if (error) {
    console.error("[updateBoardObject] Supabase update failed:", error.message, error.code, error.details);
  }
}

export async function removeBoardObject(
  boardId: string,
  objectId: string
): Promise<void> {
  const supabase = createSupabaseClient();
  if (!supabase) return;

  await supabase
    .from("board_objects")
    .delete()
    .eq("board_id", boardId)
    .eq("id", objectId);
}

export async function getBoardObjects(
  boardId: string
): Promise<Record<string, ObjectData>> {
  const supabase = createSupabaseClient();
  if (!supabase) return {};

  const { data, error } = await supabase
    .from("board_objects")
    .select("*")
    .eq("board_id", boardId);

  if (error) return {};

  const out: Record<string, ObjectData> = {};
  for (const row of data ?? []) {
    out[row.id] = rowToObjectData(row);
  }
  return out;
}

export async function seedBoardObjects(
  boardId: string,
  objects: Record<string, ObjectData>
): Promise<void> {
  const supabase = createSupabaseClient();
  if (!supabase) return;

  const rows = Object.entries(objects).map(([id, obj]) =>
    objectToRow({ ...sanitizeObjectData(obj), id }, boardId)
  );
  await supabase.from("board_objects").upsert(rows, {
    onConflict: "id",
  });
}

/** Replace all board objects with the given snapshot (for undo/redo). */
export async function replaceBoardObjects(
  boardId: string,
  objects: Record<string, ObjectData>
): Promise<void> {
  const supabase = createSupabaseClient();
  if (!supabase) return;

  await supabase
    .from("board_objects")
    .delete()
    .eq("board_id", boardId);

  const rows = Object.entries(objects).map(([id, obj]) =>
    objectToRow({ ...sanitizeObjectData(obj), id }, boardId)
  );
  if (rows.length > 0) {
    await supabase.from("board_objects").insert(rows);
  }
}

export function onBoardObjectsChange(
  boardId: string,
  callbacks: {
    onAdded: (id: string, data: ObjectData) => void;
    onChanged: (id: string, data: ObjectData) => void;
    onRemoved: (id: string) => void;
  }
): () => void {
  const supabase = createSupabaseClient();
  if (!supabase) return () => {};

  const channel = supabase
    .channel(`board-objects-${boardId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "board_objects",
        filter: `board_id=eq.${boardId}`,
      },
      (payload) => {
        if (payload.eventType === "INSERT" && payload.new) {
          const row = payload.new as Record<string, unknown>;
          callbacks.onAdded(row.id as string, rowToObjectData(row as Parameters<typeof rowToObjectData>[0]));
        } else if (payload.eventType === "UPDATE" && payload.new) {
          const row = payload.new as Record<string, unknown>;
          callbacks.onChanged(row.id as string, rowToObjectData(row as Parameters<typeof rowToObjectData>[0]));
        } else if (payload.eventType === "DELETE" && payload.old) {
          const row = payload.old as Record<string, unknown>;
          callbacks.onRemoved(row.id as string);
        }
      }
    )
    .subscribe((status, err) => {
      if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        console.error("[onBoardObjectsChange] Subscription failed:", status, err);
      }
    });

  // Initial fetch
  getBoardObjects(boardId).then((objs) => {
    for (const [id, data] of Object.entries(objs)) {
      callbacks.onAdded(id, data);
    }
  });

  return () => {
    supabase.removeChannel(channel);
  };
}
