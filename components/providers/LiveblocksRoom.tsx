"use client";

import { RoomProvider } from "@/lib/liveblocks/client";

export function LiveblocksRoom({
  boardId,
  children,
}: {
  boardId: string;
  children: React.ReactNode;
}) {
  return (
    <RoomProvider
      id={boardId}
      initialPresence={{
        cursor: null,
        status: "idle",
      }}
      initialStorage={{
        objects: {},
      }}
    >
      {children}
    </RoomProvider>
  );
}
