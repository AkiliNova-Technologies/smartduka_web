import { getApps, initializeApp, cert, type App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getMessaging, type Message } from "firebase-admin/messaging";
import { assertSafeFirebaseAuthEmulator } from "@/lib/firebase/emulator-safety";

function getFirebaseApp(): App {
  if (getApps().length > 0) {
    return getApps()[0]!;
  }

  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const serverProjectId = process.env.FIREBASE_PROJECT_ID;
  const emulatorHost = process.env.FIREBASE_AUTH_EMULATOR_HOST;
  if (emulatorHost) {
    if (process.env.FIREBASE_CLIENT_EMAIL || process.env.FIREBASE_PRIVATE_KEY) throw new Error("Production Firebase credentials are forbidden in emulator mode.");
    const safe = assertSafeFirebaseAuthEmulator({ host: emulatorHost, projectId: projectId ?? "", serverProjectId });
    const app = initializeApp({ projectId: safe.projectId });
    return app;
  }
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  let privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (!projectId || !serverProjectId || !clientEmail || !privateKey) {
    throw new Error(
      "Missing Firebase Admin credentials."
    );
  }
  if (projectId !== serverProjectId) {
    throw new Error("Firebase client and server project IDs do not match.");
  }

  privateKey = privateKey
    .replace(/\\n/g, "\n")
    .replace(/"/g, "")
    .trim();

  const app = initializeApp({
    credential: cert({ projectId: serverProjectId, clientEmail, privateKey }),
  });

  return app;
}

function getFirebaseAuth() {
  return getAuth(getFirebaseApp());
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

export const adminMessaging = {
  send: (message: Message) => getMessaging(getFirebaseApp()).send(message),
};
