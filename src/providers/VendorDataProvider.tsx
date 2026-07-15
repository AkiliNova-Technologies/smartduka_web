"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
} from "react";
import { useAuth } from "@/providers/AuthProvider";
import { getMyVendorApplication, getMyVendorProfile } from "@/actions/vendor";
import { getMyFullVendorProfile } from "@/actions/vendor-settings";
import { fetchApi, authHeaders } from "@/lib/providers/useProviderFetch";
import type { VerificationStatus, Document } from "@prisma/client";

export interface VendorDocument {
  id: string;
  type: string;
  name: string;
  url: string;
  status: string;
}

export interface VendorApplication {
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

export interface VendorProfile {
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

interface VendorSubOrder {
  id: string;
  subOrderNumber: string;
  status: string;
  vendorTotal: number;
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  createdAt: string;
  items: { name: string; quantity: number; price: number }[];
}

interface VendorDataContextType {
  application: VendorApplication | null;
  profile: VendorProfile | null;
  fullProfile: VendorProfile | null;
  loading: boolean;
  fullProfileLoading: boolean;
  error: string | null;
  refetch: () => void;
  refetchFullProfile: () => void;
  hasApplied: boolean;
  isPending: boolean;
  isApproved: boolean;
  isRejected: boolean;
  isUnderReview: boolean;
  vendorOrders: VendorSubOrder[];
  vendorOrdersLoading: boolean;
  refreshVendorOrders: () => Promise<void>;
  updateSubOrderStatus: (subOrderId: string, status: string) => Promise<void>;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return "An unexpected error occurred";
}

const VendorDataContext = createContext<VendorDataContextType | undefined>(
  undefined,
);

export function VendorDataProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { uid, isAuthenticated, loading: authLoading } = useAuth();

  const [application, setApplication] = useState<VendorApplication | null>(
    null,
  );
  const [profile, setProfile] = useState<VendorProfile | null>(null);
  const [fullProfile, setFullProfile] = useState<VendorProfile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasFetched, setHasFetched] = useState(false);
  const [fullProfileFetched, setFullProfileFetched] = useState(false);
  const [fullProfileLoading, setFullProfileLoading] = useState(false);
  const [vendorOrders, setVendorOrders] = useState<VendorSubOrder[]>([]);
  const [vendorOrdersLoading, setVendorOrdersLoading] = useState(false);

  const fetchingRef = useRef(false);

  const loading = authLoading || (isAuthenticated && !hasFetched);
  const hasApplied = !!application;
  const isPending = application?.status === "PENDING";
  const isApproved = application?.status === "APPROVED" || !!profile;
  const isRejected = application?.status === "REJECTED";
  const isUnderReview = application?.status === "UNDER_REVIEW";

  const fetchVendorData = useCallback(async () => {
    if (!uid || fetchingRef.current || hasFetched) return;

    fetchingRef.current = true;
    setError(null);

    try {
      const [app, prof] = await Promise.all([
        getMyVendorApplication(),
        getMyVendorProfile(),
      ]);

      if (app.success) {
        setApplication(app.data as unknown as VendorApplication);
      } else {
        setApplication(null);
      }

      if (prof.success) {
        setProfile(prof.data as unknown as VendorProfile);
      } else {
        setProfile(null);
      }

      setHasFetched(true);
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      fetchingRef.current = false;
    }
  }, [uid, hasFetched]);

  const refetch = useCallback(() => {
    setHasFetched(false);
  }, []);

  const fetchFullProfile = useCallback(async () => {
    if (!profile || fullProfileFetched) return;
    setFullProfileLoading(true);
    try {
      const result = await getMyFullVendorProfile();
      if (result.success && result.data) {
        setFullProfile(result.data as unknown as VendorProfile);
      }
    } catch {
      // Silent
    } finally {
      setFullProfileFetched(true);
      setFullProfileLoading(false);
    }
  }, [profile, fullProfileFetched]);

  const refetchFullProfile = useCallback(() => {
    setFullProfileFetched(false);
  }, []);

  const refreshVendorOrdersRef = useRef<() => Promise<void>>(async () => {});

