# Fix Full Canvas Redraw on Undo/Redo

## Problem Description
Currently, performing an undo/redo action while another user is connected causes the entire canvas to flicker/redraw, both locally and remotely. This is caused by two main issues:
1. The `replaceBoardObjects` function in `lib/supabase/boards.ts` uses a bulk delete-then-insert strategy. This clears the entire table and repopulates it, sending `DELETE` and `INSERT` realtime events for every single object to all connected clients, forcing them to unmount and remount all shapes.
2. The local client attempts to suppress the "echo" of its own database writes using a hardcoded 150ms timeout in `useBoardObjects.ts` (`suppressRemoteRef.current`). When the network has other users, realtime latency often exceeds 150ms. The late-arriving bulk `DELETE` and `INSERT` events bypass the suppression, overwriting the optimistic local state and causing a massive state reference change (breaking `React.memo` for the shapes).

## Goal
Refactor the undo/redo synchronization logic to use a diff-based strategy so that we only write to the database exactly what has changed (added, removed, or updated objects), avoiding the bulk wipe-and-replace approach.

## Tasks

### 1. Update `lib/supabase/boards.ts`
- Modify or replace the `replaceBoardObjects` function (or create a new `syncDiffToDatabase` function).
- Instead of taking a whole snapshot, the function should accept the **diff** between the previous state and the new state.
- **Parameters to accept:**
  - `upserts`: An array of `ObjectData` (objects that were modified or newly added).
  - `deletes`: An array of `string` IDs (objects that were removed).
- Use `updateMultipleBoardObjects` (which handles upserts via `.upsert()`) for the additions/modifications.
- Create a batch deletion method using an `in` filter, e.g., `supabase.from("board_objects").delete().in("id", deletes)` to handle removals in one query.

### 2. Update `useBoardObjects.ts`
- Inside the `undo` and `redo` functions, we already use `computeChangedIds(current, target)`. 
- Leverage this diff to determine exactly what needs to be synced to Supabase:
  - Find all `changedIds` where the target state (`prev` for undo, `next` for redo) **has** the object. These go into the `upserts` list.
  - Find all `changedIds` where the target state **does not have** the object. These go into the `deletes` list.
- Call the new diff-based Supabase function from step 1 instead of `replaceBoardObjects(boardId, snapshot)`.
- **Remove the 150ms `suppressRemoteRef` hack.** Because we are now only emitting standard `UPDATE`, `INSERT`, and `DELETE` events for a small subset of objects (just the ones that actually changed), we don't need a blanket block on incoming events. When these smaller events echo back, they will hit the `onAdded`, `onChanged`, and `onRemoved` listeners. If the object data matches what we already optimistically set, it won't break our references. (Ensure `objectDataEqual` checks in `mergeSnapshot` protect against unnecessary reference churn).

## Success Criteria
- Performing undo/redo no longer causes the entire board to flash or shapes to visibly re-render.
- Other connected users only see the specific shapes involved in the undo/redo update, smoothly transitioning without full canvas flashing.
- The `suppressRemoteRef` timeout hack is completely removed.