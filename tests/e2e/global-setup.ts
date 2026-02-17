/**
 * Playwright global setup: validates E2E test user credentials before any tests run.
 * Fails fast with a clear message if credentials are missing or invalid.
 *
 * Uses Firebase Auth REST API (no browser or dev server required).
 */

import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../../.env.local") });

const FIREBASE_AUTH_URL =
  "https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword";

function getCredentials(user: 1 | 2): { email: string; password: string } {
  if (user === 1) {
    const email =
      process.env.E2E_TEST_EMAIL_1 ?? process.env.E2E_TEST_EMAIL ?? "";
    const password =
      process.env.E2E_TEST_PASSWORD_1 ?? process.env.E2E_TEST_PASSWORD ?? "";
    return { email, password };
  }
  const email = process.env.E2E_TEST_EMAIL_2 ?? "";
  const password = process.env.E2E_TEST_PASSWORD_2 ?? "";
  return { email, password };
}

async function validateUser(
  user: 1 | 2,
  apiKey: string
): Promise<{ ok: boolean; error?: string }> {
  const { email, password } = getCredentials(user);

  if (!email || !password) {
    return {
      ok: false,
      error:
        user === 1
          ? "Primary user missing. Set E2E_TEST_EMAIL_1/E2E_TEST_PASSWORD_1 or E2E_TEST_EMAIL/E2E_TEST_PASSWORD."
          : "Secondary user missing. Set E2E_TEST_EMAIL_2 and E2E_TEST_PASSWORD_2.",
    };
  }

  const res = await fetch(
    `${FIREBASE_AUTH_URL}?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        password,
        returnSecureToken: true,
      }),
    }
  );

  const data = (await res.json()) as {
    error?: { message?: string; code?: number };
    idToken?: string;
  };

  if (!res.ok || data.error) {
    const msg = data.error?.message ?? `HTTP ${res.status}`;
    return { ok: false, error: msg };
  }

  return { ok: true };
}

export default async function globalSetup() {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  if (!apiKey) {
    throw new Error(
      "NEXT_PUBLIC_FIREBASE_API_KEY is required for E2E credential validation. " +
        "Add it to .env.local (from Firebase Console > Project Settings)."
    );
  }

  const [user1, user2] = await Promise.all([
    validateUser(1, apiKey),
    validateUser(2, apiKey),
  ]);

  const errors: string[] = [];
  if (!user1.ok) errors.push(`User 1: ${user1.error}`);
  if (!user2.ok) errors.push(`User 2: ${user2.error}`);

  if (errors.length > 0) {
    throw new Error(
      "E2E test credentials failed validation. Fix .env.local and retry.\n\n" +
        errors.join("\n") +
        "\n\nEnsure both users exist in Firebase Auth (Authentication > Users)."
    );
  }

  console.log("[global-setup] E2E credentials validated for both test users.");
}
