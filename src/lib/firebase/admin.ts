import { getApps, initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { assertSafeFirebaseAuthEmulator } from "@/lib/firebase/emulator-safety";

function getFirebaseAuth() {
  if (getApps().length > 0) {
    return getAuth();
  }

  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const serverProjectId = process.env.FIREBASE_PROJECT_ID;
  const emulatorHost = process.env.FIREBASE_AUTH_EMULATOR_HOST;
  if (emulatorHost) {
    if (process.env.FIREBASE_CLIENT_EMAIL || process.env.FIREBASE_PRIVATE_KEY) throw new Error("Production Firebase credentials are forbidden in emulator mode.");
    const safe = assertSafeFirebaseAuthEmulator({ host: emulatorHost, projectId: projectId ?? "", serverProjectId });
    const app = initializeApp({ projectId: safe.projectId });
    return getAuth(app);
  }
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  let privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      "Missing Firebase Admin credentials."
    );
  }

  privateKey = privateKey
    .replace(/\\n/g, "\n")
    .replace(/"/g, "")
    .trim();

  const app = initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
  });

  return getAuth(app);
}

export const adminAuth = {
  verifyIdToken: (token: string) => {
    const auth = getFirebaseAuth();
    return auth.verifyIdToken(token);
  },
  getUser: (uid: string) => {
    const auth = getFirebaseAuth();
    return auth.getUser(uid);
  },
  deleteUser: (uid: string) => {
    const auth = getFirebaseAuth();
    return auth.deleteUser(uid);
  },
};
