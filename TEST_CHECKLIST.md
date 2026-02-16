# CollabBoard Test Checklist

Manual and automated verification for all feature requirements.

---

## Board Features

| Feature | Requirement | Status | Test |
|---------|-------------|--------|------|
| **Workspace** | Infinite board with smooth pan/zoom | ⬜ | E2E: pan/zoom canvas |
| **Sticky Notes** | Create, edit text, change colors | ⬜ | Unit: types. E2E: add sticky |
| **Shapes** | Rectangles, circles, lines with solid colors | ⬜ | Unit: types. E2E: add rect, circle |
| **Connectors** | Lines/arrows connecting objects | ⬜ | Not implemented |
| **Text** | Standalone text elements | ⬜ | Not implemented |
| **Frames** | Group and organize content areas | ⬜ | Not implemented |
| **Transforms** | Move, resize, rotate objects | ⬜ | Unit: drag updates. E2E: drag shape |
| **Selection** | Single and multi-select (shift-click, drag-to-select) | ⬜ | Not implemented |
| **Operations** | Delete, duplicate, copy/paste | ⬜ | Integration: delete, duplicate, copy/paste logic |

---

## Real-Time Collaboration

| Feature | Requirement | Status | Test |
|---------|-------------|--------|------|
| **Cursors** | Multiplayer cursors with names, real-time movement | ⬜ | E2E: 2 users, cursor visibility |
| **Sync** | Object creation/modification appears instantly for all users | ⬜ | E2E: User A adds, User B sees |
| **Presence** | Clear indication of who's currently on the board | ⬜ | E2E: UserList shows others |
| **Conflicts** | Handle simultaneous edits (LWW documented) | ⬜ | Integration: conflict-resolution.test.ts |
| **Resilience** | Graceful disconnect/reconnect handling | ⬜ | E2E: network throttling |
| **Persistence** | Board state survives all users leaving and returning | ⬜ | E2E: refresh mid-edit |

---

## Testing Scenarios

| Scenario | Description | How to Test |
|----------|-------------|-------------|
| **1. 2 users editing** | Different browsers, simultaneous edit | `tests/e2e/multi-user.spec.ts` |
| **2. Refresh mid-edit** | One user refreshes, state persists | Manual: add shape, refresh, verify |
| **3. Rapid creation** | Sticky notes and shapes, sync performance | Manual: rapid clicks, check both clients |
| **4. Network throttling** | Disconnection recovery | Chrome DevTools → Network → Slow 3G |
| **5. 5+ concurrent users** | No degradation | Manual: 5 browser tabs/windows |

---

## Performance Targets

| Metric | Target | How to Verify |
|--------|--------|---------------|
| **Frame rate** | 60 FPS during pan, zoom, object manipulation | Chrome DevTools → Performance → Record |
| **Object sync latency** | <100ms | Liveblocks dashboard / custom timing |
| **Cursor sync latency** | <50ms | Visual check or timing instrumentation |
| **Object capacity** | 500+ objects without drops | Script: add 500 shapes, measure FPS |
| **Concurrent users** | 5+ without degradation | 5 tabs, all editing |

---

## Running Tests

```bash
# Unit + integration tests
npm run test

# Single run (CI)
npm run test:run

# E2E tests (starts dev server)
npm run test:e2e
```

---

## Conflict Resolution Approach

**Documented approach: Last-Write-Wins (LWW)**

- Liveblocks uses CRDTs; concurrent edits to **different properties** are merged.
- Concurrent edits to the **same property** resolve via last-write-wins.
- For MVP this is acceptable. Future: consider operational transforms for text.
