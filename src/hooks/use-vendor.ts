"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/use-auth";
import { VerificationStatus } from "@prisma/client";

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
  description: string | null;
  _count: {
    products: number;
    subOrders: number;
  };
}

export function useVendor() {
  const { uid, isAuthenticated, loading: authLoading } = useAuth();
  const [application, setApplication] = useState<VendorApplication | null>(null);
  const [profile, setProfile] = useState<VendorProfile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasFetched, setHasFetched] = useState(false);

  const loading = authLoading || (isAuthenticated && !hasFetched);

  // Manual refetch (used as refetch by consumers)
  const fetchApplication = useCallback(async () => {
    if (!uid) return;
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
      const message = err instanceof Error ? err.message : "An unexpected error occurred";
      setError(message);
    }
  }, [uid]);

  // Effect: no synchronous setState – all state updates are inside async IIFE
  useEffect(() => {
    if (!authLoading && isAuthenticated && uid && !hasFetched) {
      (async () => {
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
          const message = err instanceof Error ? err.message : "An unexpected error occurred";
          setError(message);
        } finally {
          setHasFetched(true);
        }
      })();
    }
  }, [authLoading, isAuthenticated, uid, hasFetched]);

  return {
    application,
    profile,
    loading,
    error,
    refetch: fetchApplication,
    hasApplied: !!application,
    isPending: application?.status === "PENDING",
    isApproved: application?.status === "APPROVED" || !!profile,
    isRejected: application?.status === "REJECTED",
    isUnderReview: application?.status === "UNDER_REVIEW",
  };
}