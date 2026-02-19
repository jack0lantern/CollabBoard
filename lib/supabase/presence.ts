import type { RealtimeChannel } from "@supabase/supabase-js";
import { createSupabaseClient } from "@/lib/supabase/client";
import type { PresenceData } from "@/types/presence";

const PRESENCE_CHANNEL_PREFIX = "board-presence:";

function getChannelName(boardId: string): string {
  return `${PRESENCE_CHANNEL_PREFIX}${boardId}`;
}

// Store channel ref so updatePresenceCursor can update our tracked presence
let channelRef: {
  channel: RealtimeChannel;
  boardId: string;
  userId: string;
  displayName: string;
  avatarUrl: string | null;
} | null = null;

function buildPresenceMap(channel: RealtimeChannel): Record<string, PresenceData> {
  const state = channel.presenceState() as Record<string, PresenceData[]>;
  const presenceMap: Record<string, PresenceData> = {};
  for (const [key, presences] of Object.entries(state)) {
    const p = presences[0];
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- presences[0] can be undefined
    if (p != null && typeof p === "object" && "lastSeen" in p) {
      presenceMap[key] = p;
    }
  }
  return presenceMap;
}

export function setPresence(
  boardId: string,
  userId: string,
  presence: PresenceData
): Promise<void> {
  if (channelRef && channelRef.boardId === boardId && channelRef.userId === userId) {
    void channelRef.channel.track(presence);
  }
  return Promise.resolve();
}

export function updatePresenceCursor(
  boardId: string,
  userId: string,
  cursor: { x: number; y: number } | null
): void {
  if (!channelRef || channelRef.boardId !== boardId || channelRef.userId !== userId) return;
  void channelRef.channel.track({
    cursor,
    displayName: channelRef.displayName,
    avatarUrl: channelRef.avatarUrl,
    lastSeen: Date.now(),
  });
}

export function removePresence(
  boardId: string,
  userId: string
): Promise<void> {
  if (channelRef && channelRef.boardId === boardId && channelRef.userId === userId) {
    void channelRef.channel.untrack();
    void channelRef.channel.unsubscribe();
    channelRef = null;
  }
  return Promise.resolve();
}

export function onPresenceChange(
  boardId: string,
  options: {
    userId: string;
    initialPresence: PresenceData;
  },
  callback: (presence: Record<string, PresenceData>) => void
): () => void {
  const supabase = createSupabaseClient();
  if (!supabase) return () => {};

  const { userId, initialPresence } = options;
  const channelName = getChannelName(boardId);
  const channel = supabase.channel(channelName, {
    config: { presence: { key: userId } },
  });

  const notify = () => callback(buildPresenceMap(channel));

  channel
    .on("presence", { event: "sync" }, notify)
    .on("presence", { event: "join" }, notify)
    .on("presence", { event: "leave" }, notify)
    .subscribe((status) => {
      if ((status as string) === "SUBSCRIBED") {
        channelRef = {
          channel,
          boardId,
          userId,
          displayName: initialPresence.displayName,
          avatarUrl: initialPresence.avatarUrl,
        };
        void channel.track(initialPresence);
      }
    });

  return () => {
    if (channelRef?.channel === channel) {
      channelRef = null;
    }
    void supabase.removeChannel(channel);
  };
}

export function setupOnDisconnectCleanup(
  _boardId: string,
  _userId: string
): void {
  // Supabase Presence removes a client's presence when they leave the channel.
}
