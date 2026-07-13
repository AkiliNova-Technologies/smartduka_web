"use client";

import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { getMyFullVendorProfile } from "@/actions/vendor-settings";
import type { VerificationStatus, Document } from "@prisma/client";

// ─── Types ───

interface VendorDocument {
  id: string;
  type: string;
  name: string;
  url: string;
  status: string;
}

interface VendorApplication {
  id: string;
  userId: string;
  storeName: string;
  storeSlug: string;
  businessType: string;
  businessEmail: string;
  businessPhone: string;
  streetAddress: string;
  city: string;
  district: string | null;
  country: string;
  hasPhysicalStore: boolean;
  storeLocation: string | null;
  momoNetwork: string | null;
  momoNumber: string | null;
  status: VerificationStatus;
  reviewerNotes: string | null;
  createdAt: string;
  updatedAt: string;
  documents: VendorDocument[];
}

interface VendorProfile {
  id: string;
  storeName: string;
  slug: string;
  status: string;
  logoUrl: string | null;
  bannerUrl: string | null;
  description: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  _count: { products: number; subOrders: number };
  documents: Document[];
}

export interface PublicStore {
  id: string;
  storeName: string;
  slug: string;
  logoUrl: string | null;
  bannerUrl: string | null;
  description: string | null;
  city: string | null;
  country: string | null;
  _count: { products: number };
  products: { images: { url: string }[]; categoryId: string | null }[];
}

interface VendorDataContextType {
  application: VendorApplication | null;
  profile: VendorProfile | null;
  fullProfile: VendorProfile | null;
  loading: boolean;
  fullProfileLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  refetchFullProfile: () => Promise<void>;
  hasApplied: boolean;
  isPending: boolean;
  isApproved: boolean;
  isRejected: boolean;
  isUnderReview: boolean;
}

// ─── Context ───

const VendorDataContext = createContext<VendorDataContextType | undefined>(undefined);

export function VendorDataProvider({ children }: { children: React.ReactNode }) {
  const { uid, isAuthenticated, loading: authLoading } = useAuth();
  const [application, setApplication] = useState<VendorApplication | null>(null);
  const [profile, setProfile] = useState<VendorProfile | null>(null);
  const [fullProfile, setFullProfile] = useState<VendorProfile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasFetched, setHasFetched] = useState(false);
  const [fullProfileFetched, setFullProfileFetched] = useState(false);
  const [fullProfileLoading, setFullProfileLoading] = useState(false);
  const fetchingRef = useRef(false);
  const fullProfileFetchingRef = useRef(false);

  const loading = authLoading || (isAuthenticated && !hasFetched);

  const fetchVendorData = useCallback(async () => {
    if (!uid || fetchingRef.current) return;
    fetchingRef.current = true;
    setError(null);

    try {
      const response = await fetch(`/api/vendors/apply?userId=${uid}`, {
        headers: { "x-marketplace-user-id": uid },
      });
      if (response.ok) {
        const data = await response.json();
        setApplication(data.application || null);
        setProfile(data.profile || null);
      } else if (response.status === 404) {
        setApplication(null);
        setProfile(null);
      } else {
        throw new Error("Failed to fetch vendor data");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
    } finally {
      setHasFetched(true);
      fetchingRef.current = false;
    }
  }, [uid]);

  // Fetch full profile (with documents) — lazy, only when basic profile is available
  const fetchFullProfile = useCallback(async () => {
    if (!profile || fullProfileFetchingRef.current || fullProfileFetched) return;
    fullProfileFetchingRef.current = true;
    setFullProfileLoading(true);

    try {
      const result = await getMyFullVendorProfile();
      if (result.success && result.data) {
        setFullProfile(result.data as unknown as VendorProfile);
      }
    } catch {
      // silent
    } finally {
      setFullProfileFetched(true);
      setFullProfileLoading(false);
      fullProfileFetchingRef.current = false;
    }
  }, [profile, fullProfileFetched]);

  const refetchFullProfile = useCallback(async () => {
    setFullProfileFetched(false);
    fullProfileFetchingRef.current = false;
  }, []);

  // Determine if we are ready to fetch basic vendor data
  const authReady = !authLoading && isAuthenticated && !!uid && !hasFetched;

  // Trigger basic fetch safely after render
  useEffect(() => {
    if (authReady) {
      queueMicrotask(() => {
        fetchVendorData();
      });
    }
  }, [authReady, fetchVendorData]);

  // Trigger full profile fetch when basic profile becomes available
  useEffect(() => {
    if (profile && !fullProfileFetched && !fullProfileFetchingRef.current) {
      queueMicrotask(() => {
        fetchFullProfile();
      });
    }
  }, [profile, fullProfileFetched, fetchFullProfile]);

  return (
    <VendorDataContext.Provider
      value={{
        application,
        profile,
        fullProfile,
        loading,
        fullProfileLoading,
        error,
        refetch: fetchVendorData,
        refetchFullProfile,
        hasApplied: !!application,
        isPending: application?.status === "PENDING",
        isApproved: application?.status === "APPROVED" || !!profile,
        isRejected: application?.status === "REJECTED",
        isUnderReview: application?.status === "UNDER_REVIEW",
      }}
    >
      {children}
    </VendorDataContext.Provider>
  );
}

export function useVendorData() {
  const context = useContext(VendorDataContext);
  if (context === undefined) {
    throw new Error("useVendorData must be used within a VendorDataProvider");
  }
  return context;
}

// ==========================================
// PUBLIC STORES HOOK
// ==========================================

let cachedStores: PublicStore[] | null = null;
let cachedError: string | null = null;
let fetchPromise: Promise<void> | null = null;

export function usePublicStores() {
  const [stores, setStores] = useState<PublicStore[]>(() => cachedStores || []);
  const [isLoading, setIsLoading] = useState(() => !cachedStores);
  const [error, setError] = useState<string | null>(() => cachedError);

  useEffect(() => {
    if (cachedStores) return;

    if (fetchPromise) {
      let cancelled = false;
      fetchPromise.then(() => {
        if (!cancelled) {
          setStores(cachedStores || []);
          setError(cachedError);
          setIsLoading(false);
        }
      });
      return () => { cancelled = true; };
    }

    // Start new fetch
    let cancelled = false;

    fetchPromise = (async () => {
      try {
        const response = await fetch("/api/vendors/public");
        if (!response.ok) throw new Error("Failed to fetch stores");
        const data = await response.json();
        cachedStores = data.stores || [];
        cachedError = null;
      } catch (err) {
        cachedError = err instanceof Error ? err.message : "Failed to load stores";
      } finally {
        fetchPromise = null;
      }
    })();

    fetchPromise.then(() => {
      if (!cancelled) {
        setStores(cachedStores || []);
        setError(cachedError);
        setIsLoading(false);
      }
    });

    return () => { cancelled = true; };
  }, []);

  return { stores, isLoading, error };
}