  useEffect(() => {
    refreshVendorOrdersRef.current = async () => {
      if (!profile?.id || !uid) return;
      setVendorOrdersLoading(true);
      try {
        const data = await fetchApi<{ orders: VendorSubOrder[] }>(
          `/api/vendors/orders?vendorId=${profile.id}`,
          { headers: authHeaders(uid) },
        );
        setVendorOrders(data.orders || []);
      } catch {
        // Silent
      } finally {
        setVendorOrdersLoading(false);
      }
    };
  }, [profile, uid]);

  const refreshVendorOrders = useCallback(async () => {
    await refreshVendorOrdersRef.current();
  }, []);

  const updateSubOrderStatus = useCallback(
    async (subOrderId: string, status: string) => {
      if (!uid) return;
      try {
        await fetch(`/api/vendors/orders/${subOrderId}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "x-marketplace-user-id": uid,
          },
          body: JSON.stringify({ status }),
        });
        await refreshVendorOrdersRef.current();
      } catch {
        // Silent
      }
    },
    [uid],
  );

  const authReady = !authLoading && isAuthenticated && !!uid && !hasFetched;

  useEffect(() => {
    if (authReady && !fetchingRef.current) {
      queueMicrotask(() => {
        fetchVendorData();
      });
    }
  }, [authReady, fetchVendorData]);

  useEffect(() => {
    if (profile && !fullProfileFetched) {
      queueMicrotask(() => {
        fetchFullProfile();
      });
    }
  }, [profile, fullProfileFetched, fetchFullProfile]);

  useEffect(() => {
    if (profile?.id) {
      refreshVendorOrdersRef.current();
    }
  }, [profile?.id]);

  const prevAuthRef = useRef(isAuthenticated);

  useEffect(() => {
    const wasAuthenticated = prevAuthRef.current;
    prevAuthRef.current = isAuthenticated;

    if (!isAuthenticated && wasAuthenticated) {
      setApplication(null);
      setProfile(null);
      setFullProfile(null);
      setVendorOrders([]);
      setHasFetched(false);
      setFullProfileFetched(false);
      setError(null);
    }
  }, [isAuthenticated]);

  return (
    <VendorDataContext.Provider
      value={{
        application,
        profile,
        fullProfile,
        loading,
        fullProfileLoading,
        error,
        refetch,
        refetchFullProfile,
        hasApplied,
        isPending,
        isApproved,
        isRejected,
        isUnderReview,
        vendorOrders,
        vendorOrdersLoading,
        refreshVendorOrders,
        updateSubOrderStatus,
      }}>
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
// PUBLIC STORES HOOK (Session-Cached)
// ==========================================

let cachedStores: PublicStore[] | null = null;
let cachedStoresError: string | null = null;
let storesFetchPromise: Promise<PublicStore[]> | null = null;

function getSessionStores(): PublicStore[] | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = sessionStorage.getItem("smartduka-public-stores");
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

function setSessionStores(stores: PublicStore[]): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem("smartduka-public-stores", JSON.stringify(stores));
  } catch {
    // Storage full
  }
}

export function usePublicStores() {
  const [stores, setStores] = useState<PublicStore[]>(() => {
    return cachedStores || getSessionStores() || [];
  });
  const [isLoading, setIsLoading] = useState(() => {
    return !cachedStores && !getSessionStores();
  });
  const [error, setError] = useState<string | null>(() => cachedStoresError);

  useEffect(() => {
    let cancelled = false;

    if (cachedStores) return;

    if (storesFetchPromise) {
      storesFetchPromise.then((result) => {
        if (!cancelled) {
          setStores(result);
          setIsLoading(false);
        }
      });
      return () => { cancelled = true; };
    }

    storesFetchPromise = (async () => {
      try {
        const response = await fetch("/api/vendors/public");
        if (!response.ok) throw new Error("Failed to fetch stores");
        const json = await response.json();
        const storesList = json.success ? json.data : json.stores || [];
        cachedStores = storesList;
        setSessionStores(storesList);
        cachedStoresError = null;
        return storesList;
      } catch (err) {
        cachedStoresError = err instanceof Error ? err.message : "Failed to load stores";
        return [];
      } finally {
        storesFetchPromise = null;
      }
    })();

    storesFetchPromise.then((result) => {
      if (!cancelled) {
        setStores(result);
        setError(cachedStoresError);
        setIsLoading(false);
      }
    });

    return () => { cancelled = true; };
  }, []);

  return { stores, isLoading, error };
}
