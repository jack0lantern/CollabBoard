# Debug: Objects Not Syncing Properly

## Symptoms

1. **Sticky note text**: User A edits a sticky note's text. The change appears for User B but **not** for User A (the editor).
2. **Shape position**: When a user drags a shape (rect, circle, line, sticky), the new position does **not** sync to other users at all.

## Tech Stack

- **Data store**: Supabase PostgreSQL (`board_objects` table)
- **Realtime**: Supabase Realtime via `postgres_changes` on `board_objects` (filter: `board_id=eq.{boardId}`)
- **Presence**: Firebase RTDB (cursors only; not involved in object sync)
- **Mutations**: `setBoardObject`, `updateBoardObject`, `removeBoardObject` in `lib/supabase/boards.ts`

## Data Flow (Expected)

1. **Write**: Shape components call `updateObject(id, { text }` or `updateObject(id, { x, y })` → `useBoardMutations` → `updateBoardObject(boardId, id, updates)` → Supabase `.update()` on `board_objects`
2. **Read**: `useBoardObjects` subscribes via `onBoardObjectsChange(boardId, { onAdded, onChanged, onRemoved })` → Supabase Realtime `postgres_changes` → `setObjects(prev => ({ ...prev, [id]: data }))`
3. **Initial load**: `onBoardObjectsChange` also calls `getBoardObjects(boardId)` and invokes `onAdded` for each object.

## Key Files

| File | Role |
|------|------|
| `lib/supabase/boards.ts` | `updateBoardObject`, `onBoardObjectsChange`, `rowToObjectData`, `objectToRow` |
| `hooks/useBoardObjects.ts` | Subscribes to changes, holds `objects` state, passes to canvas |
| `hooks/useBoardMutations.ts` | `updateObject` → `updateBoardObject` |
| `components/canvas/shapes/StickyNote.tsx` | Text edit: `updateObject(data.id, { text: value })` on save |
| `components/canvas/shapes/RectShape.tsx`, `CircleShape.tsx`, `LineShape.tsx`, `StickyNote.tsx` | Position: `updateObject(data.id, { x, y })` on `onDragEnd` |
| `components/canvas/BoardStage.tsx` | Renders shapes from `useBoardObjects()` |
| `components/providers/RealtimeBoardProvider.tsx` | Provides `boardId` via context |

## Hypotheses to Investigate

### Sticky text: Editor doesn't see own change

- **Supabase Realtime self-broadcast**: Does Supabase Realtime deliver `postgres_changes` to the same client that triggered the write? Check if the editor's subscription receives the UPDATE event.
- **Optimistic vs. subscription ordering**: The editor has no optimistic update for text. After `updateObject`, the only way the UI updates is via `onChanged`. If the subscription doesn't fire for the writer, the editor's UI stays stale.
- **Stale `boardId`**: If `boardId` from `useBoardContext()` is null/undefined when `updateObject` runs, the mutation may not execute. Verify `boardId` is set before the board view mounts.
- **`onChanged` payload**: Ensure `payload.new` from Realtime includes the `text` column. `rowToObjectData` maps `row.text` → `data.text`. Confirm the UPDATE payload has full row data (REPLICA IDENTITY FULL is set in migration).

### Shape position: No sync at all

- **Mutation not firing**: Add logging in `updateBoardObject` (or `updateObject`) to confirm it's called with `{ x, y }` on drag end. Check for early returns (e.g. `Object.keys(updateData).length === 0`).
- **`updateBoardObject` field mapping**: `updates.x` → `updateData.x`, `updates.y` → `updateData.y`. Verify the mapping and that the Supabase `.update()` is sent.
- **RLS blocking**: RLS policies use `has_board_access` and `auth.jwt() ->> 'email'`. If the session is missing or invalid, updates could fail silently. Check for 403/RLS errors in the network tab.
- **Realtime subscription filter**: Filter is `board_id=eq.${boardId}`. Ensure `boardId` matches the actual board. If the channel is created with a different `boardId`, events won't match.
- **Realtime UPDATE payload**: For `postgres_changes` UPDATE, `payload.new` should contain the updated row. Verify `rowToObjectData` receives `x` and `y` (snake_case `x`, `y` in DB). Check if `payload.new` is partial vs full row.
- **Multiple channels**: If `onBoardObjectsChange` is called multiple times (e.g. strict mode double-mount), multiple subscriptions could exist. Ensure a single channel per `boardId` and proper cleanup on unmount.

## Debugging Steps

1. **Log Realtime payloads** in `lib/supabase/boards.ts` inside the `postgres_changes` callback:
   ```ts
   (payload) => {
     console.log("[Realtime]", payload.eventType, payload.new ?? payload.old);
     // ...
   }
   ```
   - Confirm INSERT/UPDATE/DELETE events arrive for both users.
   - For the editor: does the UPDATE event arrive on the same tab that made the change?
   - For position: does an UPDATE event arrive when User B drags? Does it include `x`, `y`?

2. **Log mutations** in `updateBoardObject`:
   ```ts
   console.log("[updateBoardObject]", boardId, objectId, updateData);
   ```
   - Confirm `updateObject` is called with `{ text }` and `{ x, y }` as expected.

3. **Log `useBoardObjects` callbacks**:
   ```ts
   onChanged(id, data) {
     console.log("[onChanged]", id, data);
     setObjects((prev) => ({ ...prev, [id]: data }));
   }
   ```
   - Confirm `onChanged` runs when Realtime fires.
   - Confirm `data` includes `text`, `x`, `y` as expected.

4. **Check Supabase Dashboard**:
   - Realtime: Is the `board_objects` table in the `supabase_realtime` publication?
   - Database: After a drag, does the `board_objects` row have updated `x`, `y`?
   - Logs: Any RLS or permission errors?

5. **Verify `boardId`** in `RealtimeBoardProvider` and `BoardClientWrapper`: Ensure `boardId` is passed correctly from the route and is never null when the canvas mounts.

6. **Test with a single user**: Open two tabs (same or different browsers), same board. Edit in Tab 1, watch Tab 2. Then edit in Tab 2, watch Tab 1. Determine whether the issue is self-broadcast, cross-user broadcast, or both. We have tests for checking our cross-users, but modify the existing one if necessary. 

## Subscription Errors (CHANNEL_ERROR, TIMED_OUT)

If you see `[onBoardObjectsChange] Subscription failed: CHANNEL_ERROR` or `TIMED_OUT`:

- **CHANNEL_ERROR**: Ensure `board_objects` is in the `supabase_realtime` publication (Supabase Dashboard → Database → Publications → supabase_realtime).
- **TIMED_OUT**: Often caused by Node.js < v22 with newer supabase-js. Upgrade Node.js to v22+ or see [Supabase Realtime TIMED_OUT troubleshooting](https://supabase.com/docs/guides/troubleshooting/realtime-connections-timed_out-status).

The board still loads via `getBoardObjects()`; only real-time sync is affected.

## Quick Checks

- [ ] `board_objects` has `REPLICA IDENTITY FULL` (migration 001)
- [ ] `board_objects` is in `supabase_realtime` publication
- [ ] `updateBoardObject` maps `x`, `y` to `updateData.x`, `updateData.y`
- [ ] `rowToObjectData` maps `row.x`, `row.y` to `data.x`, `data.y`
- [ ] Shape components call `updateObject` on `onDragEnd` (not just `onDragMove`)
- [ ] No duplicate `onBoardObjectsChange` subscriptions (check React strict mode / mount order)
