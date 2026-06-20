import React from "react";
import { CustomerSidebar } from "@/components/layout/CustomerSidebar"; // This maps your AppSidebar
import { Header } from "@/components/layout/Header";
import { RightSidebar } from "@/components/home/RightSidebar";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";

export default function CustomerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider defaultOpen={true}>
      <div className="min-h-screen flex w-full bg-zinc-50/50 dark:bg-zinc-950 selection:bg-emerald-500/10 selection:text-emerald-700">
        
        <CustomerSidebar variant="floating"/>

        <SidebarInset className="min-h-screen flex flex-col bg-transparent transition-all duration-300">
          {/* Top Header Bar */}
          <Header />

          <main className="flex-1 flex flex-col lg:flex-row px-6 md:px-10 py-8 gap-12 max-w-8xl w-full mx-auto">
            <div className="flex-1 min-w-0 relative">
              {children}
            </div>

            <RightSidebar />
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}