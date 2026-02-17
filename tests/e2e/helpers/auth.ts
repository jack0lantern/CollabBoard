import type { Page } from "@playwright/test";

/**
 * Logs in via the UI using email/password from environment variables.
 *
 * Requires:
 *   E2E_TEST_EMAIL  – Firebase test account email
 *   E2E_TEST_PASSWORD – Firebase test account password
 *
 * Set them in .env.local or pass inline:
 *   E2E_TEST_EMAIL=test@example.com E2E_TEST_PASSWORD=secret npx playwright test
 */
function getUserCredentials(user: 1 | 2) {
  if (user === 1) {
    const email = process.env.E2E_TEST_EMAIL_1 ?? process.env.E2E_TEST_EMAIL;
    const password =
      process.env.E2E_TEST_PASSWORD_1 ?? process.env.E2E_TEST_PASSWORD;
    return { email, password };
  }

  const email = process.env.E2E_TEST_EMAIL_2;
  const password = process.env.E2E_TEST_PASSWORD_2;
  return { email, password };
}

export async function login(page: Page, user: 1 | 2 = 1) {
  const { email, password } = getUserCredentials(user);

  if (!email || !password) {
    throw new Error(
      user === 1
        ? "Primary test user missing. Set E2E_TEST_EMAIL_1/E2E_TEST_PASSWORD_1 or E2E_TEST_EMAIL/E2E_TEST_PASSWORD."
        : "Secondary test user missing. Set E2E_TEST_EMAIL_2 and E2E_TEST_PASSWORD_2."
    );
  }

  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();

  // Wait for redirect to dashboard (login success).
  try {
    await page.waitForURL("**/dashboard", { timeout: 15000 });
  } catch {
    const authError = await page
      .locator("p.text-sm.text-red-600, p.text-sm.text-red-400")
      .first()
      .textContent()
      .catch(() => null);
    throw new Error(
      authError?.trim()
        ? `Login failed for test user ${user}: ${authError.trim()}`
        : `Login failed for test user ${user}: no dashboard redirect after sign in.`
    );
  }
}

export async function getAuthSession(page: Page): Promise<{
  token: string;
  uid: string;
  email: string | null;
}> {
  return page.evaluate(async () => {
    const { getAuth } = await import("firebase/auth");
    const { getApps } = await import("firebase/app");
    const apps = getApps();
    if (apps.length === 0) throw new Error("No Firebase app initialized");
    const auth = getAuth(apps[0]);
    const user = auth.currentUser;
    if (!user) throw new Error("No authenticated user in browser session");
    const token = await user.getIdToken();
    return { token, uid: user.uid, email: user.email };
  });
}
