import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getDatabase, connectDatabaseEmulator, type Database } from "firebase/database";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
};

const USE_EMULATOR = process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === "true";

const emulatorConnected = { database: false };

export function getFirebaseApp(): FirebaseApp | null {
  if (getApps().length > 0) {
    return getApps()[0] as FirebaseApp;
  }
  if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
    return null;
  }
  return initializeApp(firebaseConfig);
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
