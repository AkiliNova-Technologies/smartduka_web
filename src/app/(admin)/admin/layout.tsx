"use client";

import * as React from "react";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/layout/AdminSidebar";
import { AdminHeader } from "@/components/layout/AdminHeader";
import { VendorCatalogProvider } from "@/providers/VendorCatalogProvider";

export default function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <VendorCatalogProvider>
      <SidebarProvider>
        <AdminSidebar variant="inset" />
        <SidebarInset>
          <AdminHeader />
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
  );
}