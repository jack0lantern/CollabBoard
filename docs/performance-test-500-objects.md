# Performance Test Plan: 500 Objects on a Temporary Board

## Goal

Test for performance degradation when a board contains 500 canvas objects. Identify bottlenecks in rendering, Firestore sync, and user interactions.

---

## Prerequisites

- **Firebase**: Use Firebase Emulator (recommended) or a dedicated dev project to avoid polluting production.
- **Auth**: Logged-in user (needed for board creation and access).
- **Dev server**: `npm run dev` running.

---

## Phase 1: Create Seed Script

### 1.1 Add `scripts/seed-performance-board.ts`

A Node script that:

1. Uses Firebase client SDK with auth to:
   - Create a temporary board (e.g. `perf-test-500-{timestamp}`).
   - Seed `boards/{boardId}/objects` with 500 objects via `seedBoardObjects` (or batch writes).

2. **Object mix** (approximate):
   - ~200 sticky notes
   - ~150 rectangles
   - ~100 circles
   - ~50 lines

3. **Layout**: Spread objects across a 4000×3000 virtual canvas to avoid overlap and simulate a real dense board:
   - Grid positions: e.g. 20 columns × 25 rows.
   - Randomize `x`, `y` within grid cells.
   - Vary `width`, `height`, `radius` for shapes.

4. **Output**: Print the board ID and URL, e.g. `http://localhost:3000/board/perf-test-500-1234567890`.

### 1.2 Alternative: API Route

If Admin SDK is only available server-side, add:

- `POST /api/boards/seed-performance` — creates a board, seeds 500 objects, returns `{ boardId, url }`.
- Requires auth (Firebase ID token) or a dev-only secret.

---

## Phase 2: Metrics to Capture

### 2.1 Load Performance

| Metric | How to Measure | Target |
|--------|----------------|--------|
| **Time to interactive (TTI)** | `performance.now()` when canvas is painted vs. navigation start | &lt; 3s |
| **Firestore snapshot latency** | Time from `onSnapshot` subscribe to first full snapshot | &lt; 2s |
| **React render time** | React DevTools Profiler or `performance.measure` | &lt; 500ms per render |

### 2.2 Runtime Performance

| Metric | How to Measure | Target |
|--------|----------------|--------|
| **FPS during pan/zoom** | `requestAnimationFrame` loop, count frames over 1s | ≥ 30 FPS |
| **FPS during selection** | Same, when selecting/deselecting shapes | ≥ 30 FPS |
| **Input latency** | Time from click to selection highlight | &lt; 100ms |
| **Click selection latency** | Time from click to `data-selected-id` update | &lt; 150ms |
| **Drag end latency** | Time from mouseup to `data-last-drag-end` update | &lt; 300ms |

### 2.3 Memory

| Metric | How to Measure | Notes |
|--------|----------------|-------|
| **Heap size** | Chrome DevTools → Memory → Heap snapshot before/after load | Compare baseline vs. 500 objects |
| **DOM nodes** | `document.getElementsByTagName('*').length` | Konva uses canvas; expect limited DOM growth |

---

## Phase 3: Test Execution

### 3.1 Manual Testing

1. Run seed script (or call API) to create board with 500 objects.
2. Open the board URL in Chrome (incognito for clean profile).
3. Open DevTools:
   - **Performance** tab: Record while loading, then while panning/zooming.
   - **Console**: Run custom timing snippets (see Phase 4).
4. Document:
   - Subjective feel (laggy / smooth).
   - Any console errors or warnings.
   - Screenshot of Performance flame chart.

### 3.2 Playwright E2E (Optional)

Add a performance-focused test in `tests/e2e/performance-500.spec.ts`:

- **Setup**: Use a pre-seeded board ID (from seed script or `PERF_BOARD_500_ID` env var).
- **Assert**: `data-object-count` on `[data-testid="board-stage"]` equals 500.
- **Measure**: Use `page.evaluate()` to run `performance.getEntriesByType('navigation')` and check `domContentLoadedEventEnd` / `loadEventEnd`.
- **Click latency** (same as `click-drag-latency.spec.ts`): measure time from click to `data-selected-id` update (&lt; 150ms). **Drag latency**: measure time from mouseup to `data-last-drag-end` update (&lt; 300ms). Use Playwright’s `page.waitForFunction` to wait for object count, then assert load time &lt; threshold.

