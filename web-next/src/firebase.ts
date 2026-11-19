import { initializeApp, getApps, type FirebaseOptions } from "firebase/app";
import { getAuth, signInAnonymously } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const required = (key: string): string => {
  const value = import.meta.env[key] as string | undefined;
  if (!value) throw new Error(`Konfigurasi Firebase belum diisi: ${key}`);
  return value;
};

const config: FirebaseOptions = {
  apiKey: required("VITE_FIREBASE_API_KEY"),
  authDomain: required("VITE_FIREBASE_AUTH_DOMAIN"),
  projectId: required("VITE_FIREBASE_PROJECT_ID"),
  appId: required("VITE_FIREBASE_APP_ID"),
};

if (config.projectId !== "garasiku-9580a") {
  throw new Error("GarasiKu Next hanya boleh diarahkan ke project Firebase GarasiKu yang telah ditetapkan.");
}

const app = getApps().find((item) => item.name === "garasiku-next")
  ?? initializeApp(config, "garasiku-next");

export const auth = getAuth(app);
export const db = getFirestore(app);

export async function connectAnonymousSession(): Promise<void> {
  if (!auth.currentUser) await signInAnonymously(auth);
}
