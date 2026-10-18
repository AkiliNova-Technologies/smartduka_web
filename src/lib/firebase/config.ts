import { initializeApp, getApps, getApp } from "firebase/app";
import { connectAuthEmulator, getAuth, GoogleAuthProvider } from "firebase/auth";
import { assertSafeFirebaseAuthEmulator } from "@/lib/firebase/emulator-safety";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);
const emulatorHost = process.env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST;
if (emulatorHost) {
  const safe = assertSafeFirebaseAuthEmulator({ host: emulatorHost, projectId: firebaseConfig.projectId ?? "" });
  if (!auth.emulatorConfig) connectAuthEmulator(auth, `http://${safe.host}`, { disableWarnings: true });
}
export const googleProvider = new GoogleAuthProvider();

export { app };
