Performance Analysis
After reading the codebase, I identified these root causes for the two problems:

Problem 1: Dragging 50-100 objects is slow/flickering (local user)
Root causes:

persistPositions() in MultiSelectTransformer (line 48-66): On dragend, it calls updateObject() in a loop — one Supabase UPDATE request per object. With 100 objects, that's 100 separate HTTP requests firing simultaneously.
notifyDragMoveAt() (line 83-95): On every dragmove event, it iterates all nodes and does Array.from(refs.entries()).find(...) — an O(n) scan per node, making the hot path O(n²).
patchObject() in useBoardObjects (line 162-171): Each call to updateObject triggers setObjects((prev) => ({ ...prev, [id]: { ...existing, ...updates } })) — a separate React state update per object. With 100 objects, that's 100 state updates, each creating a new object spread.
Z-index recalculation during drag: handleDragMoveAt fires handleDragEndAt which calls getTopmostFrameZIndex() / getLineEffectiveZIndex() — expensive bounding-box checks on every throttled move event.
Problem 2: Remote viewer sees shapes move one-at-a-time
Root causes:

Individual Supabase Realtime events: Each updateBoardObject() fires a separate PostgreSQL UPDATE, which triggers a separate postgres_changes event. The remote viewer's onChanged callback processes them one at a time — each calling setObjects() independently.
No batching on the receiving side: onChanged (line 216-218) does setObjects((prev) => ({ ...prev, [id]: data })) for each incoming change event, causing N separate re-renders rather than one batched render.
Proposed Plans
Plan A: Batch DB Writes + Coalesce Remote Updates (High Impact, Moderate Effort)
Local drag fix:

Change persistPositions() to collect all position updates into a single array and call updateMultipleObjects(batch) instead of N individual updateObject() calls.
In updateMultipleObjects(), replace the for loop of individual updateBoardObject() calls with a single Supabase .upsert() call that sends all rows at once.
Use patchMultipleObjects() (already exists at line 173) for the local state update so all 100 objects update in a single setObjects call.
Remote viewer fix:
4. Add a microtask-based coalescing buffer in onBoardObjectsChange: accumulate incoming onChanged events and flush them in one setObjects call using queueMicrotask or requestAnimationFrame. Since Supabase delivers multiple events on the same WebSocket message, they arrive in the same JS task — a microtask flush would batch them naturally.

Estimated impact: Reduces 100 DB writes to 1, reduces 100 React re-renders to 1 on both sides.

Plan B: Broadcast Ephemeral Drag Positions via Supabase Realtime Channel (High Impact, Moderate Effort)
Problem: Currently, remote viewers see no movement during drag — they only see the final positions after dragend fires the DB writes. The "one at a time" appearance is those final writes trickling in.

Solution:

Use Supabase Realtime's channel.send() (broadcast, no DB) to send a single batched message during drag: { type: "drag-move", positions: { [id]: {x, y}, ... } }.
Throttle these broadcasts to ~60ms (≈16fps) using the existing dragEmitter RAF pattern.
On the remote side, apply these ephemeral positions as transient overrides (similar to how localPos works in individual shapes) — update Konva node positions directly without going through React state.
On dragend, the DB write + Realtime postgres_changes event becomes the "final" authoritative update.
Estimated impact: Remote viewers see smooth, real-time drag movement instead of a staggered jump at the end.

Plan C: Optimize Hot-Path Computations (Medium Impact, Low Effort)
Fix the O(n²) lookups and unnecessary work in the drag loop:

Replace Array.from(refs.entries()).find() with a reverse lookup Map. In notifyDragMoveAt() and persistPositions(), the code iterates the entire refs Map for every node. Build a nodeToId: Map<Konva.Node, string> reverse map once and look up in O(1).
Skip z-index recalculation during multi-select drag. The handleDragMoveAt fires z-index adjustments for each object during drag — with 100 objects this is expensive. Defer z-index computation to dragend only, since the visual order doesn't need to change mid-drag.
Memoize objectListRef.current.find() calls. Several handlers do objectListRef.current.find((o) => o.id === objectId) — an O(n) scan. The objects are already in a Record<string, ObjectData>, so use direct key lookup instead.
Estimated impact: Reduces per-frame drag computation from O(n²) to O(n), eliminates GC pressure from Array.from() allocations.

Plan D: React Rendering Optimization (Medium Impact, Low Effort)
Stabilize ShapeRenderer props. Verify that ShapeRenderer is wrapped in React.memo and that callback props (onDragMove, onDragEnd, etc.) use stable references via useCallback. Currently, if any of these aren't stable, every object re-renders when any single object's state changes.
Split objects state into a ref + selective subscription. Instead of a single objects Record in React state (which forces all consumers to re-render on any change), use a ref for the data store and a lightweight subscription model where each shape only re-renders when its own data changes (similar to Zustand selectors or useSyncExternalStore).
Use Konva's built-in caching for shapes not currently being dragged. node.cache() rasterizes a shape to an offscreen canvas, so Konva doesn't need to re-execute draw commands for static shapes during drag frames.
Estimated impact: Reduces React reconciliation overhead from O(n) to O(1) per frame during drag.

Recommended Priority
Priority	Plan	Impact	Effort
1	Plan A (Batch writes + coalesce)	Fixes both problems directly	Moderate
2	Plan C (O(n²) hotpath fix)	Fixes local drag perf	Low
3	Plan B (Ephemeral broadcast)	Makes remote drag smooth	Moderate
4	Plan D (React render optimization)	Reduces re-render overhead	Medium
Plans A + C together would address the immediate symptoms. Plan B adds real-time remote drag visibility. Plan D is a longer-term architectural improvement for scaling to even larger boards.