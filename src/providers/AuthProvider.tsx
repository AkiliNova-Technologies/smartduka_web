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
import { authService } from "@/services/auth";

interface AuthResult {
  success: boolean;
  user: { id: string; role: string | null; name: string } | null;
  error?: string;
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

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const isSyncing = useRef(false);
  const hasSynced = useRef(false);

  const [userRole, setUserRole] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      return sessionStorage.getItem("userRole");
    }
    return null;
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);

      if (firebaseUser) {
        if (!hasSynced.current && !isSyncing.current) {
          isSyncing.current = true;
          
          try {
            await Promise.all([
              authService.syncUserProfile(firebaseUser),
              authService
                .syncSessionWithBackend(firebaseUser)
                .then((sessionData) => {
                  const role = sessionData?.user?.role || null;
                  if (role) {
                    setUserRole(role);
                    sessionStorage.setItem("userRole", role);
                  }
                }),
            ]);
            hasSynced.current = true;
          } catch (error) {
            console.error("Auth sync failed:", error);
          } finally {
            isSyncing.current = false;
          }
        }
        
        setLoading(false);
      } else {
        setUserRole(null);
        sessionStorage.removeItem("userRole");
        setLoading(false);
        hasSynced.current = false;
      }
    });

    return () => unsubscribe();
  }, []);

  const loginWithEmail = useCallback(
    async (email: string, pass: string): Promise<AuthResult> => {
      setActionLoading(true);
      try {
        const result = await authService.loginWithEmail(email, pass);
        const role = result?.user?.role || null;
        if (role) {
          setUserRole(role);
          sessionStorage.setItem("userRole", role);
        }
        hasSynced.current = true;
        return result as AuthResult;
      } finally {
        setActionLoading(false);
      }
    },
    []
  );

  const registerWithEmail = useCallback(
    async (email: string, pass: string, displayName: string): Promise<AuthResult> => {
      setActionLoading(true);
      try {
        const result = await authService.registerWithEmail(
          email,
          pass,
          displayName
        );
        const role = result?.user?.role || null;
        if (role) {
          setUserRole(role);
          sessionStorage.setItem("userRole", role);
        }
        hasSynced.current = true;
        return result as AuthResult;
      } finally {
        setActionLoading(false);
      }
    },
    []
  );

  const loginWithGoogle = useCallback(async (): Promise<AuthResult> => {
    setActionLoading(true);
    try {
      const result = await authService.loginWithGoogle();
      const role = result?.user?.role || null;
      if (role) {
        setUserRole(role);
        sessionStorage.setItem("userRole", role);
      }
      hasSynced.current = true;
      return result as AuthResult;
    } finally {
      setActionLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    setActionLoading(true);
    try {
      await authService.logout();
      setUserRole(null);
      sessionStorage.removeItem("userRole");
      hasSynced.current = false;
    } finally {
      setActionLoading(false);
    }
  }, []);

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

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}