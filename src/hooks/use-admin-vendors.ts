"use client";

import { useState, useEffect, useCallback } from "react";
import { VerificationStatus } from "@prisma/client";
import { toast } from "sonner";

export interface VendorApplicationRow {
  id: string;
  storeName: string;
  storeSlug: string;
  businessType: string;
  businessEmail: string;
  businessPhone: string;
  streetAddress: string;
  city: string;
  district: string | null;
  hasPhysicalStore: boolean;
  status: VerificationStatus;
  createdAt: string;
  userName: string;
  userEmail: string;
  userPhone: string | null;
  documentCount: number;
}

interface UseAdminVendorsReturn {
  applications: VendorApplicationRow[];
  loading: boolean;
  actionLoading: string | null;
  error: string | null;
  totalPending: number;
  totalApproved: number;
  totalRejected: number;
  refetch: () => Promise<void>;
  approveApplication: (id: string) => Promise<void>;
  rejectApplication: (id: string) => Promise<void>;
  updateStatus: (id: string, status: VerificationStatus, notes?: string) => Promise<void>;
  setSearchQuery: (query: string) => void;
  setStatusFilter: (status: VerificationStatus | "ALL") => void;
  statusFilter: VerificationStatus | "ALL";
  searchQuery: string;
}

export function useAdminVendors(): UseAdminVendorsReturn {
  const [applications, setApplications] = useState<VendorApplicationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQueryState] = useState("");
  const [statusFilter, setStatusFilterState] = useState<VerificationStatus | "ALL">("ALL");

  // Core fetch function – accepts optional overrides so it can be called imperatively
  const fetchApplications = useCallback(
    async (overrides?: { status?: VerificationStatus | "ALL"; search?: string }) => {
      const status = overrides?.status ?? statusFilter;
      const search = overrides?.search ?? searchQuery;

      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams();
        if (status !== "ALL") params.set("status", status);
        if (search) params.set("search", search);

        const response = await fetch(`/api/admin/vendors?${params.toString()}`);

        if (!response.ok) {
          throw new Error("Failed to fetch vendor applications");
        }

        const data = await response.json();
        setApplications(data.applications || []);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "An unexpected error occurred";
        setError(message);
        console.error("Failed to fetch vendor applications:", err);
      } finally {
        setLoading(false);
      }
    },
    [statusFilter, searchQuery]
  );

  // Initial fetch on mount – all setState calls are inside async IIFE, no function call in effect
  useEffect(() => {
    // Initial fetch
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch("/api/admin/vendors");
        if (!response.ok) {
          throw new Error("Failed to fetch vendor applications");
        }
        const data = await response.json();
        setApplications(data.applications || []);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "An unexpected error occurred";
        setError(message);
        console.error("Failed to fetch vendor applications:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, []); // Runs once on mount

  // Setters that also trigger a refetch with the new values – no effect needed
  const setSearchQuery = useCallback(
    (query: string) => {
      setSearchQueryState(query);
      fetchApplications({ search: query, status: statusFilter });
    },
    [fetchApplications, statusFilter]
  );

  const setStatusFilter = useCallback(
    (status: VerificationStatus | "ALL") => {
      setStatusFilterState(status);
      fetchApplications({ status, search: searchQuery });
    },
    [fetchApplications, searchQuery]
  );

  // Update status action
  const updateStatus = useCallback(
    async (id: string, status: VerificationStatus, notes?: string) => {
      setActionLoading(id);
      try {
        const response = await fetch(`/api/admin/vendors/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status, reviewerNotes: notes }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Failed to update application status");
        }

        toast.success(`Application ${status.toLowerCase()} successfully.`);
        // Refresh list after action
        await fetchApplications();
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "An unexpected error occurred";
        toast.error(message);
        throw err; // re-throw so the component can handle it if needed
      } finally {
        setActionLoading(null);
      }
    },
    [fetchApplications]
  );

  const approveApplication = useCallback(
    async (id: string) => {
      await updateStatus(id, "APPROVED", "Approved by admin.");
    },
    [updateStatus]
  );

  const rejectApplication = useCallback(
    async (id: string) => {
      await updateStatus(id, "REJECTED", "Rejected by admin.");
    },
    [updateStatus]
  );

  // Computed counts
  const totalPending = applications.filter(
    (a) => a.status === "PENDING" || a.status === "SUBMITTED" || a.status === "UNDER_REVIEW"
  ).length;
  const totalApproved = applications.filter((a) => a.status === "APPROVED").length;
  const totalRejected = applications.filter((a) => a.status === "REJECTED").length;

  return {
    applications,
    loading,
    actionLoading,
    error,
    totalPending,
    totalApproved,
    totalRejected,
    refetch: () => fetchApplications(),  
    approveApplication,
    rejectApplication,
    updateStatus,
    setSearchQuery,
    setStatusFilter,
    statusFilter,
    searchQuery,
  };
}