import { NextRequest } from "next/server";
import { Liveblocks } from "@liveblocks/node";

function getLiveblocks() {
  const secret = process.env.LIVEBLOCKS_SECRET_KEY;
  if (!secret?.startsWith("sk_")) {
    throw new Error("Missing or invalid LIVEBLOCKS_SECRET_KEY");
  }
  return new Liveblocks({ secret });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { roomId, userId } = body;

  if (!roomId || !userId) {
    return new Response("Missing roomId or userId", { status: 400 });
  }

  const liveblocks = getLiveblocks();
  const session = liveblocks.prepareSession(userId, {
    userInfo: {
      name: "User",
    },
  });

  session.allow(roomId, session.FULL_ACCESS);

  const { status, body: responseBody } = await session.authorize();
  return new Response(responseBody, { status });
}