### 3.3 Lighthouse / Web Vitals (Optional)

- Run Lighthouse on the board page (Performance category).
- Note LCP, TBT, CLS if applicable (canvas apps may have limited impact).

---

## Phase 4: Console Snippets for Quick Metrics

Paste into DevTools Console on the board page:

```javascript
// 1. Object count (should be 500)
const stage = document.querySelector('[data-testid="board-stage"]');
console.log('Object count:', stage?.dataset?.objectCount ?? 'N/A');

// 2. Navigation timing
const nav = performance.getEntriesByType('navigation')[0];
console.log('DOM Content Loaded:', nav.domContentLoadedEventEnd - nav.startTime, 'ms');
console.log('Load complete:', nav.loadEventEnd - nav.startTime, 'ms');

// 3. FPS counter (run for ~5s while panning)
let frameCount = 0;
const start = performance.now();
function countFrame() {
  frameCount++;
  requestAnimationFrame(countFrame);
}
requestAnimationFrame(countFrame);
setTimeout(() => {
  cancelAnimationFrame(0);
  const elapsed = (performance.now() - start) / 1000;
  console.log('FPS:', (frameCount / elapsed).toFixed(1));
}, 5000);

// 4. Click latency (click a shape, then run this)
// Poll data-selected-id in test; here we just log current selection
console.log('Selected:', stage?.dataset?.selectedId ?? 'none');

// 5. Drag latency (drag a shape, then run this)
console.log('Last drag end:', stage?.dataset?.lastDragEnd ?? 'never');
```

---

## Phase 5: Cleanup

### 5.1 Delete Temporary Board

- **Option A**: Add `scripts/delete-performance-board.ts` — deletes board by ID (and its `objects` subcollection).
- **Option B**: Manual delete in Firebase Console / Emulator UI.
- **Option C**: Add `DELETE /api/boards/[id]` (or `?cleanup=perf`) for dev-only cleanup.

### 5.2 Naming Convention

Use a prefix like `perf-test-500-` so temporary boards are easy to find and delete in bulk.

---

## Phase 6: Potential Bottlenecks to Watch

Based on the current architecture:

| Area | Risk | Mitigation if Needed |
|------|------|----------------------|
| **Firestore `onSnapshot`** | Full snapshot of 500 docs on every change; initial load fetches all 500 | Batch reads; consider pagination or virtualization for very large boards |
| **React re-renders** | `useBoardObjects` spreads entire object map on each change; 500 ShapeRenderers | Memoize ShapeRenderer; use `React.memo`; consider canvas virtualization (render only visible objects) |
| **Konva Layer** | 500 nodes in one Layer; no built-in culling | Implement viewport culling: only render objects in visible area |
| **Selection / z-index** | `bringToFront` triggers Firestore write; `objectList` sorted on every render | Debounce; consider local-only optimistic updates |
| **GridBackground** | May redraw on every pan/zoom | Ensure it’s optimized (e.g. cached, not recreated per frame) |

---

## Checklist

- [ ] Create `scripts/seed-performance-board.ts` (or API route)
- [ ] Run seed, verify 500 objects appear on board
- [ ] Measure load time (DOM Content Loaded, first paint)
- [ ] Measure FPS during pan/zoom
- [ ] Measure FPS during selection
- [ ] Measure click selection latency (&lt; 150ms)
- [ ] Measure drag end latency (&lt; 300ms)
- [ ] Capture heap snapshot before/after
- [ ] Document findings (smooth / laggy / thresholds)
- [ ] Delete temporary board
- [ ] (Optional) Run Playwright `performance-500.spec.ts`

---

## File Structure (Proposed)

```
scripts/
  seed-performance-board.ts   # Creates board + 500 objects
  delete-performance-board.ts # Deletes by ID (optional)
docs/
  performance-test-500-objects.md  # This plan
tests/
  e2e/
    performance-500.spec.ts   # E2E: load, click latency, drag latency @ 500 objects
```
