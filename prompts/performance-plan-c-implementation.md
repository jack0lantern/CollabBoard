# Plan C: Optimize Hot-Path Computations — Implementation Plan

**Goal:** Reduce per-frame drag computation from O(n²) to O(n), eliminate GC pressure from `Array.from()` allocations.

**Estimated effort:** Low | **Impact:** Medium (fixes local drag perf)

---

## 1. Replace `Array.from(refs.entries()).find()` with reverse lookup Map

**File:** `components/canvas/MultiSelectTransformer.tsx`

**Problem:** In `persistPositions`, `notifyDragMoveAt`, and `handleTransformEnd`, the code iterates all nodes and for each node does `Array.from(refs.entries()).find(([, ref]) => ref === node)` — O(n) per node → O(n²) total.

**Solution:** Build a `nodeToId: Map<Konva.Node, string>` reverse map once at the start of each function, then use O(1) lookup per node.

### 1a. `persistPositions` (lines 47–83)

```ts
// Before (O(n²)):
for (const node of nodes) {
  const entry = Array.from(refs.entries()).find(([, ref]) => ref === node);
  const id = entry?.[0];
  // ...
}

// After (O(n)):
const nodeToId = new Map<Konva.Node, string>();
for (const [id, n] of refs) nodeToId.set(n, id);
for (const node of nodes) {
  const id = nodeToId.get(node);
  if (id == null) continue;
  // ...
}
```

### 1b. `notifyDragMoveAt` (lines 99–113)

Same pattern: build `nodeToId` once, then `nodeToId.get(node)` per node.

### 1c. `handleTransformEnd` (lines 138–176)

Same pattern in the `for (const node of nodes)` loop.

---

## 2. Skip z-index recalculation during drag

**File:** `components/canvas/BoardStage.tsx`

**Problem:** `handleDragMoveAt` calls `handleDragEndAt` on every throttled drag move. `handleDragEndAt` runs `getLineEffectiveZIndex()` / `getTopmostFrameZIndex()` — expensive bounding-box checks. With 100 objects in multi-select, this runs 100× per move event.

**Solution:** Defer z-index computation to dragend only. The visual order does not need to change mid-drag.

### 2a. Simplify `handleDragMoveAt` (lines 366–380)

```ts
// Before: calls handleDragEndAt (z-index logic) on every throttled move
const handleDragMoveAt = useCallback(
  (objectId: string, newX: number, newY: number) => {
    const now = Date.now();
    const last = lastDragMoveZUpdateRef.current;
    if (last.objectId === objectId && now - last.time < DRAG_MOVE_THROTTLE_MS) return;
    lastDragMoveZUpdateRef.current = { objectId, time: now };
    handleDragEndAt(objectId, newX, newY);  // ← REMOVE this
  },
  [handleDragEndAt]
);

// After: no-op during drag; z-index runs only on dragend
const handleDragMoveAt = useCallback(() => {
  // Z-index deferred to dragend (handleDragEndAt called by persistPositions / ShapeRenderer onDragEnd)
}, []);
```

**Note:** `onDragMoveAt` is still invoked by shapes and MultiSelectTransformer for potential future use (e.g. cursor, ephemeral broadcast). The handler can remain as a no-op or be removed from the hot path if nothing else needs it. Verify no other side effects depend on it before making it a full no-op.

**Alternative (safer):** Keep `handleDragMoveAt` as-is but make it a no-op — i.e. remove the `handleDragEndAt` call. The z-index logic already runs on dragend via:
- **Multi-select:** `persistPositions` → `onDragEndAt(id, newX, newY)` for each object
- **Single shape:** Each shape’s `onDragEnd` → `onDragEndAt(id, newX, newY)`

### 2b. Remove throttle ref if unused

`lastDragMoveZUpdateRef` and `DRAG_MOVE_THROTTLE_MS` can be removed if `handleDragMoveAt` becomes a no-op.

