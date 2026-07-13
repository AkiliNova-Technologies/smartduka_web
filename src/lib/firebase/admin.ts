import { getApps, initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

function getFirebaseAuth() {
  if (getApps().length > 0) {
    return getAuth();
  }

  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
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
};