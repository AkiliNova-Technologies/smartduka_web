"use client";

import { useEffect, useState, useCallback } from "react";
import { auth } from "@/lib/firebase/config";
import { onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import { authService } from "@/services/auth";

export function useAuth() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<boolean>(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);

      if (firebaseUser) {
        authService.syncUserProfile(firebaseUser);
      }
    });

    return () => unsubscribe();
  }, []);

  const loginWithEmail = useCallback(async (email: string, pass: string) => {
    setActionLoading(true);
    try {
      return await authService.loginWithEmail(email, pass);
    } finally {
      setActionLoading(false);
    }
  }, []);

  const registerWithEmail = useCallback(
    async (email: string, pass: string, displayName: string) => {
      setActionLoading(true);
      try {
        return await authService.registerWithEmail(email, pass, displayName);
      } finally {
        setActionLoading(false);
      }
    },
    []
  );

  const loginWithGoogle = useCallback(async () => {
    setActionLoading(true);
    try {
      return await authService.loginWithGoogle();
    } finally {
      setActionLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    setActionLoading(true);
    try {
      await authService.logout();
    } finally {
      setActionLoading(false);
    }
  }, []);

  return {
    user,
    loading,
    actionLoading,
    isAuthenticated: !!user,
    uid: user?.uid || null,
    email: user?.email || null,
    loginWithEmail,
    registerWithEmail,
    loginWithGoogle,
    logout,
  };
}