---

## 3. Replace `objectListRef.current.find()` with direct key lookup

**File:** `components/canvas/BoardStage.tsx`

**Problem:** Several handlers use `objectListRef.current.find((o) => o.id === objectId)` — O(n) scan. Objects are stored as `Record<string, ObjectData>`, so lookup by id should be O(1).

**Solution:** Add `objectsRef` synced with `objects` and use `objectsRef.current[id]` for O(1) lookup in callbacks.

### 3a. Add `objectsRef` (near line 140)

```ts
const objectsRef = useRef(objects);
useLayoutEffect(() => {
  objectsRef.current = objects;
});
```

### 3b. Replace `objectListRef.current.find()` usages

| Location | Before | After |
|----------|--------|-------|
| `handleDragEndAt` (line 264) | `objectListRef.current.find((o) => o.id === objectId)` | `objectsRef.current[objectId]` |
| `handleFrameDragStart` (line 309) | `objectListRef.current.find((o) => o.id === frameId)` | `objectsRef.current[frameId]` |
| `handleFrameDragEnd` (line 339, 346) | `objectList.find((o) => o.id === frameId)` / `objectList.find((o) => o.id === id)` | `objectsRef.current[frameId]` / `objectsRef.current[id]` |
| `handleCopy` (line 396) | `selectedIds.map(id => objectListRef.current.find(...))` | `selectedIds.map(id => objectsRef.current[id]).filter(Boolean)` |
| `handleCreateFrameFromSelection` (line 440) | `ids.map(id => objectListRef.current.find(...))` | `ids.map(id => objectsRef.current[id]).filter(Boolean)` |
| `handleKeyDown` copy (line 493) | Same as handleCopy | Same pattern |

**Note:** `handleFrameDragEnd` uses `objectList` (local var from `objectListRef.current`). For O(1) lookup, use `objectsRef.current[id]` instead. The `objectList` variable is used in a loop — replace `objectList.find((o) => o.id === id)` with `objectsRef.current[id]`.

### 3c. Cases that need the full list

`getLineEffectiveZIndex` and `getTopmostFrameZIndex` both accept `ObjectData[]`. Keep `objectListRef` for these calls — it already holds the array. The optimization is only for single-object lookup by id: use `objectsRef.current[id]` instead of `objectListRef.current.find((o) => o.id === id)`.

---

## 4. Verification checklist

- [ ] MultiSelectTransformer: all three loops use `nodeToId` instead of `Array.from(refs.entries()).find()`
- [ ] BoardStage: `handleDragMoveAt` no longer calls `handleDragEndAt` (z-index deferred to dragend)
- [ ] BoardStage: `objectsRef` added and synced with `objects`
- [ ] BoardStage: all `objectListRef.current.find((o) => o.id === x)` replaced with `objectsRef.current[x]`
- [ ] `getLineEffectiveZIndex` / `getTopmostFrameZIndex` receive correct argument types (array vs record)
- [ ] Single-shape drag still updates z-index correctly on dragend
- [ ] Multi-select drag still updates z-index correctly on dragend
- [ ] Copy/paste, frame creation, and keyboard shortcuts still work

---

## 5. Files to modify

| File | Changes |
|------|---------|
| `components/canvas/MultiSelectTransformer.tsx` | Reverse lookup Map in `persistPositions`, `notifyDragMoveAt`, `handleTransformEnd` |
| `components/canvas/BoardStage.tsx` | Add `objectsRef`; simplify `handleDragMoveAt`; replace `find()` with `objectsRef.current[id]` |

---

## 6. Optional cleanup

- Remove `lastDragMoveZUpdateRef` and `DRAG_MOVE_THROTTLE_MS` if `handleDragMoveAt` is a no-op
- Consider removing `handleDragMoveAt` from props entirely if no caller needs it (would require updating ShapeRenderer, LineShape, etc. to not pass it) — **defer** unless you confirm no side effects
