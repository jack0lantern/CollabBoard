import { test, expect } from "@playwright/test";

/**
 * Sync Latency E2E Test
 *
 * Measures the time between when one user modifies an object (adds a sticky note)
 * and when another user sees that change via Firestore real-time sync.
 *
 * Fails when latency exceeds MAX_SYNC_LATENCY_MS (2 seconds).
 * Run: npx playwright test tests/e2e/sync-latency.spec.ts --project=chromium
 *
 * Requires: Both browser contexts must be authenticated and have access to the board.
 * Use a board ID that exists in your Firebase project (e.g. create one via the app).
 */

const MAX_SYNC_LATENCY_MS = 100;
const BOARD_ID = "test-board-123";

test.describe("Sync Latency - Multi-User Object Propagation", () => {
  test("other user sees object modification within acceptable latency", async ({
    browser,
  }) => {
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();

    const page1 = await context1.newPage();
    const page2 = await context2.newPage();

    // Both users load the same board
    await Promise.all([
      page1.goto(`/board/${BOARD_ID}`),
      page2.goto(`/board/${BOARD_ID}`),
    ]);

    // Wait for both to have the canvas loaded (board exists and user has access)
    const stage1 = page1.getByTestId("board-stage");
    const stage2 = page2.getByTestId("board-stage");

    await expect(stage1).toBeVisible({ timeout: 15000 });
    await expect(stage2).toBeVisible({ timeout: 15000 });

    // Get initial object count on User 2's view
    const countBefore = await stage2.getAttribute("data-object-count");
    const initialCount = countBefore ? parseInt(countBefore, 10) : 0;

    // User 1 adds a sticky note - record time at modification
    const t0 = Date.now();
    await page1.getByRole("button", { name: /sticky/i }).click();

    // User 2 waits for the new object to appear (Firestore sync)
    await expect
      .poll(
        async () => {
          const count = await stage2.getAttribute("data-object-count");
          return parseInt(count ?? "0", 10);
        },
        { timeout: 15000 }
      )
      .toBeGreaterThan(initialCount);

    const t1 = Date.now();
    const latencyMs = t1 - t0;

    await context1.close();
    await context2.close();

    expect(
      latencyMs,
      `Sync latency ${latencyMs}ms exceeds maximum ${MAX_SYNC_LATENCY_MS}ms. ` +
        `Other users should see changes within ${MAX_SYNC_LATENCY_MS}ms for good collaborative UX.`
    ).toBeLessThan(MAX_SYNC_LATENCY_MS);
  });
});
