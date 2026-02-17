import { initializeApp, getApps, cert, type ServiceAccount } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

function getAdminApp() {
  if (getApps().length > 0) {
    return getApps()[0];
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
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

export async function verifyIdToken(token: string) {
  const app = getAdminApp();
  if (!app) return null;

  try {
    return await getAuth(app).verifyIdToken(token);
  } catch {
    return null;
  }
}
