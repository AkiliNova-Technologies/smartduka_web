"use client";

import * as React from "react";
import { Suspense } from "react";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { VendorSidebar } from "@/components/layout/VendorSidebar";
import { VendorHeader } from "@/components/layout/VendorHeader";
import {
  VendorDataProvider,
  useVendorData,
} from "@/providers/VendorDataProvider";
import { VendorCatalogProvider } from "@/providers/VendorCatalogProvider";
import { Skeleton } from "@/components/ui/skeleton";

export default function VendorDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <VendorDataProvider>
      <VendorLayoutInner>{children}</VendorLayoutInner>
    </VendorDataProvider>
  );
}

function VendorLayoutInner({ children }: { children: React.ReactNode }) {
  const { profile, loading } = useVendorData();
  const profileReady = !loading && profile?.id;

  return (
    <SidebarProvider>
      <Suspense fallback={<VendorSidebarFallback />}><VendorSidebar variant="inset" /></Suspense>
      <SidebarInset>
        <Suspense fallback={<VendorHeaderFallback />}><VendorHeader /></Suspense>
        {profileReady ? (
          <VendorCatalogProvider vendorId={profile.id}>
            <div className="flex flex-1 flex-col bg-zinc-50/50 dark:bg-zinc-950">
              <div className="@container/main flex flex-1 flex-col">
                <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6 max-w-7xl w-full mx-auto px-4 lg:px-6">
                  {children}
                </div>
              </div>
            </div>
          </VendorCatalogProvider>
        ) : (
          <div className="flex flex-1 flex-col bg-zinc-50/50 px-4 py-6 dark:bg-zinc-950 lg:px-6">
            <div className="mx-auto w-full max-w-7xl space-y-6">
              <div className="space-y-2">
                <Skeleton className="h-7 w-44" />
                <Skeleton className="h-4 w-72" />
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {Array.from({ length: 4 }).map((_, index) => (
                  <Skeleton key={index} className="h-28 rounded-xl" />
                ))}
              </div>
              <Skeleton className="h-64 rounded-xl" />
            </div>
          </div>
        )}
      </SidebarInset>
    </SidebarProvider>
  );
}

function VendorHeaderFallback() {
  return <header aria-hidden="true" className="sticky top-0 z-40 border-b border-border/60 bg-background/95"><div className="mx-auto flex min-h-16 max-w-7xl items-center gap-3 px-4 sm:px-6 lg:px-8"><Skeleton className="size-11 rounded-lg" /><Skeleton className="h-5 w-24" /><Skeleton className="ml-auto size-11 rounded-lg" /></div></header>;
}

function VendorSidebarFallback() {
  return <aside aria-hidden="true" className="hidden w-64 shrink-0 border-r border-border/60 bg-sidebar lg:block"><div className="space-y-4 p-4"><Skeleton className="h-8 w-36" />{Array.from({ length: 6 }, (_, index) => <Skeleton key={index} className="h-10 w-full rounded-lg" />)}</div></aside>;
}
