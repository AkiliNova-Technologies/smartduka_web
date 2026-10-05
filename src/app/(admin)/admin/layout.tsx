"use client";

import * as React from "react";
import { Suspense } from "react";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/layout/AdminSidebar";
import { AdminHeader } from "@/components/layout/AdminHeader";
import { VendorCatalogProvider } from "@/providers/VendorCatalogProvider";
import { AdminDataProvider } from "@/providers/AdminDataProvider";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AdminDataProvider>
      <VendorCatalogProvider includeInactiveCategories>
        <SidebarProvider>
          <Suspense fallback={<AdminSidebarFallback />}>
            <AdminSidebar variant="inset" />
          </Suspense>
          <SidebarInset>
            <Suspense fallback={<AdminHeaderFallback />}>
              <AdminHeader />
            </Suspense>
            <div className="flex flex-1 flex-col bg-zinc-50/50 dark:bg-zinc-950">
              <div className="@container/main flex flex-1 flex-col">
                <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6 max-w-7xl w-full mx-auto px-4 lg:px-6">
                  {children}
                </div>
              </div>
            </div>
          </SidebarInset>
        </SidebarProvider>
      </VendorCatalogProvider>
    </AdminDataProvider>
  );
}

function AdminHeaderFallback() {
  return <header aria-hidden="true" className="sticky top-0 z-40 border-b border-border/60 bg-background/95"><div className="mx-auto flex min-h-16 max-w-7xl items-center gap-3 px-4 sm:px-6 lg:px-8"><Skeleton className="size-11 rounded-lg" /><Skeleton className="h-5 w-28" /><Skeleton className="ml-auto size-11 rounded-lg" /></div></header>;
}

function AdminSidebarFallback() {
  return <aside aria-hidden="true" className="hidden w-64 shrink-0 border-r border-border/60 bg-sidebar lg:block"><div className="space-y-4 p-4"><Skeleton className="h-8 w-36" />{Array.from({ length: 6 }, (_, index) => <Skeleton key={index} className="h-10 w-full rounded-lg" />)}</div></aside>;
}
