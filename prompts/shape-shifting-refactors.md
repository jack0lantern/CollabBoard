# Suggested Refactors: Fix Shape Shifting Past Minimum Size

Shapes still shift when resizing past minimum width/height. Here are refactors to try.

---

## Root Cause Hypotheses

1. **anchorBoxRef from first oldBox is wrong** – The first `oldBox` in `boundBoxFunc` may not be the true transform-start box. It could be from the Transformer’s internal state in a different coordinate space.

2. **Edge detection is unreliable** – `Math.abs(newBox.x - ref.x) > 0.5` can misclassify which handle is dragged (zoom, subpixel, or rotated coordinates).

3. **oldBox vs anchorBox drift** – When `anchorBoxRef` is set from the first `oldBox`, that `oldBox` might already be modified or in a different space than the node.

---

## Refactor 1: Capture Box at onTransformStart (Recommended)

**Idea:** Use `onTransformStart` to capture the node’s box when the user first touches a handle, before any transform is applied.

**Changes:**
- Add `onTransformStart` to each Transformer.
- Read the node’s box from the node itself (e.g. `getClientRect` or `x()/y()/width()/height()`).
- Store it in `anchorBoxRef` and use it in `boundBoxFunc`.

```tsx
<Transformer
  onTransformStart={() => {
    const node = shapeRef.current;
    if (node) {
      const rect = node.getClientRect({ relativeTo: node.getLayer() });
      anchorBoxRef.current = {
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
        rotation: node.rotation(),
      };
    }
  }}
  boundBoxFunc={(oldBox, newBox) =>
    boundBoxWithAnchorPreservation(
      oldBox,
      newBox,
      MIN_SIZE,
      MIN_SIZE,
      anchorBoxRef.current
    )
  }
/>
```

**Note:** For Rect, `node.x(), node.y(), node.width(), node.height()` may be simpler. For Group/Ellipse, `getClientRect` is needed.

---

## Refactor 2: Use Edge Deltas for Anchor Detection

**Idea:** Infer the anchor from which edge moved less, instead of comparing to a reference position.

**Logic:**
- Left delta: `|newBox.x - ref.x|`
- Right delta: `|(newBox.x + newBox.width) - (ref.x + ref.width)|`
- If left delta > right delta → left edge moved more → anchor is right.
- If right delta ≥ left delta → anchor is left.

```ts
const leftDelta = Math.abs(newBox.x - ref.x);
const rightDelta = Math.abs(
  (newBox.x + newBox.width) - (ref.x + ref.width)
);
const leftMoved = leftDelta > rightDelta;
```

---

## Refactor 3: Reject Resize When Below Min (No Flip)

**Idea:** When the new box would go below minimum, return `oldBox` so the shape does not change. No flip, no shift.

```ts
if (newBox.width < minWidth || newBox.height < minHeight || 
    newBox.width < 0 || newBox.height < 0) {
  return oldBox;
}
return newBox;
```

**Trade-off:** The shape cannot be resized below minimum or flipped. It “sticks” at the current size.

---

## Refactor 4: Increase or Relative Threshold

**Idea:** Make edge detection less sensitive to small movements.

```ts
const ANCHOR_THRESHOLD = 2;
// or
const ANCHOR_THRESHOLD = Math.min(ref.width, ref.height) * 0.02;
```

---

## Refactor 5: Use Transformer’s Attached Node in boundBoxFunc

**Idea:** In `boundBoxFunc`, get the attached node from the Transformer and read its current box. Use that as the anchor reference.

**Caveat:** During transform, the node may already be scaled/positioned by Konva, so this can be circular. Safer to use `onTransformStart`.

---

## Recommended Order

1. **Refactor 1** – `onTransformStart` to capture the real transform-start box.
2. **Refactor 2** – Edge deltas for anchor detection.
3. **Refactor 1 + 2** – Use both for best reliability.
