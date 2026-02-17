import { NextRequest } from "next/server";
import { verifyIdToken } from "@/lib/firebase/admin";
import { getBoardsByOwner, createBoard } from "@/lib/db/boards";

function getToken(request: NextRequest): string | null {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return null;
  return header.slice(7);
}

export async function GET(request: NextRequest) {
  const token = getToken(request);
  if (!token) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const decoded = await verifyIdToken(token);
  if (!decoded) {
    return Response.json({ error: "Invalid token" }, { status: 401 });
  }

  const boards = await getBoardsByOwner(decoded.uid);
  return Response.json({ boards });
}

export async function POST(request: NextRequest) {
  const token = getToken(request);
  if (!token) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const decoded = await verifyIdToken(token);
  if (!decoded) {
    return Response.json({ error: "Invalid token" }, { status: 401 });
  }

  const body = await request.json();
  const title = typeof body.title === "string" && body.title.trim()
    ? body.title.trim()
    : "Untitled Board";

  const board = await createBoard(title, decoded.uid);
  if (!board) {
    return Response.json({ error: "Failed to create board" }, { status: 500 });
  }

  return Response.json({ board }, { status: 201 });
}
