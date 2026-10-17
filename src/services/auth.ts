import { auth, googleProvider } from "@/lib/firebase/config";
import {
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  updateProfile,
  User as FirebaseUser,
} from "firebase/auth";
import { getErrorMessage } from "@/lib/api-utils";

const sessionSyncs = new Map<string, Promise<Record<string, unknown>>>();

// ==========================================
// TYPES
// ==========================================

export interface AuthResult {
  success: boolean;
  user: FirebaseUser;
  serverSession?: Record<string, unknown>;
}

// ==========================================
// AUTH SERVICE
// ==========================================

export class AuthService {
  /**
   * Sync the Firebase session token with the backend.
   */
  static async syncSessionWithBackend(
    user: FirebaseUser
  ): Promise<Record<string, unknown>> {
    const existing = sessionSyncs.get(user.uid);
    if (existing) return existing;
    const sync = (async () => {
      const idToken = await user.getIdToken();

      const response = await fetch("/api/auth", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(
          body.error || "Failed to synchronize session with Mwezora server."
        );
      }

      return response.json();
    })();
    sessionSyncs.set(user.uid, sync);
    void sync.finally(() => sessionSyncs.delete(user.uid)).catch(() => {});
    return sync;
  }

  /**
   * Sync the user profile (name, avatar, phone) to the database.
   * Safe to call multiple times — uses upsert.
   * Throws on failure so callers can handle it.
   */
  static async syncUserProfile(
    user: FirebaseUser,
    extraName?: string
  ): Promise<void> {
    const idToken = await user.getIdToken();
    const rawName = extraName || user.displayName;
    const safeName =
      rawName && rawName.trim() && !rawName.includes("@")
        ? rawName.trim()
        : null;

    const response = await fetch("/api/auth/sync", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({
        userId: user.uid,
        name: safeName,
        email: user.email,
        phone: user.phoneNumber || null,
        avatarUrl: user.photoURL || null,
      }),
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error(body.error || "Failed to sync user profile.");
    }
  }

  /**
   * Update the Firebase user's displayName.
   */
  static async updateFirebaseProfile(
    user: FirebaseUser,
    displayName: string
  ): Promise<void> {
    await updateProfile(user, { displayName });
  }

  /**
   * Login with Google
   */
  static async loginWithGoogle(): Promise<AuthResult> {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const sessionData = await this.syncSessionWithBackend(result.user);
      return { success: true, user: result.user, serverSession: sessionData };
    } catch (error: unknown) {
      console.error("[AuthService.loginWithGoogle]", error);
      throw new Error(getErrorMessage(error));
    }
  }

  /**
   * Login with Email/Password
   */
  static async loginWithEmail(
    email: string,
    pass: string
  ): Promise<AuthResult> {
    try {
      const result = await signInWithEmailAndPassword(auth, email, pass);
      const sessionData = await this.syncSessionWithBackend(result.user);
      return { success: true, user: result.user, serverSession: sessionData };
    } catch (error: unknown) {
      console.error("[AuthService.loginWithEmail]", error);
      throw new Error(getErrorMessage(error));
    }
  }

  /**
   * Register with Email/Password
   */
  static async registerWithEmail(
    email: string,
    pass: string,
    displayName: string
  ): Promise<AuthResult> {
    try {
      const result = await createUserWithEmailAndPassword(auth, email, pass);
      await this.updateFirebaseProfile(result.user, displayName);
      const sessionData = await this.syncSessionWithBackend(result.user);
      return { success: true, user: result.user, serverSession: sessionData };
    } catch (error: unknown) {
      console.error("[AuthService.registerWithEmail]", error);
      throw new Error(getErrorMessage(error));
    }
  }

  /**
   * Logout
   */
  static async logout(): Promise<void> {
    try {
      // Revoke server-side ownership before clearing the authenticated cookie.
      // The browser subscription may remain, but it cannot deliver the prior
      // account's private notifications after logout or account switching.
      await fetch("/api/v1/push/subscription", { method: "DELETE", headers: { "content-type": "application/json" }, body: "{}" }).catch(() => undefined);
      await signOut(auth);
      await fetch("/api/auth", { method: "DELETE" });
    } catch (error: unknown) {
      console.error("[AuthService.logout]", error);
      throw new Error(getErrorMessage(error));
    }
  }
}
