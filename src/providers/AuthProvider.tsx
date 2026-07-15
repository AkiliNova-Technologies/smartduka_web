"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
  ReactNode,
} from "react";
import { auth } from "@/lib/firebase/config";
import { onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import { AuthService } from "@/services/auth";

// ==========================================
// TYPES
// ==========================================

export interface AuthResult {
  success: boolean;
  user: FirebaseUser;
  serverSession?: Record<string, unknown>;
}

interface AuthContextType {
  user: FirebaseUser | null;
  loading: boolean;
  actionLoading: boolean;
  isAuthenticated: boolean;
  uid: string | null;
  email: string | null;
  userRole: string | null;
  loginWithEmail: (email: string, pass: string) => Promise<AuthResult>;
  registerWithEmail: (
    email: string,
    pass: string,
    displayName: string
  ) => Promise<AuthResult>;
  loginWithGoogle: () => Promise<AuthResult>;
  logout: () => Promise<void>;
}

// ==========================================
// HELPERS
// ==========================================

/**
 * Extract platform role from session data.
 * The /api/auth endpoint returns { user: { platformRole } } or similar.
 */
function extractRole(sessionData: Record<string, unknown> | undefined): string | null {
  if (!sessionData) return null;

  // Check common response shapes
  const user = sessionData.user as Record<string, unknown> | undefined;
  if (user?.platformRole) return user.platformRole as string;
  if (user?.role) return user.role as string;

  // Direct platformRole field
  if (sessionData.platformRole) return sessionData.platformRole as string;

  return null;
}

// ==========================================
// CONTEXT
// ==========================================

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ==========================================
// PROVIDER
// ==========================================

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      return sessionStorage.getItem("userRole");
    }
    return null;
  });

  // Sync guards
  const isSyncing = useRef(false);
  const hasSynced = useRef(false);

  // ==========================================
  // FIREBASE AUTH STATE LISTENER
  // ==========================================

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);

      if (firebaseUser) {
        // Sync profile and session only once per session
        if (!hasSynced.current && !isSyncing.current) {
          isSyncing.current = true;

          try {
            // Sync user profile first
            await AuthService.syncUserProfile(firebaseUser);

            // Then sync session and extract role
            const sessionData = await AuthService.syncSessionWithBackend(firebaseUser);
            const role = extractRole(sessionData);

            if (role) {
              setUserRole(role);
              sessionStorage.setItem("userRole", role);
            }

            hasSynced.current = true;
          } catch (error) {
            console.error("[AuthProvider] Sync failed:", error);
          } finally {
            isSyncing.current = false;
          }
        }

        setLoading(false);
      } else {
        // User signed out
        setUserRole(null);
        sessionStorage.removeItem("userRole");
        setLoading(false);
        hasSynced.current = false;
      }
    });

    return () => unsubscribe();
  }, []);

  // ==========================================
  // AUTH ACTIONS
  // ==========================================

  const handleAuthAction = useCallback(
    async (action: () => Promise<{ success: boolean; user: FirebaseUser; serverSession?: Record<string, unknown> }>): Promise<AuthResult> => {
      setActionLoading(true);
      try {
        const result = await action();

        // Extract and persist role
        const role = extractRole(result.serverSession);
        if (role) {
          setUserRole(role);
          sessionStorage.setItem("userRole", role);
        }

        hasSynced.current = true;
        return result;
      } finally {
        setActionLoading(false);
      }
    },
    []
  );

  const loginWithEmail = useCallback(
    (email: string, pass: string): Promise<AuthResult> =>
      handleAuthAction(() => AuthService.loginWithEmail(email, pass)),
    [handleAuthAction]
  );

  const registerWithEmail = useCallback(
    (email: string, pass: string, displayName: string): Promise<AuthResult> =>
      handleAuthAction(() => AuthService.registerWithEmail(email, pass, displayName)),
    [handleAuthAction]
  );

  const loginWithGoogle = useCallback(
    (): Promise<AuthResult> =>
      handleAuthAction(() => AuthService.loginWithGoogle()),
    [handleAuthAction]
  );

  const logout = useCallback(async () => {
    setActionLoading(true);
    try {
      await AuthService.logout();
      setUserRole(null);
      sessionStorage.removeItem("userRole");
      hasSynced.current = false;
    } finally {
      setActionLoading(false);
    }
  }, []);

  // ==========================================
  // RENDER
  // ==========================================

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        actionLoading,
        isAuthenticated: !!user,
        uid: user?.uid || null,
        email: user?.email || null,
        userRole,
        loginWithEmail,
        registerWithEmail,
        loginWithGoogle,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// ==========================================
// HOOK
// ==========================================

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}