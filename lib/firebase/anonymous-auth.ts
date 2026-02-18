import { signInAnonymously } from "firebase/auth";
import { getFirebaseAuth } from "./client";

export async function ensureAnonymousAuth(): Promise<string | null> {
  const auth = getFirebaseAuth();
  if (!auth) return null;

  if (auth.currentUser) {
    return auth.currentUser.uid;
  }

  const { user } = await signInAnonymously(auth);
  return user.uid;
}
