# Prompt: Make Shapes Selectable and Resizable

Use this prompt to implement selection and resize for canvas shapes in CollabBoard.

---

## Context

CollabBoard is a collaborative whiteboard built with:
- **Next.js** (App Router) + **React-Konva** + **Firebase** (Firestore for real-time sync)
- Shapes: `StickyNote`, `RectShape`, `CircleShape`, `LineShape` in `components/canvas/shapes/`
- Board state: `useBoardObjects()` and `useBoardMutations()` from `hooks/`
- `ObjectData` type in `types/board.ts` has: `id`, `type`, `x`, `y`, `width`, `height`, `radius`, `points`, `color`, `text`, `zIndex`, `rotation`
- Shapes are already draggable; `onSelect` currently only calls `bringToFront`

---

## Requirements

### 1. Selection

- **Single select**: Click a shape to select it. Only one shape selected at a time (unless multi-select is enabled).
- **Visual feedback**: Selected shapes show a clear selection indicator (e.g. dashed stroke, highlight border, or resize handles).
- **Deselect**: Click on empty canvas area to deselect.
- **Multi-select** (optional): Shift+click to add/remove from selection; drag a rectangle on the canvas to select all shapes inside.
- **Selection state**: Store selected shape IDs (e.g. in a `useSelection` hook or React context) so it can be shared with `ShapeRenderer`, `BoardStage`, and any properties panel.

### 2. Resize

- **Resize handles**: When a shape is selected, show resize handles (e.g. 8 corner/edge handles for rects, or appropriate handles for circles/lines).
- **Resize by dragging**: Drag a handle to resize. Update `width`/`height` for rects and stickies, `radius` for circles, `points` for lines.
- **Preserve aspect ratio** (optional): Hold Shift while resizing rects/circles to maintain aspect ratio.
- **Minimum size**: Enforce minimum dimensions (e.g. 20px) so shapes don’t collapse.
- **Sync to Firestore**: Call `updateObject(id, { width, height })` (or `radius`, `points`) on resize end so changes persist and sync.

### 3. Interaction Rules

- **Pan/zoom**: Middle-click or right-click drag still pans the stage. Don’t start selection or resize on those.
- **Z-order**: Selection box and resize handles should render on top (e.g. last in the Layer). See `reqs.md` Z-Index note.
- **Coordinates**: Use stage-relative coordinates. `stage.getPointerPosition()` and inverse transform for board coords when needed.
- **Conflict handling**: Keep last-write-wins; document in README if needed.

---

## Implementation Hints

1. **Selection hook**: Create `useSelection()` returning `{ selectedIds: string[], select, deselect, toggle, selectAll, clearSelection }`. Optionally support multi-select via `addToSelection(id)`, `removeFromSelection(id)`.
2. **Selection box**: Render a `Rect` with `dash` stroke around the selected shape’s bounding box. Use `shape.getClientRect()` or compute from `x`, `y`, `width`, `height` (or `radius` for circles).
3. **Resize handles**: Use Konva `Rect` or `Circle` nodes as handles. On `onDragMove`, compute new `width`/`height` from handle position; on `onDragEnd`, call `updateObject`.
4. **Transformer**: Consider Konva’s built-in `Transformer` component—it provides resize and rotate handles. Wrap the selected shape in a `Group` and attach a `Transformer` to it.
5. **ShapeRenderer**: Pass `isSelected` and `onSelect` into each shape. Use `e.evt.stopPropagation()` on shape `onMouseDown` so the stage doesn’t receive the click (for deselect-on-canvas-click).
6. **Stage click**: On `handleStageMouseDown`, if the click hit the stage (not a shape), call `clearSelection()`.

---

## Files to Modify/Create

| File | Action |
|------|--------|
| `hooks/useSelection.ts` | Create – selection state and actions |
| `components/canvas/SelectionOverlay.tsx` | Create – selection box + resize handles or Transformer |
| `components/canvas/BoardStage.tsx` | Modify – wire selection, stage click to deselect |
| `components/canvas/shapes/ShapeRenderer.tsx` | Modify – pass `isSelected`, handle `onSelect` |
| `components/canvas/shapes/*.tsx` | Modify – accept `isSelected`, show selection stroke when selected |
| `components/providers/RealtimeBoardProvider.tsx` | Optional – provide selection context if needed |

---

## Acceptance Criteria

- [ ] Click a shape selects it and shows a selection indicator
- [ ] Click empty canvas deselects
- [ ] Selected rect/sticky can be resized via handles; new size persists and syncs
- [ ] Selected circle can be resized via radius handle
- [ ] Selected line can be resized (endpoints or overall scale)
- [ ] Pan/zoom (middle/right drag) still works
- [ ] No regression in drag-to-move for shapes
