# Plan: Service Degradation Testing with 5 Simultaneous Users

**Goal:** Verify CollabBoard maintains acceptable performance with 5 concurrent users on the same board, and document any degradation.

---

## 1. Success Criteria (What "No Degradation" Means)

| Metric | Baseline (1 user) | Target (5 users) | Degradation Threshold |
|--------|-------------------|------------------|------------------------|
| Object sync latency | <100ms | <200ms | >500ms |
| Cursor sync latency | <50ms | <150ms | >300ms |
| Frame rate (pan/zoom) | 60 FPS | ≥45 FPS | <30 FPS |
| API response (`/api/boards/[id]/sync`) | <500ms | <1s | >2s |
| Firestore read/write errors | 0 | 0 | Any |

---

## 2. Test Environment Setup

### Option A: Playwright (Recommended for CI/Reproducibility)

- Use 5 browser contexts in a single Playwright test
- Each context = 1 simulated user on the same board
- Requires: authenticated users or a shared test board with public access

### Option B: Manual (Quick Validation)

- 5 browser tabs/windows (Chrome, Firefox, Safari, Edge, Incognito)
- Or: 5 devices on same network
- Use different auth accounts or incognito + different Google accounts

### Option C: k6 or Artillery (API-Only Load)

- Simulate 5 concurrent POSTs to `/api/boards/[id]/sync`
- Does not test real-time Firestore listeners or cursor sync
- Use for API route stress only

---

## 3. Test Scenarios

### Scenario 1: Passive Load (5 users viewing)

- 5 users load the same board
- No edits; only presence/cursor updates
- **Measure:** Cursor sync latency, Firestore read count, frame rate

### Scenario 2: Light Edit Load (5 users, occasional edits)

- Each user adds 1–2 shapes every 10 seconds
- **Measure:** Object sync latency (time from User A add → User B sees)

### Scenario 3: Burst Edit Load (5 users, simultaneous edits)

- All 5 users add shapes at the same time (e.g., on a countdown)
- **Measure:** Sync latency, conflict handling (LWW), any dropped updates

### Scenario 4: Sustained Activity (5 users, 2 minutes)

- Continuous pan/zoom, cursor movement, and occasional shape creation
- **Measure:** Frame rate over time, memory usage, Firestore quota impact

### Scenario 5: Concurrent Grab (2 users, same object within 1 second)

- 2 users grab and drag the same object within ~1 second (simultaneous or near-simultaneous)
- **Expected behavior:** Last-write-wins (LWW); both clients converge to same final position; no duplicate objects; no crashes
- **Measure:** Both clients show identical final position; object count remains 1; no console/network errors
- **Note:** Behavior may be less correct when network latency is high or when more than 2 users grab the same object—LWW can cause one user’s move to be overwritten without feedback

---

## 4. Metrics to Collect

| Metric | How to Measure |
|--------|----------------|
| Object sync latency | Instrument `sync-latency.spec.ts` pattern: User A adds → User B sees; record `Date.now()` delta |
| Cursor sync latency | Add `data-last-cursor-update` to cursor component; poll from another context |
| Frame rate | Chrome DevTools Performance → Record → FPS chart; or `requestAnimationFrame` delta |
| Firestore reads/writes | Firebase Console → Usage tab; or Firestore emulator logs |
| API latency | `fetch` with `performance.now()` around POST to `/api/boards/[id]/sync` |
| Errors | Console errors, network failures, Firestore permission errors |

---

## 5. Implementation Steps

1. **Extend `multi-user.spec.ts`** to support 5 contexts instead of 2.
2. **Add `tests/e2e/concurrent-grab.spec.ts`** (already exists): 2 users grab and drag the same object within ~1 second; assert LWW, no duplicates, both converge.
3. **Add `tests/e2e/load-5-users.spec.ts`**:
   - 5 contexts load same board
   - Each user performs light edits (add sticky, add rect)
   - Assert: all 5 see each other’s changes within latency threshold
4. **Instrument BoardStage** (or similar) with `data-object-count` and optional `data-last-sync-ts` for assertions.
5. **Optional:** Add `tests/load/k6-sync.js` for API-only load (5 concurrent POSTs to sync route).
6. **Document results** in `docs/load-test-results.md` (template below).

---

## 6. Results Template

```markdown
# Load Test Results: 5 Simultaneous Users

**Date:** YYYY-MM-DD
**Environment:** local / staging / production
**Board ID:** (test board used)

| Scenario | Object Sync (ms) | Cursor Sync (ms) | FPS | Errors |
|----------|------------------|------------------|-----|--------|
| Passive load | — | — | — | — |
| Light edit | — | — | — | — |
| Burst edit | — | — | — | — |
| Sustained (2 min) | — | — | — | — |
| Concurrent grab (2 users, same object) | — | — | — | — |

**Conclusion:** Pass / Degradation observed
**Notes:** (any anomalies, Firestore quota, etc.)
```

---

## 7. Firestore Considerations

- **Free tier:** 50k reads / 20k writes per day
- 5 users × cursor updates (~10/sec) × 2 min ≈ 6,000 writes (presence)
- 5 users × object sync (onSnapshot) = continuous reads
- **Recommendation:** Use Firestore emulator for load tests to avoid quota; validate against real Firestore periodically.

---

## 8. Recommended Execution Order

1. Run baseline (1 user) to establish metrics.
2. Run Scenario 1 (passive) with 5 users.
3. Run Scenario 2 (light edit) with 5 users.
4. Run Scenario 3 (burst) with 5 users.
5. Run Scenario 4 (sustained) if time permits.
6. Run Scenario 5 (concurrent grab): 2 users grab same object within 1 second; verify LWW, no duplicates.
7. Compare against success criteria; document pass/fail.

---

## 9. Quick Start (Manual)

```bash
# 1. Start dev server
npm run dev

# 2. Create a test board, note the ID

# 3. Open 5 tabs to /board/[id], use different auth or incognito

# 4. In each tab: pan, zoom, add shapes, move cursor

# 5. Observe: sync speed, frame drops, console errors
```
