# Miro-Style Frames Implementation Prompt

## What Are Frames in Miro?

**Frames** in Miro are container objects that add structure to board content. They act as sections or topics and serve as an underlayer for other objects placed on top of them.

### Key Characteristics

1. **Visual containers** – Rectangular regions with a border and optional title/heading. Default color is white; customizable size, color, and aspect ratio.

2. **Non-constraining** – Objects placed on top of frames retain their native behavior. Frames do not constrain object movement or editing; they are purely organizational.

3. **Creation methods:**
   - Drag-and-drop from toolbar
   - Press `F` hotkey and click on the board
   - Click and drag to draw a frame directly
   - Select existing objects → context menu → "Create frame" (auto-fits frame around selection)

4. **Core behaviors:**
   - **Move/resize** – Drag border or title; resize via handles
   - **Rename** – Double-click heading or use context menu
   - **Group, lock, duplicate** – Same as other objects
   - **Presentation mode** – Frames become slides; navigate with arrows
   - **Export** – Export single frame or selection of frames as PDF
   - **Share link** – Copy link to a specific frame for focused sharing

5. **Advanced features (optional for MVP):**
   - **Hide/reveal** – Hide frame content during workshops; show placeholder with eye icon
   - **Frames panel** – Sidebar to list, reorder, and jump between frames
   - **Organize frames** – Auto-sort frames left-to-right, top-to-bottom
   - **Copy/paste between frames** – Paste content into destination frame(s) with relative positioning

---

## Implementation Prompt for CollabBoard

Implement Miro-style **frames** in CollabBoard. Frames are rectangular container shapes that organize board content into sections. Objects can be placed on top of frames; frames do not constrain object behavior—they are visual/organizational only.

### Phase 1: Data Model & Basic Shape

1. **Extend `ShapeType`** in `types/board.ts`:
   - Add `"frame"` to the union type.

2. **Frame-specific fields** on `ObjectData` (or a `FrameData` subtype):
   - `title?: string` – Optional frame heading (displayed at top of frame).
   - `frameColor?: string` – Background/fill color (default: white or transparent).
   - `strokeColor`, `strokeWidth` – Border styling (reuse existing if present).

3. **Create `FrameShape` component** (similar to `RectShape`):
   - Renders a rectangle with optional title bar at the top.
   - Draggable, resizable via Transformer.
   - Uses Konva `Rect` + `Text` for title.
   - Register in `ShapeRenderer` for `type === "frame"`.

4. **Add frame to `ShapeToolbar`** – Allow inserting frames from the toolbar (or a dedicated frame tool).

### Phase 2: Frame Creation UX

5. **Creation methods:**
   - **Toolbar** – Frame button adds a default-sized frame at a sensible position (e.g., center or near cursor).
   - **Hotkey** – `F` key creates a frame (similar to Miro).
   - **Context menu** – When multiple objects are selected, add "Create frame" that:
     - Computes bounding box of selection (with padding).
     - Creates a frame that encompasses the selection.
     - Does *not* reparent objects; they remain siblings. Frame is just a visual container.

6. **Frame defaults:**
   - Default size: e.g., 400×300 or 600×400.
   - Default color: white or light gray.
   - Default title: "Frame" or empty.

### Phase 3: Z-Order & Layering

7. **Z-order behavior:**
   - Frames should render *behind* objects that are "inside" them (i.e., objects whose bounding box overlaps the frame).
   - Simplest approach: frames render in z-order like any other shape. User can use "Bring to front" / "Send to back" to adjust.
   - Optional: auto-place new frames at a lower z-index so they tend to sit behind content.

8. **No parent-child relationship** – Objects are *not* children of frames in the data model. Frame is a sibling; containment is visual/spatial only. This keeps the implementation simple and matches Miro’s "underlayer" behavior.

### Phase 4: Presentation Mode (Optional)

9. **Presentation mode:**
   - Add a "Present" button (e.g., in `BoardHeader`).
   - When active: full-screen view, hide tools, show frames as slides.
   - Navigate between frames with arrow keys or on-screen arrows.
   - "Focus frame" – Fit viewport to selected frame.

### Phase 5: Export & Sharing (Optional)

10. **Export frame(s):**
    - Context menu: "Export frame" → export visible frame area as image/PDF.
    - Filter by frame when exporting selection.

11. **Frame-specific link:**
    - "Copy link to frame" in context menu → URL with `#frameId` or query param to scroll/focus that frame on load.

### Technical Notes

- **Konva** – Use `Rect` for frame body, `Text` for title. Apply `listening` appropriately so clicks on empty frame area select the frame.
- **Transformer** – Reuse existing `MultiSelectTransformer`; ensure frames are included in `nodes` for multi-select and transform.
- **Bounding box** – Use `getObjectBoundingBox` from `lib/utils/boundingBox.ts` for frame rect (same as `RectShape`).
- **Database** – Add `frame` to any `ShapeType` enum/constraint in Supabase migrations if applicable.
- **Tests** – Add unit tests for frame creation, resize, and "Create frame from selection" logic.

### Out of Scope (Future)

- Tables and Kanban boards (different container types).
- Grid layout within frames.
- Hide/reveal frames.
- Frames panel sidebar.

---

## Summary

Frames are rectangular containers that organize board content. They are drawn like rectangles, support a title, and can be created via toolbar, hotkey, or "Create frame" from selection. Objects remain independent; frames are visual underlayers only. Implement in phases: data model + basic shape → creation UX → z-order → optional presentation and export.
