Refined Plan D: React Rendering Optimization + Undo/Redo Efficiency
Here's the analysis and plan based on the current architecture:

Current Problems
1. Every shape re-renders when any object changes

The render loop in BoardStage.tsx (line 754) does:

{sortedObjects.map((obj) => (
  <ShapeRenderer key={obj.id} data={obj} ... />
))}

Where sortedObjects is derived from Object.values(objects). Even though ShapeRenderer is wrapped in React.memo, when objects changes (any single property on any single shape), the entire sortedObjects array is rebuilt. Every obj reference changes because { ...prev, [id]: { ...existing, ...updates } } creates a new top-level object, which forces Object.values() to return new references for every entry even though only one changed.

The mergeSnapshot helper (line 51-66) already tries to preserve references for unchanged objects — this is correct. But the issue is that patchObject and patchMultipleObjects don't preserve references for untouched objects:

// patchObject (line 175-179)
setObjects((prev) => {
  const existing = prev[id];
  if (!existing) return prev;
  return { ...prev, [id]: { ...existing, ...updates } };
});

The { ...prev, ... } spread creates a new Record object, but all the other object values keep their original references. So React.memo on ShapeRenderer should skip re-renders for shapes whose data reference didn't change — as long as the other props are stable.

2. Unstable callback props defeat React.memo

Looking at the ShapeRenderer call site (lines 755-777), several props are potentially unstable per-render:

otherObjects={otherObjectsByExcludedId.get(obj.id) ?? []} — otherObjectsByExcludedId is a useMemo keyed on objectList, which changes on every objects change. This means every shape gets a new array reference for otherObjects.
isSelected={!readOnly && isSelected(obj.id)} — this is a boolean so it's stable by value.
onSelect, handleShapeDragEnd, etc. — these are useCallback so they're stable ✅.
So the main culprit for excessive re-renders is otherObjects creating new array references every time.

3. Undo/redo re-renders all 500 shapes

When undo/redo fires:

setObjects((current) => mergeSnapshot(current, prev)) — mergeSnapshot preserves references for unchanged objects ✅
But then replaceBoardObjects(boardId, prev) does a full DELETE + INSERT on the DB, which fires 500 postgres_changes events (INSERT for each row)
Those events come back through onAdded(id, data) → setObjects((prev) => ({ ...prev, [id]: data })) — creating 500 separate state updates, each with a new ObjectData reference (since rowToObjectData always creates a new object)
This cascade of state updates causes repeated full re-renders
4. sortedObjects is recomputed every render

The sort (lines 185-189) runs on every render, calling getLineEffectiveZIndex for every line object. This is O(n²) in the worst case.

Proposed Changes (Refined Plan D)
D1: Stabilize otherObjects to stop defeating React.memo
File: BoardStage.tsx (lines 191-197)

The current otherObjectsByExcludedId builds N arrays of (N-1) objects on every render. Replace this with a stable reference:

Only LineShape uses otherObjects. Change it so LineShape receives the full objectList ref (or the shared objects Record) and filters internally via a ref lookup, rather than pre-building N exclusion arrays.
This eliminates the O(n²) memory allocation and breaks the prop instability.
D2: Memoize sortedObjects properly
File: BoardStage.tsx (lines 185-189)

Wrap the sort in useMemo keyed on objects so it only recomputes when objects actually change, not on every render triggered by selection changes, pan/zoom, etc.

D3: Prevent undo/redo remote event cascade from re-rendering all shapes
File: useBoardObjects.ts (lines 236-263) and boards.ts

The core issue: replaceBoardObjects does DELETE all + INSERT all → triggers N onAdded events that each create new ObjectData references, overwriting the clean references that mergeSnapshot preserved.

Fix: Add a "suppress remote updates" flag during undo/redo. When undo() or redo() fires:

Set a suppressRemoteRef.current = true flag before calling replaceBoardObjects.
In the onAdded/onChanged callbacks, check suppressRemoteRef.current — if true, skip the setObjects call (since local state is already correct from mergeSnapshot).
After replaceBoardObjects resolves, clear the flag, then do a single reconciliation (or just trust the local state).
This means undo/redo causes exactly one setObjects call (the mergeSnapshot one), and the DB cascade is silently absorbed.

D4: Use useSyncExternalStore pattern for per-shape subscriptions (Optional, Highest Impact)
Files: useBoardObjects.ts, BoardStage.tsx, new hook useObjectData.ts

Instead of passing data={obj} from a top-level objects state:

Store objects in a ref (external store) instead of React state.
Create a useObjectData(id) hook using useSyncExternalStore that subscribes to changes for a single object ID.
Each ShapeRenderer calls useObjectData(data.id) internally and only re-renders when its own data changes.
BoardStage only re-renders when the set of object IDs changes (add/remove), not when individual objects are patched.
This is the most impactful change but also the most invasive. It would reduce re-renders from O(n) to O(1) for single-object edits, and from O(n) to O(k) for k-object undo/redo diffs.

D5: Konva node caching for static shapes during drag
File: Individual shape components (RectShape, StickyNote, etc.)

During multi-select drag, shapes that are not being dragged are static. Use Konva's node.cache() to rasterize them, so Konva's draw loop skips their rendering commands. Uncache on any data change.

Recommended Implementation Order
Step	Change	Impact	Effort	Undo/Redo Fix
1	D3 — Suppress remote events during undo/redo	High	Low	✅ Direct fix
2	D1 — Stabilize otherObjects prop	High	Low	✅ Indirect (fewer re-renders)
3	D2 — Memoize sortedObjects	Medium	Trivial	✅ Indirect
4	D5 — Konva caching for static shapes	Medium	Low	—
5	D4 — useSyncExternalStore per-shape	Highest	High	✅ Fundamental fix
Steps D1–D3 together would eliminate the bulk of unnecessary re-renders during both drag and undo/redo, with relatively low risk. D4 is the ideal long-term architecture but requires more refactoring. D5 targets Konva's draw performance independent of React.