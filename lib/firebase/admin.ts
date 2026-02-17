import { initializeApp, getApps, cert, type ServiceAccount } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

function getAdminApp() {
  if (getApps().length > 0) {
    return getApps()[0];
  }

  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey) {
    return null;
  }

  return initializeApp({
    credential: cert({
      projectId,
      clientEmail,
      privateKey,
    } as ServiceAccount),
  });
}

export function getDb() {
  const app = getAdminApp();
  return app ? getFirestore(app as any) : null;
}

/**
 * Verify Firebase ID token. Uses Admin SDK when configured, otherwise
 * Firebase Auth REST API with API key (same credentials as client).
 */
export async function verifyIdToken(
  token: string
): Promise<{ uid: string } | null> {
  const app = getAdminApp();
  if (app) {
    try {
      return await getAuth(app).verifyIdToken(token);
    } catch {
      return null;
    }
  }

  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  if (!apiKey) return null;

  try {
    const res = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken: token }),
      }
    );
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error("[verifyIdToken] REST API failed:", res.status, body);
      return null;
    }
    const data = (await res.json()) as { users?: { localId: string }[] };
    const uid = data.users?.[0]?.localId;
    return uid ? { uid } : null;
  } catch (err) {
    console.error("[verifyIdToken] fetch error:", err);
    return null;
  }
}
