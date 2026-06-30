"use client";

import { usePathname } from "next/navigation";
import { Bell, AlignStartVertical, AlignEndVertical } from "lucide-react";
import Image from "next/image";
import { mockDatabase } from "@/data/mockDatabase";
import { useSidebar } from "@/components/ui/sidebar";

export function VendorHeader() {
  const { toggleSidebar, open } = useSidebar();
  const pathname = usePathname();
  const userProfile = mockDatabase.currentUser;

  // Dynamic heading resolver mapping paths to contextual labels
  const getHeaderTitle = () => {
    if (pathname.startsWith("/vendor/orders")) return "Orders Pipeline";
    if (pathname.startsWith("/vendor/products")) return "Stock & Inventory";
    return "Dashboard Overview";
  };

  return (
    <header className="sticky top-0 left-0 right-0 z-40 w-full bg-background/80 backdrop-blur-md border-b border-border/40 dark:border-zinc-800/60 transition-all duration-300">
      <div className="max-w-8xl mx-auto w-full h-18 px-4 sm:px-6 md:px-8 flex justify-between items-center">
        
        {/* LEFT PANEL: Sidebar Controls & Dynamic Context Heading */}
        <div className="flex items-center gap-4 flex-1">
          <button
            onClick={() => toggleSidebar()}
            aria-label={
              open ? "Collapse Navigation Sidebar" : "Expand Navigation Sidebar"
            }
            className="p-2.5 -ml-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl transition-all active:scale-95 cursor-pointer"
          >
            {open ? (
              <AlignStartVertical className="w-5 h-5 animate-in fade-in zoom-in-75 duration-200" />
            ) : (
              <AlignEndVertical className="w-5 h-5 animate-in fade-in zoom-in-75 duration-200" />
            )}
          </button>

          <div className="h-5 w-[1px] bg-border/60" />

          {/* Real-time Dynamic Section Heading */}
          <div className="flex items-center gap-2 select-none">
            <span className="text-[10px] font-bold text-muted-foreground bg-muted border border-border/40 px-2.5 py-0.5 rounded-md uppercase tracking-wider scale-90">
              Merchant
            </span>
            <h1 className="text-sm font-bold tracking-tight text-foreground transition-all duration-200">
              {getHeaderTitle()}
            </h1>
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

          {/* Profile Snapshot Asset */}
          <div className="flex items-center gap-3 border border-transparent hover:border-border hover:bg-card px-2 py-1 rounded-xl hover:shadow-2xs cursor-pointer group transition-all duration-200">
            <div className="relative w-8 h-8 rounded-full overflow-hidden ring-2 ring-transparent group-hover:ring-primary/20 transition-all shrink-0">
              <Image
                alt={`${userProfile.name} Avatar Profile`}
                src={userProfile.avatar}
                fill
                sizes="32px"
                className="object-cover transition-transform duration-500 group-hover:scale-105"
                priority
              />
            </div>
            <div className="text-left hidden sm:block select-none">
              <p className="text-xs font-bold text-foreground tracking-tight leading-none group-hover:text-primary transition-colors">
                {userProfile.name.split(" ")[0]}
              </p>
              <span className="text-[10px] text-muted-foreground font-semibold leading-none mt-1 inline-block">
                Owner
              </span>
            </div>
          </div>

        </div>
      </div>
    </header>
  );
}