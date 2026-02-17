import { test, expect } from "@playwright/test";

/**
 * E2E Tests - Shape Dragging
 * Verifies that left-click dragging a shape moves only that shape,
 * not the canvas/stage. (Previously, the bug caused all shapes to move
 * because the Stage was capturing the drag.)
 */

test.describe("Shape Drag - Stage Isolation", () => {
  test("left-click drag on shape does not move the canvas", async ({
    page,
  }) => {
    await page.goto("/board/test-board-123");

    await expect(page.locator("canvas")).toBeVisible({ timeout: 10000 });

    // Add a rect (placed at 150,150 with size 100x80)
    await page.getByRole("button", { name: /rect/i }).click();

    // Wait for shape to render and Firestore sync
    await page.waitForTimeout(1500);

    const stageEl = page.getByTestId("board-stage");
    await expect(stageEl).toBeVisible();

    // Record stage position before drag (should be 0,0 initially)
    const stageXBefore = await stageEl.getAttribute("data-stage-x");
    const stageYBefore = await stageEl.getAttribute("data-stage-y");

    // Get canvas to compute click position - rect center is at (200, 190) in stage coords
    const canvas = page.locator("canvas").first();
    const box = await canvas.boundingBox();
    if (!box) throw new Error("Canvas not found");

    const rectCenterX = box.x + 200;
    const rectCenterY = box.y + 190;

    // Left-click drag: mousedown -> move -> mouseup
    await page.mouse.move(rectCenterX, rectCenterY);
    await page.mouse.down();
    await page.mouse.move(rectCenterX + 50, rectCenterY + 50);
    await page.mouse.up();

    // Stage position must be unchanged (canvas did not pan)
    const stageXAfter = await stageEl.getAttribute("data-stage-x");
    const stageYAfter = await stageEl.getAttribute("data-stage-y");

    expect(stageXAfter).toBe(stageXBefore);
    expect(stageYAfter).toBe(stageYBefore);
  });
});
