"use client";

import { usePathname } from "next/navigation";
import { Bell, AlignStartVertical, AlignEndVertical } from "lucide-react";
import Image from "next/image";
import { useVendor } from "@/hooks/use-vendor";
import { useSidebar } from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";

export function VendorHeader() {
  const { toggleSidebar, open } = useSidebar();
  const pathname = usePathname();
  const { profile, loading: vendorLoading } = useVendor();

  const storeName = profile?.storeName || "My Store";
  const storeLogo = profile?.logoUrl || null;

  // Dynamic heading resolver — maps all vendor paths to contextual labels
  const getHeaderTitle = () => {
    if (pathname.startsWith("/vendor/orders")) return "Orders Pipeline";
    if (pathname.startsWith("/vendor/products/new")) return "New Product";
    if (pathname.startsWith("/vendor/products")) return "Stock & Inventory";
    if (pathname.startsWith("/vendor/settings")) return "Store Settings";
    if (pathname.startsWith("/vendor/reports")) return "Fulfillment Reports";
    return "Dashboard Overview";
  };

  // Dynamic subtitle based on current section
  const getHeaderSubtitle = () => {
    if (pathname.startsWith("/vendor/orders")) return "Track and manage incoming customer orders";
    if (pathname.startsWith("/vendor/products")) return "Manage your product catalog and inventory";
    if (pathname.startsWith("/vendor/settings")) return "Customize your store branding and profile";
    if (pathname.startsWith("/vendor/reports")) return "View sales analytics and performance metrics";
    return "Real-time snapshot of your store performance";
  };

  return (
    <header className="sticky top-0 left-0 right-0 z-40 w-full bg-background/80 backdrop-blur-md border-b border-border/40 dark:border-zinc-800/60 transition-all duration-300">
      <div className="max-w-8xl mx-auto w-full h-18 px-4 sm:px-6 md:px-8 flex justify-between items-center">
        
        {/* LEFT PANEL: Sidebar Controls & Dynamic Context Heading */}
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <button
            onClick={() => toggleSidebar()}
            aria-label={
              open ? "Collapse Navigation Sidebar" : "Expand Navigation Sidebar"
            }
            className="p-2.5 -ml-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl transition-all active:scale-95 cursor-pointer shrink-0"
          >
            {open ? (
              <AlignStartVertical className="w-5 h-5 animate-in fade-in zoom-in-75 duration-200" />
            ) : (
              <AlignEndVertical className="w-5 h-5 animate-in fade-in zoom-in-75 duration-200" />
            )}
          </button>

          <div className="h-5 w-[1px] bg-border/60 shrink-0" />

          {/* Real-time Dynamic Section Heading */}
          <div className="flex flex-col gap-0.5 select-none min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-muted-foreground bg-muted border border-border/40 px-2.5 py-0.5 rounded-md uppercase tracking-wider shrink-0">
                Merchant
              </span>
              {vendorLoading ? (
                <Skeleton className="h-4 w-28 rounded-md" />
              ) : (
                <h1 className="text-sm font-bold tracking-tight text-foreground transition-all duration-200 truncate">
                  {getHeaderTitle()}
                </h1>
              )}
            </div>
            <p className="text-[10px] text-muted-foreground/60 truncate hidden sm:block pl-1">
              {getHeaderSubtitle()}
            </p>
          </div>
        </div>

        {/* RIGHT PANEL: Alerts Hub & Profile Snapshot */}
        <div className="flex items-center gap-2.5 sm:gap-3 ml-4 shrink-0">

          {/* Notifications Trigger Button */}
          <button className="p-2.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-full relative transition-all active:scale-95 group cursor-pointer">
            <Bell className="w-4 h-4 transition-transform group-hover:rotate-12" />
            <span className="absolute top-2.5 right-2.5 w-1.5 h-1.5 bg-primary rounded-full ring-2 ring-background" />
            <span className="absolute top-2.5 right-2.5 w-1.5 h-1.5 bg-primary rounded-full animate-ping opacity-40" />
          </button>

          <div className="h-5 w-[1px] bg-border mx-1.5 hidden sm:block" />

          {/* Profile Snapshot — now shows real vendor logo + name */}
          <div className="flex items-center gap-3 border border-transparent hover:border-border hover:bg-card px-2 py-1.5 rounded-xl hover:shadow-2xs cursor-pointer group transition-all duration-200">
            {vendorLoading ? (
              <>
                <Skeleton className="w-8 h-8 rounded-full" />
                <Skeleton className="h-3 w-20 rounded-md hidden sm:block" />
              </>
            ) : (
              <>
                <div className="relative w-8 h-8 rounded-full overflow-hidden ring-2 ring-transparent group-hover:ring-primary/20 transition-all shrink-0 bg-muted">
                  {storeLogo ? (
                    <Image
                      alt={`${storeName} logo`}
                      src={storeLogo}
                      fill
                      sizes="32px"
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                      <span className="text-xs font-bold">
                        {storeName.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

        </div>
      </div>
    </header>
  );
}