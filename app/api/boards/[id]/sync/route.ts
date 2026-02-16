import { NextRequest } from "next/server";
import { updateBoardSnapshot } from "@/lib/db/boards";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;
  const body = await request.json();
  const { snapshot } = body;

  if (!snapshot || typeof snapshot !== "object") {
    return new Response("Invalid snapshot", { status: 400 });
  }

  const ok = await updateBoardSnapshot(id, snapshot);
  return Response.json({ ok });
}
