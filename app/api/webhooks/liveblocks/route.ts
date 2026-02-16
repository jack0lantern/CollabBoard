import { NextRequest } from "next/server";
import { updateBoardSnapshot } from "@/lib/db/boards";

export async function POST(request: NextRequest) {
  const body = await request.json();

  // Validate webhook signature in production
  // const signature = request.headers.get("x-liveblocks-signature");

  const { roomId, type } = body;

  if (type === "room.storage.updated" && roomId) {
    const storage = body.data?.storage;
    if (storage?.objects) {
      const snapshot = Object.fromEntries(
        Object.entries(storage.objects).map(([k, v]) => [k, v])
      );
      await updateBoardSnapshot(roomId, snapshot);
    }
  }

  return Response.json({ ok: true });
}
