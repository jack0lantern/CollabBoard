import { test, expect } from "@playwright/test";
import { login, getAuthSession } from "./helpers/auth";
import { createTestBoard, deleteBoardDoc } from "./helpers/firestore";

/**
 * E2E Tests - Click and Drag Latency
 *
 * Measures responsiveness of click (selection) and drag interactions.
 * Fails when latency exceeds thresholds.
 *
 * Run: npx playwright test tests/e2e/click-drag-latency.spec.ts --project=chromium
 */

const MAX_CLICK_LATENCY_MS = 150;
const MAX_DRAG_LATENCY_MS = 300;

test.describe("Click and Drag Latency", () => {
  let boardId = "";
  let ownerToken = "";

  test.beforeEach(async ({ page }) => {
    await login(page, 1);
    const session = await getAuthSession(page);
    ownerToken = session.token;
    boardId = await createTestBoard({
      token: ownerToken,
      ownerUid: session.uid,
      titlePrefix: "click-drag-latency",
    });
    await page.goto(`/board/${boardId}`);
    await expect(page.locator("canvas")).toBeVisible({ timeout: 10000 });
  });

  test.afterEach(async () => {
    if (boardId && ownerToken) {
      await deleteBoardDoc({ token: ownerToken, boardId });
    }
  });

  test("click selection latency is within acceptable threshold", async ({
    page,
  }) => {
    // Add a rect
    await page.getByRole("button", { name: /add rectangle/i }).click();
    await page.waitForTimeout(1500);

    const stageEl = page.getByTestId("board-stage");
    await expect(stageEl).toBeVisible();

    // Rect is placed at ~150,150 with size 100x80; center ~200,190
    const canvas = page.locator("canvas").first();
    const box = await canvas.boundingBox();
    if (!box) throw new Error("Canvas not found");

    const rectCenterX = box.x + 200;
    const rectCenterY = box.y + 190;

    const t0 = Date.now();
    await page.mouse.click(rectCenterX, rectCenterY);

    // Poll until selection appears
    await expect
      .poll(
        async () => {
          const selectedId = await stageEl.getAttribute("data-selected-id");
          return selectedId !== "" && selectedId != null;
        },
        { timeout: 5000 }
      )
      .toBe(true);

    const t1 = Date.now();
    const latencyMs = t1 - t0;

    expect(
      latencyMs,
      `Click selection latency ${latencyMs}ms exceeds maximum ${MAX_CLICK_LATENCY_MS}ms`
    ).toBeLessThan(MAX_CLICK_LATENCY_MS);
  });

  test("drag end latency is within acceptable threshold", async ({ page }) => {
    // Add a rect
    await page.getByRole("button", { name: /add rectangle/i }).click();
    await page.waitForTimeout(1500);

    const stageEl = page.getByTestId("board-stage");
    await expect(stageEl).toBeVisible();

    const lastDragEndBefore = await stageEl.getAttribute("data-last-drag-end");

    const canvas = page.locator("canvas").first();
    const box = await canvas.boundingBox();
    if (!box) throw new Error("Canvas not found");

    const rectCenterX = box.x + 200;
    const rectCenterY = box.y + 190;

    const t0 = Date.now();
    await page.mouse.move(rectCenterX, rectCenterY);
    await page.mouse.down();
    await page.mouse.move(rectCenterX + 50, rectCenterY + 50);
    await page.mouse.up();

    // Poll until drag end is processed (data-last-drag-end changes)
    await expect
      .poll(
        async () => {
          const lastDragEndAfter = await stageEl.getAttribute(
            "data-last-drag-end"
          );
          return lastDragEndAfter !== lastDragEndBefore && lastDragEndAfter !== "";
        },
        { timeout: 5000 }
      )
      .toBe(true);

    const t1 = Date.now();
    const latencyMs = t1 - t0;

    expect(
      latencyMs,
      `Drag end latency ${latencyMs}ms exceeds maximum ${MAX_DRAG_LATENCY_MS}ms`
    ).toBeLessThan(MAX_DRAG_LATENCY_MS);
  });
});
