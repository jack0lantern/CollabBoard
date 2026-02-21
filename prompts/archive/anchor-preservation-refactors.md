# Suggested Refactors: Keep Opposite Edge/Corner Anchored During Resize

The opposite corner/edge is still moving during resize. Here are possible causes and refactors to try.

---

## Root Cause Hypotheses

1. **`oldBox` is the previous boundBoxFunc return, not the transform-start box**  
   During a continuous drag, `oldBox` may be our last clamped result. Using it for anchor detection can drift or misidentify which edge moved.

2. **Edge detection threshold (0.5px) is unreliable**  
   With zoom/scale or subpixel movement, `Math.abs(newBox.x - oldBox.x) > 0.5` may misclassify which handle is being dragged.

3. **Konva v6+ flip behavior**  
   When flipping, only one dimension may go negative (e.g. height), so anchor logic may need to handle that case differently.

---

## Refactor 1: Store Anchor Box at Transform Start (Recommended)

**Idea:** Capture the bounding box when the transform starts and use it as the anchor reference instead of `oldBox`.

**Changes:**
- Add `onTransformStart` to each Transformer.
- Store the node’s box in a ref when the transform starts.
- Pass that ref into `boundBoxWithAnchorPreservation` (or a wrapper) so it uses the transform-start box for anchor detection.

```tsx
// In RectShape (and similar for other shapes)
const anchorBoxRef = useRef<TransformBox | null>(null);

<Transformer
  ref={trRef}
  onTransformStart={() => {
    const node = shapeRef.current;
    if (node) {
      const rect = node.getClientRect();
      anchorBoxRef.current = {
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
        rotation: node.rotation(),
      };
    }
  }}
  onTransformEnd={() => {
    anchorBoxRef.current = null;
    // ... existing logic
  }}
  boundBoxFunc={(oldBox, newBox) =>
    boundBoxWithAnchorPreservation(
      anchorBoxRef.current ?? oldBox,  // Use transform-start box when available
      newBox,
      MIN_SIZE,
      MIN_SIZE
    )
  }
/>
```

**Utility change:** `boundBoxWithAnchorPreservation` would use the provided “anchor reference” box for `leftMoved` / `topMoved` and for computing `rightEdge` / `bottomEdge`.

---

## Refactor 2: Infer Anchor from Edge Deltas

**Idea:** Decide which edge is the anchor by comparing how much each edge moved, instead of comparing positions to `oldBox`.

**Logic:**
- Left edge delta: `|newBox.x - oldBox.x|`
- Right edge delta: `|(newBox.x + newBox.width) - (oldBox.x + oldBox.width)|`
- If left delta > right delta → left edge moved more → user dragged left → anchor is right.
- If right delta > left delta → user dragged right → anchor is left.

```ts
// In boundBoxWithAnchorPreservation
const leftDelta = Math.abs(newBox.x - oldBox.x);
const rightDelta = Math.abs(
  (newBox.x + newBox.width) - (oldBox.x + oldBox.width)
);
const leftMoved = leftDelta > rightDelta;

const topDelta = Math.abs(newBox.y - oldBox.y);
const bottomDelta = Math.abs(
  (newBox.y + newBox.height) - (oldBox.y + oldBox.height)
);
const topMoved = topDelta > bottomDelta;
```

---

## Refactor 3: Use Node Position from Ref

**Idea:** Use the node’s current position/size from a ref instead of `oldBox`, so we always compare against the actual shape state.

**Changes:**
- Pass a `getAnchorBox` callback into the utility that reads from the node ref.
- Call it inside `boundBoxFunc` to get the current box.

```ts
// boundBoxFunc receives node context via closure
boundBoxFunc={(oldBox, newBox) => {
  const node = shapeRef.current;
  const anchorBox = node
    ? {
        x: node.x(),
        y: node.y(),
        width: node.width() * (node.scaleX?.() ?? 1),
        height: node.height() * (node.scaleY?.() ?? 1),
        rotation: node.rotation?.() ?? 0,
      }
    : oldBox;
  return boundBoxWithAnchorPreservation(anchorBox, newBox, MIN_SIZE, MIN_SIZE);
}}
```

**Caveat:** During transform, the node may already be scaled/positioned by Konva, so this could be circular. Refactor 1 (transform-start box) is usually more reliable.

---

## Refactor 4: Increase Threshold or Use Relative Threshold

**Idea:** Make edge detection less sensitive to small movements.

```ts
// Option A: Larger fixed threshold (e.g. 2px)
const ANCHOR_THRESHOLD = 2;

// Option B: Relative to box size
const ANCHOR_THRESHOLD = Math.min(oldBox.width, oldBox.height) * 0.02;
```

---

## Refactor 5: Always Anchor One Corner (e.g. Top-Left)

**Idea:** Simplify by always keeping the top-left corner fixed when clamping. This avoids edge detection but changes UX: resizing from the left or top will move the opposite edge.

```ts
// Simpler but different UX
if (width < minWidth) {
  width = Math.max(minWidth, Math.abs(width));
  x = oldBox.x;  // Always keep left edge
}
if (height < minHeight) {
  height = Math.max(minHeight, Math.abs(height));
  y = oldBox.y;  // Always keep top edge
}
```

---

## Recommended Order to Try

1. **Refactor 1** – Store anchor box at transform start.
2. **Refactor 2** – Use edge deltas for anchor detection.
3. **Refactor 4** – Adjust threshold if detection is still flaky.
