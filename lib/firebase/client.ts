import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import { getDatabase, connectDatabaseEmulator, type Database } from "firebase/database";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
};

const USE_EMULATOR = process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === "true";

const emulatorConnected = { auth: false, firestore: false, database: false };

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

export function getFirestoreDb() {
  const app = getFirebaseApp();
  if (!app) return null;
  const db = getFirestore(app);
  if (USE_EMULATOR && !emulatorConnected.firestore) {
    connectFirestoreEmulator(db, "localhost", 8080);
    emulatorConnected.firestore = true;
  }
  return db;
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
