import { test, expect, type Page } from "@playwright/test";
import { login, getAuthSession } from "./helpers/auth";
import { createTestBoard, deleteBoardDoc } from "./helpers/firestore";

/**
 * E2E Test - Concurrent Object Grab (2 Users, Same Second)
 *
 * Verifies behavior when 2 users grab and drag the same object within ~1 second.
 * Expected: Last-write-wins (LWW); both clients converge to same final position;
 * no duplicate objects; no crashes.
 *
 * Run: npx playwright test tests/e2e/concurrent-grab.spec.ts --project=chromium
 *
 * Requires:
 *   E2E_TEST_EMAIL and E2E_TEST_PASSWORD set in .env.local or as env vars.
 *   The test account must have access to BOARD_ID (owner or shared).
 */

const SYNC_WAIT_MS = 5000;

async function getRectCenter(page: Page) {
  const canvas = page.locator("canvas").first();
  const box = await canvas.boundingBox();
  if (!box) throw new Error("Canvas not found");
  return { x: box.x + 200, y: box.y + 190 };
}

test.describe("Concurrent Grab - 2 Users Same Object", () => {
  let boardId = "";
  let ownerToken = "";

  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    await login(page, 1);
    const session = await getAuthSession(page);
    ownerToken = session.token;
    boardId = await createTestBoard({
      token: ownerToken,
      ownerUid: session.uid,
      titlePrefix: "concurrent-grab",
    });
    await page.close();
  });

  test.afterAll(async () => {
    if (boardId && ownerToken) {
      await deleteBoardDoc({ token: ownerToken, boardId });
    }
  });

  test("two users grabbing same object within 1 second: LWW, no duplicates, both converge", async ({
    browser,
  }) => {
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();

    const [p1, p2] = await Promise.all([
      context1.newPage(),
      context2.newPage(),
    ]);

    // Both users log in
    await Promise.all([login(p1, 1), login(p2, 2)]);

    // Navigate to the same board
    await Promise.all([
      p1.goto(`/board/${boardId}`),
      p2.goto(`/board/${boardId}`),
    ]);

    const stage1 = p1.getByTestId("board-stage");
    const stage2 = p2.getByTestId("board-stage");

    await expect(stage1).toBeVisible({ timeout: 15000 });
    await expect(stage2).toBeVisible({ timeout: 15000 });

    // User 1 adds a rect
    await p1.getByRole("button", { name: /add rectangle/i }).click();

    // Both wait for the rect to appear (sync)
    await expect
      .poll(
        async () => {
          const c1 = await stage1.getAttribute("data-object-count");
          const c2 = await stage2.getAttribute("data-object-count");
          return (
            parseInt(c1 ?? "0", 10) >= 1 && parseInt(c2 ?? "0", 10) >= 1
          );
        },
        { timeout: 10000 }
      )
      .toBe(true);

    const center1 = await getRectCenter(p1);
    const center2 = await getRectCenter(p2);

    // Both users grab and drag the same object within ~1 second (concurrent)
    const dragA = async () => {
      await p1.mouse.move(center1.x, center1.y);
      await p1.mouse.down();
      await p1.mouse.move(center1.x + 50, center1.y + 50);
      await p1.mouse.up();
    };

    const dragB = async () => {
      await p2.mouse.move(center2.x, center2.y);
      await p2.mouse.down();
      await p2.mouse.move(center2.x + 100, center2.y + 10);
      await p2.mouse.up();
    };

    await Promise.all([dragA(), dragB()]);

    // Poll until both clients converge to same position (LWW)
    await expect
      .poll(
        async () => {
          const x1 = await stage1.getAttribute("data-first-object-x");
          const y1 = await stage1.getAttribute("data-first-object-y");
          const x2 = await stage2.getAttribute("data-first-object-x");
          const y2 = await stage2.getAttribute("data-first-object-y");
          return (
            x1 != null &&
            x2 != null &&
            y1 != null &&
            y2 != null &&
            x1 !== "" &&
            y1 !== "" &&
            x1 === x2 &&
            y1 === y2
          );
        },
        { timeout: SYNC_WAIT_MS }
      )
      .toBe(true);

    const count1 = parseInt(
      (await stage1.getAttribute("data-object-count")) ?? "0",
      10
    );
    const count2 = parseInt(
      (await stage2.getAttribute("data-object-count")) ?? "0",
      10
    );
    const x1 = await stage1.getAttribute("data-first-object-x");
    const y1 = await stage1.getAttribute("data-first-object-y");
    const x2 = await stage2.getAttribute("data-first-object-x");
    const y2 = await stage2.getAttribute("data-first-object-y");

    await context1.close();
    await context2.close();

    // No duplicate objects
    expect(count1, "Object count should remain 1 on User 1").toBe(1);
    expect(count2, "Object count should remain 1 on User 2").toBe(1);

    // LWW: both clients converged to same position
    expect(
      x1 === x2 && y1 === y2,
      `Both clients should show same final position (LWW). User1: (${x1},${y1}) User2: (${x2},${y2})`
    ).toBe(true);
  });
});
