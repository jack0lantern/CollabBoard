# Prompt: Right-Click Context Menu on Canvas Objects

Use this prompt to implement a context menu on right-click for canvas shapes in CollabBoard.

---

## Context

CollabBoard is a collaborative whiteboard built with:
- **Next.js** (App Router) + **React-Konva** + **Firebase** (Firestore for real-time sync)
- Shapes: `StickyNote`, `RectShape`, `CircleShape`, `LineShape` in `components/canvas/shapes/`
- Board state: `useBoardObjects()` and `useBoardMutations()` from `hooks/`
- `ObjectData` type in `types/board.ts` has: `id`, `type`, `x`, `y`, `width`, `height`, `radius`, `points`, `color`, `text`, `zIndex`, `rotation`
- Mutations: `updateObject(id, updates)`, `deleteObject(id)`, `addObject(object)`
- Selection: `useSelection()` with `selectedIds`, `select`, `deselect`, `clearSelection`
- `bringToFront(id)` exists in `BoardStage`; z-order uses `zIndex` on each object

---

## Requirements

### 1. Trigger

- **Right-click on a shape**: Show context menu at cursor position. Select the shape if not already selected.
- **Right-click on empty canvas**: Show a different menu (e.g. paste, add shape) or no menu.
- **Prevent default**: Call `e.evt.preventDefault()` to avoid the browser’s native context menu.
- **Dismiss**: Click outside the menu, press Escape, or choose an action to close the menu.

### 2. Z-Order Operations

| Action        | Behavior                                                                 |
|---------------|---------------------------------------------------------------------------|
| Bring to front| Set `zIndex` to `max(all zIndex) + 1`                                     |
| Send to back  | Set `zIndex` to `min(all zIndex) - 1`                                    |
| Bring forward | Increment `zIndex` by 1 (or swap with next object above)                 |
| Send backward | Decrement `zIndex` by 1 (or swap with next object below)                 |

- For multi-selection: apply to all selected shapes as a group (e.g. bring all to front together).
- Use `updateObject(id, { zIndex })` to persist changes.

### 3. Other Operations

| Action   | Behavior                                                                 |
|----------|---------------------------------------------------------------------------|
| Delete   | Call `deleteObject(id)` for each selected shape; clear selection         |
| Duplicate| For each selected shape, `addObject({ ...shape, id: newId, x: x+20, y: y+20, zIndex: nextZ })`; select the new shape(s) |
| Copy     | (Optional) Store selected shape(s) in clipboard (state or `navigator.clipboard`); useful with Paste |
| Paste    | (Optional) If clipboard has shapes, add them at cursor or center; select new shapes |

### 4. Menu UI

- **Position**: Render at pointer coordinates (e.g. `position: fixed` or Konva overlay). Account for viewport edges so the menu doesn’t overflow.
- **Styling**: Simple list of actions; match app theme (light/dark). Use icons + labels for clarity.
- **Keyboard**: Support Escape to close. Optional: number keys or arrow keys for quick selection.
- **Accessibility**: Use `role="menu"`, `role="menuitem"`, proper focus management, and `aria-label` where needed.

---

## Implementation Hints

1. **Context menu component**: Create `components/ui/ContextMenu.tsx` (or `components/canvas/ContextMenu.tsx`). Props: `x`, `y`, `visible`, `onClose`, `items: { label, icon?, onClick }[]`, `targetIds?: string[]`.
2. **Event handling**: On shape `onContextMenu`, call `e.evt.preventDefault()`, `select(id)` if not selected, then open menu at `e.evt.clientX`, `e.evt.clientY`. Use a portal (e.g. `createPortal`) so the menu renders above the canvas.
3. **Z-order helpers**: Create `lib/utils/zorder.ts` with `bringToFront(objects, id)`, `sendToBack(...)`, `bringForward(...)`, `sendBackward(...)` that compute new `zIndex` and return updates. Then call `updateObject` for each affected shape.
4. **Stage right-click**: Currently right-click drag may pan the stage. Decide: (a) right-click on shape shows menu and does not pan, or (b) require a modifier. Typically: right-click on shape = menu; right-click on empty = optionally canvas-level menu or no-op.
5. **Multi-select**: If multiple shapes selected, show “Bring to front (3 shapes)” style labels. Apply the operation to all selected IDs.

---

## Files to Modify/Create

| File | Action |
|------|--------|
| `components/ui/ContextMenu.tsx` | Create – reusable context menu (position, items, close on outside click/Escape) |
| `lib/utils/zorder.ts` | Create – z-order helpers (bringToFront, sendToBack, bringForward, sendBackward) |
| `components/canvas/BoardStage.tsx` | Modify – wire `onContextMenu` on shapes, manage menu visibility and position |
| `components/canvas/shapes/ShapeRenderer.tsx` | Modify – pass `onContextMenu` to each shape |
| `components/canvas/shapes/*.tsx` | Modify – add `onContextMenu` handler, call `preventDefault` |
| `hooks/useBoardMutations.ts` | No change – already has `updateObject`, `deleteObject`, `addObject` |

---

## Acceptance Criteria

- [ ] Right-click on a shape opens a context menu at the cursor
- [ ] Browser default context menu is suppressed on shapes
- [ ] Z-order: Bring to front, Send to back, Bring forward, Send backward work and persist
- [ ] Delete removes the shape and clears selection
- [ ] Duplicate creates a copy offset from the original and selects it
- [ ] Menu closes on outside click or Escape
- [ ] Multi-selected shapes: operations apply to all selected
- [ ] Pan/zoom (middle-click or right-drag on empty canvas) still works
