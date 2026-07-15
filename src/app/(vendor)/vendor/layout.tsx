"use client";

import * as React from "react";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { VendorSidebar } from "@/components/layout/VendorSidebar";
import { VendorHeader } from "@/components/layout/VendorHeader";
import { VendorDataProvider, useVendorData } from "@/providers/VendorDataProvider";
import { VendorCatalogProvider } from "@/providers/VendorCatalogProvider";

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
      <VendorSidebar variant="inset" />
      <SidebarInset>
        <VendorHeader />
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
          <div className="flex flex-1 flex-col bg-zinc-50/50 dark:bg-zinc-950 items-center justify-center">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
          </div>
        )}
      </SidebarInset>
    </SidebarProvider>
  );
}