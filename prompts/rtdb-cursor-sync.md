# Prompt: Use Firebase Realtime Database (RTDB) for Cursor Syncing to Minimize Latency

## Context

CollabBoard is a collaborative whiteboard with Firebase. Currently:
- **Firestore** handles: board metadata, canvas objects (`objects` subcollection), and presence/cursors (`presence` subcollection)
- **Presence** is synced via Firestore `onSnapshot` on `boards/{boardId}/presence/{userId}`

Cursor updates are high-frequency (every mouse move). Firestore has higher latency than RTDB for this use case because:
- Firestore: document-based, REST/WebSocket hybrid, higher per-write overhead
- RTDB: WebSocket-native, optimized for low-latency, high-frequency updates

## Goal

Migrate **cursor/presence syncing** from Firestore to Firebase Realtime Database (RTDB) to minimize latency while keeping Firestore for board objects and persistence.

## Current Architecture (to migrate)

- `lib/firebase/boards.ts`: `setPresence`, `updatePresenceCursor`, `removePresence`, `onPresenceChange` — all use Firestore
- `hooks/usePresence.ts`: Uses `updatePresenceCursor` on every mouse move; subscribes via `onPresenceChange`
- `types/presence.ts`: `PresenceData` = `{ cursor, displayName, avatarUrl, lastSeen }`

## RTDB Structure

```
boards/{boardId}/presence/{userId}
  cursor: { x: number, y: number } | null
  displayName: string
  avatarUrl: string | null
  lastSeen: number
```

## Implementation Requirements

1. **Add RTDB client**
   - Enable Realtime Database in Firebase Console
   - Add `getRealtimeDb()` in `lib/firebase/` (or extend `client.ts`)
   - Use `ref`, `set`, `update`, `onValue`, `onDisconnect`, `remove` from `firebase/database`

2. **Create `lib/firebase/presence.ts`** (or `lib/firebase/rtdb-presence.ts`)
   - `setPresence(boardId, userId, data: PresenceData): Promise<void>`
   - `updatePresenceCursor(boardId, userId, cursor: {x,y}|null): void` — use `update()` for partial updates
   - `removePresence(boardId, userId): Promise<void>`
   - `onPresenceChange(boardId, callback): Unsubscribe` — use `onValue(ref(db, path), ...)` with `{ onlyOnce: false }`
   - `setupOnDisconnectCleanup(boardId, userId): void` — use `onDisconnect(ref).remove()` so presence is removed when user disconnects (no need for lastSeen staleness)

3. **Debounce cursor updates**
   - In `usePresence`, debounce `updateCursor` to ~50–100ms (e.g. `requestAnimationFrame` or lodash `debounce`) so we don’t flood RTDB on every mouse move

4. **Security rules** (RTDB)
   - Require `auth != null`
   - Path: `boards/{boardId}/presence/{userId}` — allow read/write only if `auth.uid == userId` for write; read if user has board access (mirror Firestore rules: owner, public, or shared_with)

5. **Keep Firestore for**
   - Board metadata, objects, snapshots — unchanged

6. **Preserve `PresenceData` and `OtherUser` types**
   - `usePresence` and `CursorOverlay` should stay the same; only the underlying persistence layer changes

## Expected Outcome

- Cursor updates propagate to other users in ~50–150ms (RTDB typical) vs Firestore’s ~100–300ms
- `onDisconnect` removes presence automatically when a user leaves

## Testing

- Update `tests/mocks/` to support RTDB presence mock if needed
- `usePresence.test.ts` should pass with mock
- E2E `sync-latency.spec.ts` (or a cursor-specific variant) should show improved latency
