import { test, expect } from "@playwright/test";

/**
 * E2E Multi-User Tests
 * Scenario: 2 users editing simultaneously in different browsers
 * Run: npx playwright test tests/e2e/multi-user.spec.ts --project=chromium
 * For full 2-browser test, use multiple contexts.
 */

test.describe("Multi-User - 2 Users Simultaneous Edit", () => {
  test("two browser contexts can load same board", async ({ browser }) => {
    const roomId = `test-${Date.now()}`;
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();

    const page1 = await context1.newPage();
    const page2 = await context2.newPage();

    await page1.goto(`/board/${roomId}`);
    await page2.goto(`/board/${roomId}`);

    await expect(page1.locator("canvas")).toBeVisible({ timeout: 10000 });
    await expect(page2.locator("canvas")).toBeVisible({ timeout: 10000 });

    await context1.close();
    await context2.close();
  });
});
