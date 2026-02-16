import { createClient } from "@liveblocks/client";
import { createRoomContext } from "@liveblocks/react";

const client = createClient({
  authEndpoint: "/api/liveblocks/auth",
});

export const {
  RoomProvider,
  useStorage,
  useMutation,
  useOthers,
  useSelf,
  useStatus,
  useBroadcastEvent,
  useEventListener,
} = createRoomContext(client);
