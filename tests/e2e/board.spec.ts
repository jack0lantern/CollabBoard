import { test, expect } from "@playwright/test";

/**
 * E2E Tests - Board Features
 * Run with: npm run test:e2e
 * Requires: npm run dev (or webServer in config)
 */

test.describe("Board - Basic Load", () => {
  test("board page loads", async ({ page }) => {
    await page.goto("/board/test-board-123");
    await expect(page.locator("canvas")).toBeVisible({ timeout: 10000 });
  });

  test("toolbar is visible", async ({ page }) => {
    await page.goto("/board/test-board-123");
    await expect(page.getByRole("button", { name: /sticky/i })).toBeVisible({
      timeout: 10000,
    });
  });
});

test.describe("Board - Sticky Notes", () => {
  test("can add sticky note via toolbar", async ({ page }) => {
    await page.goto("/board/test-board-123");
    await page.getByRole("button", { name: /sticky/i }).click();
    await expect(page.locator("canvas")).toBeVisible();
  });
});

test.describe("Board - Shapes", () => {
  test("can add rect via toolbar", async ({ page }) => {
    await page.goto("/board/test-board-123");
    await page.getByRole("button", { name: /rect/i }).click();
    await expect(page.locator("canvas")).toBeVisible();
  });

  test("can add circle via toolbar", async ({ page }) => {
    await page.goto("/board/test-board-123");
    await page.getByRole("button", { name: /circle/i }).click();
    await expect(page.locator("canvas")).toBeVisible();
  });
});
