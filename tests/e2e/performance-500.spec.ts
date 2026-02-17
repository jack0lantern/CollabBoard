import { test, expect } from "@playwright/test";

/**
 * E2E - Performance with 500 Objects (Firebase Emulator)
 *
 * Self-contained test that:
 *   1. Creates a test user in the Auth emulator
 *   2. Creates a temporary board + seeds 500 objects via the Firestore emulator
 *   3. Logs in via the UI, navigates to the board
 *   4. Measures click and drag latency
 *
 * Prerequisites:
 *   - Firebase emulators running: firebase emulators:start
 *   - Dev server with emulator flag: NEXT_PUBLIC_USE_FIREBASE_EMULATOR=true npm run dev
 *
 * Run:
 *   NEXT_PUBLIC_USE_FIREBASE_EMULATOR=true \
 *     npx playwright test tests/e2e/performance-500.spec.ts --project=chromium --workers=1
 */

const PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "colabboard-6fecd";
const API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "fake-api-key";

const AUTH_EMULATOR = "http://localhost:9099";
const FIRESTORE_EMULATOR = "http://localhost:8080";
const FIRESTORE_BASE = `${FIRESTORE_EMULATOR}/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

const OBJECT_COUNT = 500;
const MAX_CLICK_LATENCY_MS = 150;
const MAX_DRAG_LATENCY_MS = 300;

const TEST_EMAIL = "perftest@example.com";
const TEST_PASSWORD = "testpassword123";

const COLORS = ["#fef08a", "#3b82f6", "#10b981", "#6b7280"];
const SHAPE_TYPES: Array<"sticky" | "rect" | "circle" | "line"> = [
  "sticky",
  "rect",
  "circle",
  "line",
];
const SHAPE_DISTRIBUTION = { sticky: 200, rect: 150, circle: 100, line: 50 };

// ---------------------------------------------------------------------------
// Object generation (deterministic positions for reliable click targets)
// ---------------------------------------------------------------------------

function generateObjects() {
  const objects: Array<Record<string, unknown>> = [];

  const cols = 20;
  const cellW = 200;
  const cellH = 120;
  let idx = 0;
  let typeIdx = 0;
  let typeCount = 0;
  let currentType: (typeof SHAPE_TYPES)[number] = SHAPE_TYPES[0];
  let currentMax = SHAPE_DISTRIBUTION[currentType];

  for (let i = 0; i < OBJECT_COUNT; i++) {
    const col = idx % cols;
    const row = Math.floor(idx / cols);
    const x = col * cellW + ((i * 7) % (cellW - 80)) + 20;
    const y = row * cellH + ((i * 11) % (cellH - 60)) + 20;

    const obj: Record<string, unknown> = {
      id: `perf-obj-${i}`,
      type: currentType,
      x,
      y,
      zIndex: i,
      color: COLORS[typeIdx % COLORS.length],
    };

    switch (currentType) {
      case "sticky":
        obj.width = 150;
        obj.height = 100;
        obj.text = `Note ${i}`;
        break;
      case "rect":
        obj.width = 100;
        obj.height = 80;
        break;
      case "circle":
        obj.radius = 40;
        obj.radiusX = 40;
        obj.radiusY = 40;
        break;
      case "line":
        obj.points = [0, 0, 100, 60];
        break;
    }

    objects.push(obj);
    idx++;
    typeCount++;
    if (typeCount >= currentMax && typeIdx < SHAPE_TYPES.length - 1) {
      typeIdx++;
      currentType = SHAPE_TYPES[typeIdx];
      currentMax = SHAPE_DISTRIBUTION[currentType];
      typeCount = 0;
    }
  }

  return objects;
}

// ---------------------------------------------------------------------------
// Auth emulator helpers
// ---------------------------------------------------------------------------

async function createEmulatorUser(): Promise<{ idToken: string; uid: string }> {
  // Sign up a test user in the Auth emulator
  const signUpRes = await fetch(
    `${AUTH_EMULATOR}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=${API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
        returnSecureToken: true,
      }),
    }
  );

  if (signUpRes.ok) {
    const data = (await signUpRes.json()) as { idToken: string; localId: string };
    return { idToken: data.idToken, uid: data.localId };
  }

  // User may already exist from a previous run; sign in instead
  const signInRes = await fetch(
    `${AUTH_EMULATOR}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
        returnSecureToken: true,
      }),
    }
  );

  if (!signInRes.ok) {
    const body = await signInRes.text();
    throw new Error(`Auth emulator sign-in failed (${signInRes.status}): ${body}`);
  }

  const data = (await signInRes.json()) as { idToken: string; localId: string };
  return { idToken: data.idToken, uid: data.localId };
}

// ---------------------------------------------------------------------------
// Firestore emulator helpers
// ---------------------------------------------------------------------------

function toFirestoreValue(v: unknown): Record<string, unknown> {
  if (v === null || v === undefined) return { nullValue: null };
  if (typeof v === "string") return { stringValue: v };
  if (typeof v === "boolean") return { booleanValue: v };
  if (typeof v === "number") {
    return Number.isInteger(v)
      ? { integerValue: String(v) }
      : { doubleValue: v };
  }
  if (Array.isArray(v)) {
    return { arrayValue: { values: v.map(toFirestoreValue) } };
  }
  if (typeof v === "object") {
    const fields: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(v as Record<string, unknown>)) {
      fields[key] = toFirestoreValue(val);
    }
    return { mapValue: { fields } };
  }
  return { stringValue: String(v) };
}

function toFields(obj: Record<string, unknown>) {
  const fields: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(obj)) {
    if (val !== undefined) {
      fields[key] = toFirestoreValue(val);
    }
  }
  return fields;
}

async function firestoreCommit(
  token: string,
  writes: Array<Record<string, unknown>>
) {
  const res = await fetch(`${FIRESTORE_BASE}:commit`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ writes }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Firestore commit failed (${res.status}): ${body}`);
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test.describe("Performance 500 Objects (Emulator)", () => {
  let boardId: string;

  test.beforeAll(async () => {
    // 1. Create / sign in test user via Auth emulator
    const { idToken, uid } = await createEmulatorUser();

    // 2. Create a temporary board
    boardId = `perf-test-500-${Date.now()}`;
    const boardFields = toFields({
      title: "Perf Test 500",
      owner_id: uid,
      created_at: new Date().toISOString(),
      last_snapshot: null,
      is_public: false,
    });

    const createRes = await fetch(`${FIRESTORE_BASE}/boards/${boardId}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${idToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ fields: boardFields }),
    });
    if (!createRes.ok) {
      const body = await createRes.text();
      throw new Error(`Board creation failed (${createRes.status}): ${body}`);
    }

    // 3. Seed 500 objects in a single batch commit
    const objects = generateObjects();
    const writes = objects.map((obj) => ({
      update: {
        name: `projects/${PROJECT_ID}/databases/(default)/documents/boards/${boardId}/objects/${obj.id}`,
        fields: toFields(obj),
      },
    }));
    await firestoreCommit(idToken, writes);

    console.log(
      `[perf-500] Seeded board ${boardId} with ${objects.length} objects (emulator)`
    );
  });

  test.beforeEach(async ({ page }) => {
    // Log in via the UI (app is connected to Auth emulator)
    await page.goto("/login");
    await page.getByLabel("Email").fill(TEST_EMAIL);
    await page.getByLabel("Password").fill(TEST_PASSWORD);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await page.waitForURL("**/dashboard", { timeout: 15000 });

    await page.goto(`/board/${boardId}`);
    await expect(page.locator("canvas")).toBeVisible({ timeout: 15000 });
  });

  test("board loads 500 objects", async ({ page }) => {
    const stageEl = page.getByTestId("board-stage");

    await expect
      .poll(
        async () => {
          const count = await stageEl.getAttribute("data-object-count");
          return parseInt(count ?? "0", 10);
        },
        { timeout: 30000 }
      )
      .toBe(OBJECT_COUNT);
  });

  test("click selection latency within threshold @ 500 objects", async ({
    page,
  }) => {
    const stageEl = page.getByTestId("board-stage");

    // Wait for all objects to load
    await expect
      .poll(
        async () => {
          const count = await stageEl.getAttribute("data-object-count");
          return parseInt(count ?? "0", 10);
        },
        { timeout: 30000 }
      )
      .toBe(OBJECT_COUNT);

    // First object (perf-obj-0): sticky at (20, 20) with 150x100
    // Click center: (20 + 75, 20 + 50) = (95, 70)
    const canvas = page.locator("canvas").first();
    const box = await canvas.boundingBox();
    if (!box) throw new Error("Canvas not found");

    const clickX = box.x + 95;
    const clickY = box.y + 70;

    const t0 = Date.now();
    await page.mouse.click(clickX, clickY);

    await expect
      .poll(
        async () => {
          const selectedId = await stageEl.getAttribute("data-selected-id");
          return selectedId !== "" && selectedId != null;
        },
        { timeout: 10000 }
      )
      .toBe(true);

    const t1 = Date.now();
    const latencyMs = t1 - t0;

    console.log(`[perf-500] Click selection latency: ${latencyMs}ms`);

    expect(
      latencyMs,
      `Click selection latency ${latencyMs}ms exceeds max ${MAX_CLICK_LATENCY_MS}ms @ 500 objects`
    ).toBeLessThan(MAX_CLICK_LATENCY_MS);
  });

  test("drag end latency within threshold @ 500 objects", async ({ page }) => {
    const stageEl = page.getByTestId("board-stage");

    await expect
      .poll(
        async () => {
          const count = await stageEl.getAttribute("data-object-count");
          return parseInt(count ?? "0", 10);
        },
        { timeout: 30000 }
      )
      .toBe(OBJECT_COUNT);

    const lastDragEndBefore = await stageEl.getAttribute("data-last-drag-end");

    const canvas = page.locator("canvas").first();
    const box = await canvas.boundingBox();
    if (!box) throw new Error("Canvas not found");

    // Same target: center of first sticky at (95, 70)
    const shapeX = box.x + 95;
    const shapeY = box.y + 70;

    const t0 = Date.now();
    await page.mouse.move(shapeX, shapeY);
    await page.mouse.down();
    await page.mouse.move(shapeX + 40, shapeY + 40, { steps: 5 });
    await page.mouse.up();

    await expect
      .poll(
        async () => {
          const val = await stageEl.getAttribute("data-last-drag-end");
          return val !== lastDragEndBefore && val !== "" && val !== "0";
        },
        { timeout: 10000 }
      )
      .toBe(true);

    const t1 = Date.now();
    const latencyMs = t1 - t0;

    console.log(`[perf-500] Drag end latency: ${latencyMs}ms`);

    expect(
      latencyMs,
      `Drag end latency ${latencyMs}ms exceeds max ${MAX_DRAG_LATENCY_MS}ms @ 500 objects`
    ).toBeLessThan(MAX_DRAG_LATENCY_MS);
  });
});
