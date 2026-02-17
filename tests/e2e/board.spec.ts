import { test, expect } from "@playwright/test";
import { login, getAuthSession } from "./helpers/auth";
import { createTestBoard, deleteBoardDoc } from "./helpers/firestore";

/**
 * E2E Tests - Board Features
 * Run with: npm run test:e2e
 * Requires: npm run dev (or webServer in config)
 */

test.describe("Board - Basic Load", () => {
  let boardId = "";
  let ownerToken = "";

  test.beforeEach(async ({ page }) => {
    await login(page, 1);
    const session = await getAuthSession(page);
    ownerToken = session.token;
    boardId = await createTestBoard({
      token: ownerToken,
      ownerUid: session.uid,
      titlePrefix: "board-basic",
    });
    await page.goto(`/board/${boardId}`);
    await expect(page.locator("canvas")).toBeVisible({ timeout: 10000 });
  });

  test.afterEach(async () => {
    if (boardId && ownerToken) {
      await deleteBoardDoc({ token: ownerToken, boardId });
    }
  });

  test("board page loads", async ({ page }) => {
    await expect(page.locator("canvas")).toBeVisible({ timeout: 10000 });
  });

  test("toolbar is visible", async ({ page }) => {
    await expect(
      page.getByRole("button", { name: /add sticky note/i })
    ).toBeVisible({ timeout: 10000 });
  });
});

test.describe("Board - Sticky Notes", () => {
  let boardId = "";
  let ownerToken = "";

  test.beforeEach(async ({ page }) => {
    await login(page, 1);
    const session = await getAuthSession(page);
    ownerToken = session.token;
    boardId = await createTestBoard({
      token: ownerToken,
      ownerUid: session.uid,
      titlePrefix: "board-sticky",
    });
    await page.goto(`/board/${boardId}`);
    await expect(page.locator("canvas")).toBeVisible({ timeout: 10000 });
  });

  test.afterEach(async () => {
    if (boardId && ownerToken) {
      await deleteBoardDoc({ token: ownerToken, boardId });
    }
  });

  test("can add sticky note via toolbar", async ({ page }) => {
    await page.getByRole("button", { name: /add sticky note/i }).click();
    await expect(page.locator("canvas")).toBeVisible();
  });
});

test.describe("Board - Shapes", () => {
  let boardId = "";
  let ownerToken = "";

  test.beforeEach(async ({ page }) => {
    await login(page, 1);
    const session = await getAuthSession(page);
    ownerToken = session.token;
    boardId = await createTestBoard({
      token: ownerToken,
      ownerUid: session.uid,
      titlePrefix: "board-shapes",
    });
    await page.goto(`/board/${boardId}`);
    await expect(page.locator("canvas")).toBeVisible({ timeout: 10000 });
  });

  test.afterEach(async () => {
    if (boardId && ownerToken) {
      await deleteBoardDoc({ token: ownerToken, boardId });
    }
  });

  test("can add rect via toolbar", async ({ page }) => {
    await page.getByRole("button", { name: /add rectangle/i }).click();
    await expect(page.locator("canvas")).toBeVisible();
  });

  test("can add circle via toolbar", async ({ page }) => {
    await page.getByRole("button", { name: /add circle/i }).click();
    await expect(page.locator("canvas")).toBeVisible();
  });
});
