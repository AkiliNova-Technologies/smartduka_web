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
import {
  getAllUsersAction,
  getPlatformMetricsAction,
  getAllVendorApplicationsAction,
} from "@/actions/admin";
import { PlatformRole, UserStatus, VerificationStatus } from "@prisma/client";
import type { OrderRow, VendorApplicationRow } from "@/types/marketplace";

interface AdminUser {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  avatarUrl: string | null;
  platformRole: PlatformRole | null;
  vendorRole: string | null;
  status: UserStatus;
  emailVerifiedAt: Date | string | null;
  lastLoginAt: Date | string | null;
  createdAt: Date | string;
}

interface PlatformMetrics {
  totalUsers: number;
  totalCustomers: number;
  totalVendors: number;
  totalAdmins: number;
  totalOrders: number;
  totalProducts: number;
  totalRevenue: number;
}

interface AdminDataContextType {
  users: AdminUser[];
  usersLoading: boolean;
  vendors: VendorApplicationRow[];
  vendorsLoading: boolean;
  metrics: PlatformMetrics | null;
  metricsLoading: boolean;
  error: string | null;
  refreshUsers: () => void;
  refreshVendors: () => void;
  refreshMetrics: () => void;
  refreshAll: () => void;
  orders: OrderRow[];
  ordersLoading: boolean;
  refreshOrders: () => void;
}

const AdminDataContext = createContext<AdminDataContextType | undefined>(
  undefined,
);

export function AdminDataProvider({ children }: { children: React.ReactNode }) {
  const { uid, isAuthenticated, loading: authLoading } = useAuth();

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [vendors, setVendors] = useState<VendorApplicationRow[]>([]);
  const [vendorsLoading, setVendorsLoading] = useState(true);
  const [metrics, setMetrics] = useState<PlatformMetrics | null>(null);
  const [metricsLoading, setMetricsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasFetchedRef = useRef(false);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);

  const fetchUsers = useCallback(async () => {
    setUsersLoading(true);
    try {
      const result = await getAllUsersAction();
      if (result.success) setUsers(result.data.users as unknown as AdminUser[]);
    } catch {
      /* silent */
    } finally {
      setUsersLoading(false);
    }
  }, []);

  const fetchVendors = useCallback(async () => {
    setVendorsLoading(true);
    try {
      const result = await getAllVendorApplicationsAction();
      if (result.success) {
        const rows: VendorApplicationRow[] = (
          result.data as unknown as Record<string, unknown>[]
        ).map((app: Record<string, unknown>) => {
          const vendorProfile = app.vendorProfile as
            | Record<string, unknown>
            | undefined;
          return {
            id: app.id as string,
            storeName: app.storeName as string,
            storeSlug: app.storeSlug as string,
            businessType: app.businessType as string,
            businessEmail: app.businessEmail as string,
            businessPhone: app.businessPhone as string,
            streetAddress: app.streetAddress as string,
            city: app.city as string,
            district: (app.district as string) || null,
            hasPhysicalStore: app.hasPhysicalStore as boolean,
            status: app.status as VerificationStatus,
            createdAt: (app.createdAt as Date).toISOString(),
            userName:
              ((app.user as Record<string, unknown>)?.name as string) ||
              "Unnamed User",
            userEmail:
              ((app.user as Record<string, unknown>)?.email as string) || "",
            userPhone:
              ((app.user as Record<string, unknown>)?.phone as string) || null,
            documentCount: ((app.documents as unknown[]) || []).length,
            logoUrl: (vendorProfile?.logoUrl as string) || null,
            bannerUrl: (vendorProfile?.bannerUrl as string) || null,
            documents: ((app.documents as unknown[]) || []).map((d) => {
              const doc = d as Record<string, unknown>;
              return {
                id: doc.id as string,
                type: doc.type as string,
                name: doc.name as string,
                url: doc.url as string,
                status: doc.status as string,
              };
            }),
          };
        });
        setVendors(rows);
      }
    } catch {
      /* silent */
    } finally {
      setVendorsLoading(false);
    }
  }, []);

  const fetchMetrics = useCallback(async () => {
    setMetricsLoading(true);
    try {
      const result = await getPlatformMetricsAction();
      if (result.success) setMetrics(result.data as PlatformMetrics);
    } catch {
      /* silent */
    } finally {
      setMetricsLoading(false);
    }
  }, []);

  const fetchOrders = useCallback(async () => {
    setOrdersLoading(true);
    try {
      const result = await import("@/actions/admin").then((m) =>
        m.getAllOrdersAction(),
      );
      if (result.success) {
        setOrders(result.data as unknown as OrderRow[]);
      }
    } catch {
      /* silent */
    } finally {
      setOrdersLoading(false);
    }
  }, []);

  const refreshOrders = useCallback(() => {
    fetchOrders();
  }, [fetchOrders]);

  const refreshUsers = useCallback(() => {
    fetchUsers();
  }, [fetchUsers]);
  const refreshVendors = useCallback(() => {
    fetchVendors();
  }, [fetchVendors]);
  const refreshMetrics = useCallback(() => {
    fetchMetrics();
  }, [fetchMetrics]);
  const refreshAll = useCallback(() => {
    fetchUsers();
    fetchVendors();
    fetchMetrics();
  }, [fetchUsers, fetchVendors, fetchMetrics]);

  useEffect(() => {
    if (!authLoading && isAuthenticated && uid && !hasFetchedRef.current) {
      hasFetchedRef.current = true;
      fetchUsers();
      fetchVendors();
      fetchMetrics();
      fetchOrders();
    }
  }, [
    authLoading,
    isAuthenticated,
    uid,
    fetchUsers,
    fetchVendors,
    fetchMetrics,
    fetchOrders,
  ]);

  return (
    <AdminDataContext.Provider
      value={{
        users,
        usersLoading,
        vendors,
        vendorsLoading,
        metrics,
        metricsLoading,
        error,
        refreshUsers,
        refreshVendors,
        refreshMetrics,
        refreshAll,
        orders,
        ordersLoading,
        refreshOrders,
      }}>
      {children}
    </AdminDataContext.Provider>
  );
}

export function useAdminData() {
  const context = useContext(AdminDataContext);
  if (context === undefined)
    throw new Error("useAdminData must be used within an AdminDataProvider");
  return context;
}
