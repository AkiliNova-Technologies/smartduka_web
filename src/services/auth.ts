import { auth, googleProvider } from "@/lib/firebase/config";
import {
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  updateProfile,
  User as FirebaseUser,
} from "firebase/auth";

export const authService = {
  /**
   * Sync the Firebase session token with the backend.
   */
  async syncSessionWithBackend(user: FirebaseUser) {
    const idToken = await user.getIdToken();

    const response = await fetch("/api/auth", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${idToken}`,
      },
    });

    if (!response.ok) {
      throw new Error("Failed to synchronize session with SmartDuka server.");
    }

    const data = await response.json();
    return { success: true, user, ...data };
  },

  /**
   * Sync the user profile (name, avatar, phone) to the database.
   * Safe to call multiple times — uses upsert.
   */
  async syncUserProfile(user: FirebaseUser, extraName?: string) {
    const rawName = extraName || user.displayName;
    const safeName =
      rawName && rawName.trim() && !rawName.includes("@") ? rawName.trim() : null;

    try {
      await fetch("/api/auth/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.uid,
          name: safeName,
          email: user.email,
          phone: user.phoneNumber || null,
          avatarUrl: user.photoURL || null,
        }),
      });
    } catch (error) {
      console.error("Failed to sync user profile:", error);
    }
  },

  /**
   * Update the Firebase user's displayName.
   */
  async updateFirebaseProfile(user: FirebaseUser, displayName: string) {
    try {
      await updateProfile(user, { displayName });
    } catch (error) {
      console.error("Failed to update Firebase profile:", error);
    }
  },

  async loginWithGoogle() {
    const result = await signInWithPopup(auth, googleProvider);
    await this.syncUserProfile(result.user);
    return this.syncSessionWithBackend(result.user);
  },

  async loginWithEmail(email: string, pass: string) {
    const result = await signInWithEmailAndPassword(auth, email, pass);
    await this.syncUserProfile(result.user);
    return this.syncSessionWithBackend(result.user);
  },

  async registerWithEmail(email: string, pass: string, displayName: string) {
    const result = await createUserWithEmailAndPassword(auth, email, pass);

    await this.updateFirebaseProfile(result.user, displayName);

    await this.syncUserProfile(result.user, displayName);

    return this.syncSessionWithBackend(result.user);
  },

  async logout() {
    await signOut(auth);
    await fetch("/api/auth", { method: "DELETE" });
  },
};