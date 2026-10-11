"use client";

import { Suspense, type ReactNode } from "react";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { VendorSidebar } from "@/components/layout/VendorSidebar";
import { VendorHeader } from "@/components/layout/VendorHeader";
import {
  VendorDataProvider,
  useVendorData,
} from "@/providers/VendorDataProvider";
import { VendorCatalogProvider } from "@/providers/VendorCatalogProvider";
import { Skeleton } from "@/components/ui/skeleton";
import { VendorEntitlementBanner } from "@/components/vendor-entitlement-banner";

export function VendorDashboardShell({
  children,
  vendorId,
}: Readonly<{ children: ReactNode; vendorId: string }>) {
  return (
    <VendorDataProvider>
      <VendorLayoutInner vendorId={vendorId}>{children}</VendorLayoutInner>
    </VendorDataProvider>
  );
}

function VendorLayoutInner({
  children,
  vendorId,
}: Readonly<{ children: ReactNode; vendorId: string }>) {
  const { profile, loading, error } = useVendorData();

  return (
    <SidebarProvider>
      <Suspense fallback={<VendorSidebarFallback />}>
        <VendorSidebar variant="inset" />
      </Suspense>
      <SidebarInset>
        <Suspense fallback={<VendorHeaderFallback />}>
          <VendorHeader />
        </Suspense>
        <VendorCatalogProvider vendorId={vendorId}>
          <div className="flex flex-1 flex-col bg-zinc-50/50 dark:bg-zinc-950">
            <div className="@container/main flex flex-1 flex-col">
              <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-4 md:gap-6 md:py-6 lg:px-6">
                {loading ? (
                  <VendorStatusFallback />
                ) : profile ? (
                  profile.status !== "ACTIVE" && (
                    <div
                      role="status"
                      className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-900 dark:text-amber-100">
                      <p className="font-semibold">
                        Shop status:{" "}
                        {profile.status === "BANNED" ||
                        profile.status === "CANCELLED"
                          ? "Banned"
                          : profile.status === "SUSPENDED"
                            ? "Suspended"
                            : "Pending"}
                      </p>
                      <p className="mt-1">
                        Your public shop, products, and promotions are
                        unavailable. Historical orders, account settings, and
                        verification recovery remain accessible.
                      </p>
                      {profile.moderationReason && (
                        <p className="mt-2 text-xs">
                          Reason: {profile.moderationReason}
                        </p>
                      )}
                    </div>
                  )
                ) : error ? (
                  <div
                    role="status"
                    className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
                    Shop details could not be refreshed. Page data remains
                    protected and can be retried by reloading.
                  </div>
                ) : null}
                <VendorEntitlementBanner />
                <Suspense fallback={<VendorPageFallback />}>
                  {children}
                </Suspense>
              </div>
            </div>
          </div>
        </VendorCatalogProvider>
      </SidebarInset>
    </SidebarProvider>
  );
}

export function VendorDashboardShellFallback() {
  return (
    <div className="flex min-h-svh w-full bg-background">
      <VendorSidebarFallback />
      <div className="flex min-w-0 flex-1 flex-col">
        <VendorHeaderFallback />
        <main className="flex flex-1 flex-col bg-zinc-50/50 px-4 py-6 dark:bg-zinc-950 lg:px-6">
          <div className="mx-auto w-full max-w-7xl">
            <VendorPageFallback />
          </div>
        </main>
      </div>
    </div>
  );
}

function VendorStatusFallback() {
  return (
    <div className="flex items-center gap-3" aria-label="Loading shop status">
      <Skeleton className="size-8 rounded-full" />
      <Skeleton className="h-4 w-40" />
    </div>
  );
}

function VendorPageFallback() {
  return (
    <div className="space-y-6" aria-label="Loading vendor page">
      <div className="space-y-2">
        <Skeleton className="h-7 w-44" />
        <Skeleton className="h-4 w-72 max-w-full" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-28 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-64 rounded-xl" />
    </div>
  );
}

function VendorHeaderFallback() {
  return (
    <header
      aria-hidden="true"
      className="sticky top-0 z-40 border-b border-border/60 bg-background/95">
      <div className="mx-auto flex min-h-16 max-w-7xl items-center gap-3 px-4 sm:px-6 lg:px-8">
        <Skeleton className="size-11 rounded-lg" />
        <Skeleton className="h-5 w-24" />
        <Skeleton className="ml-auto size-11 rounded-lg" />
      </div>
    </header>
  );
}

function VendorSidebarFallback() {
  return (
    <aside
      aria-hidden="true"
      className="hidden w-64 shrink-0 border-r border-border/60 bg-sidebar lg:block">
      <div className="space-y-4 p-4">
        <Skeleton className="h-8 w-36" />
        {Array.from({ length: 6 }, (_, index) => (
          <Skeleton key={index} className="h-10 w-full rounded-lg" />
        ))}
      </div>
    </aside>
  );
}
