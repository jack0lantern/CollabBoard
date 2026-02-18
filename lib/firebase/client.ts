import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import { getDatabase, connectDatabaseEmulator, type Database } from "firebase/database";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
};

const USE_EMULATOR = process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === "true";

const emulatorConnected = { auth: false, database: false };

export function getFirebaseApp(): FirebaseApp | null {
  if (getApps().length > 0) {
    return getApps()[0] as FirebaseApp;
  }
  if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
    return null;
  }
  return initializeApp(firebaseConfig);
}

export function getFirebaseAuth() {
  const app = getFirebaseApp();
  if (!app) return null;
  const auth = getAuth(app);
  if (USE_EMULATOR && !emulatorConnected.auth) {
    connectAuthEmulator(auth, "http://localhost:9099", { disableWarnings: true });
    emulatorConnected.auth = true;
  }
  return auth;
}

export function getRealtimeDb(): Database | null {
  const app = getFirebaseApp();
  if (!app) return null;
  if (!firebaseConfig.databaseURL && !USE_EMULATOR) return null;
  const db = getDatabase(app);
  if (USE_EMULATOR && !emulatorConnected.database) {
    connectDatabaseEmulator(db, "localhost", 9009);
    emulatorConnected.database = true;
  }
  return db;
}
