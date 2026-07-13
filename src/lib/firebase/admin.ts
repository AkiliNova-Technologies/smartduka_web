import { getApps, initializeApp, cert, App } from "firebase-admin/app";
import { getAuth, Auth } from "firebase-admin/auth";

function getFirebaseAuth(): Auth {
  if (getApps().length > 0) {
    return getAuth();
  }

  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  let privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      "Missing Firebase Admin credentials. Ensure NEXT_PUBLIC_FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY are set in Vercel environment variables."
    );
  }

  privateKey = privateKey
    .replace(/\\n/g, "\n")
    .replace(/\n/g, "\n")      
    .replace(/"/g, "")
    .trim();

  // Validate PEM format
  if (!privateKey.includes("-----BEGIN PRIVATE KEY-----")) {
    throw new Error(
      "FIREBASE_PRIVATE_KEY is missing the PEM header. On Vercel, paste the key with real line breaks (no quotes, no \\n)."
    );
  }

  let app: App;
  try {
    app = initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    });
  } catch (error) {
    console.error("Firebase Admin initialization failed:", error);
    throw new Error(
      `Firebase Admin SDK failed: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }

  return getAuth(app);
}

export const adminAuth = getFirebaseAuth();