import type { ServiceAccount } from "firebase-admin/app";
import type { Auth } from "firebase-admin/auth";

let adminAuthInstance: Auth | null = null;

async function getFirebaseAuth(): Promise<Auth> {
  if (adminAuthInstance) return adminAuthInstance;

  // Dynamic import — avoids bundling firebase-admin at build time,
  // which prevents the jose/jwks-rsa ESM conflict on Vercel
  const { getApps, initializeApp, cert } = await import("firebase-admin/app");
  const { getAuth } = await import("firebase-admin/auth");

  if (getApps().length > 0) {
    adminAuthInstance = getAuth();
    return adminAuthInstance;
  }

  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  let privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      "Missing Firebase Admin credentials. Ensure NEXT_PUBLIC_FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY are set."
    );
  }

  privateKey = privateKey
    .replace(/\\n/g, "\n")
    .replace(/"/g, "")
    .trim();

  if (!privateKey.includes("-----BEGIN PRIVATE KEY-----")) {
    throw new Error(
      "FIREBASE_PRIVATE_KEY is not in valid PEM format."
    );
  }

  const app = initializeApp({
    credential: cert({
      projectId,
      clientEmail,
      privateKey,
    } as ServiceAccount),
  });

  adminAuthInstance = getAuth(app);
  return adminAuthInstance;
}

// Export a proxy that lazily initializes
export const adminAuth = {
  verifyIdToken: async (token: string) => {
    const auth = await getFirebaseAuth();
    return auth.verifyIdToken(token);
  },
  getUser: async (uid: string) => {
    const auth = await getFirebaseAuth();
    return auth.getUser(uid);
  },
};