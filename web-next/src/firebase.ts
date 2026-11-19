import { initializeApp, getApps, type FirebaseOptions } from "firebase/app";
import { getAuth, signInAnonymously } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getDatabase } from "firebase/database";

// Firebase Web config is client-side configuration, not an admin credential.
// These values are copied from the currently working production app.
const garasiConfig: FirebaseOptions = {
  apiKey: "AIzaSyCQbUoc6mVPDz3hAjTiRawAvN2WTNYyNkM",
  authDomain: "garasiku-9580a.firebaseapp.com",
  projectId: "garasiku-9580a",
  storageBucket: "garasiku-9580a.firebasestorage.app",
  messagingSenderId: "854283207354",
  appId: "1:854283207354:web:f836e125e125e8aaaeb883",
};

const index1Config: FirebaseOptions = {
  apiKey: "AIzaSyAi0Ucng_tl7jSC9gZtr0JItCBUtkt-vvU",
  authDomain: "uns-fleet-service.firebaseapp.com",
  databaseURL: "https://uns-fleet-service-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "uns-fleet-service",
  storageBucket: "uns-fleet-service.firebasestorage.app",
  messagingSenderId: "881806830475",
  appId: "1:881806830475:web:8dcf991ec95ae93b625d8e",
};

function namedApp(name: string, config: FirebaseOptions) {
  return getApps().find((item) => item.name === name) ?? initializeApp(config, name);
}

export const garasiApp = namedApp("garasiku-next", garasiConfig);
export const auth = getAuth(garasiApp);
export const db = getFirestore(garasiApp);

export const index1App = namedApp("garasiku-next-index1", index1Config);
export const index1Auth = getAuth(index1App);
export const index1Db = getDatabase(index1App);

const rekapConfig: FirebaseOptions = {
  apiKey: "AIzaSyA3Gtz2w1erDlP_FtTPTHOes1YZoQ56jJU",
  authDomain: "rekaptoll-production.firebaseapp.com",
  databaseURL: "https://rekaptoll-production-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "rekaptoll-production",
  storageBucket: "rekaptoll-production.firebasestorage.app",
  messagingSenderId: "441481183431",
  appId: "1:441481183431:web:d6490b7f1269a6334bfee2",
};
export const rekapApp = namedApp("garasiku-next-rekaptoll", rekapConfig);
export const rekapAuth = getAuth(rekapApp);
export const rekapDb = getDatabase(rekapApp);

export async function connectAnonymousSession(): Promise<void> {
  if (!auth.currentUser) await signInAnonymously(auth);
}

export async function connectIndex1Session(): Promise<void> {
  if (!index1Auth.currentUser) await signInAnonymously(index1Auth);
}

export async function connectRekapSession(): Promise<void> {
  if (!rekapAuth.currentUser) await signInAnonymously(rekapAuth);
}
