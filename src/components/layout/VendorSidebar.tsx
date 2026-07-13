"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, ShoppingCart, Package, FileChartColumn,
  Store, Moon, Sun, Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/hooks/use-theme";
import { useVendor } from "@/hooks/use-vendor";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  useSidebar,
} from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { IconSmartHome } from "@tabler/icons-react";

const emptySubscribe = () => () => {};

export function VendorSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname();
  const { state } = useSidebar();
  const { isDark, toggleTheme } = useTheme();
  const { profile, loading: vendorLoading } = useVendor();
  
  // High-performance client mount indicator avoiding cascading renders
  const mounted = React.useSyncExternalStore(
    emptySubscribe,
    () => true,  
    () => false 
  );

  // Derive store display values from real profile
  const storeName = profile?.storeName || "My Store";
  const storeLocation = profile?.city || "Kampala";
  const storeLogo = profile?.logoUrl || null;

  const operationsItems = [
    { name: "Overview", href: "/vendor", icon: LayoutDashboard },
    { name: "Orders Manager", href: "/vendor/orders", icon: ShoppingCart },
    { name: "Products & Stock", href: "/vendor/products", icon: Package },
    { name: "Store Settings", href: "/vendor/settings", icon: Settings },
  ];

  const marketingItems = [
    { name: "Fulfillment Reports", href: "/vendor/reports", icon: FileChartColumn },
  ];

  return (
    <Sidebar 
      collapsible="icon" 
      className="border-r border-border/60 bg-customer-sidebar dark:bg-customer-sidebar text-card-foreground transition-all"
      {...props}
    >
      {/* STORE IDENTITY HEADER — now reads real vendor profile */}
      <SidebarHeader className="p-4 flex flex-row items-center gap-3 select-none overflow-hidden h-18 border-b border-border/40">
        <div className="w-9 h-9 bg-primary text-primary-foreground rounded-xl flex items-center justify-center shadow-[0_16px_40px_-12px_rgba(0,0,0,0.02)] shrink-0 transition-transform duration-300 hover:rotate-6 overflow-hidden">
          {storeLogo ? (
            <Image
              src={storeLogo}
              alt={storeName}
              width={36}
              height={36}
              className="w-full h-full object-cover"
            />
          ) : (
            <Store className="w-4 h-4 stroke-[2.5]" />
          )}
        </div>
        {state === "expanded" && (
          <div className="flex flex-col gap-0.5 leading-none transition-fadeIn animate-in fade-in duration-200 min-w-0">
            {vendorLoading ? (
              <>
                <Skeleton className="h-4 w-24 rounded-md" />
                <Skeleton className="h-3 w-16 rounded-md mt-0.5" />
              </>
            ) : (
              <>
                <h1 className="font-bold text-sm tracking-tight text-zinc-900 dark:text-zinc-50 truncate max-w-[140px]">
                  {storeName}
                </h1>
                <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider truncate">
                  {storeLocation} Hub
                </span>
              </>
            )}
          </div>
        )}
      </SidebarHeader>

      <SidebarContent className="px-2 py-4 space-y-4 rounded-xl">
        
        {/* OPERATIONS PIPELINE */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 tracking-widest uppercase mb-2 px-3">
            Operations
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {operationsItems.map((item) => {
                const isActive = pathname === item.href || 
                  (item.href === "/vendor/settings" && pathname.startsWith("/vendor/settings"));
                return (
                  <SidebarMenuItem key={item.name}>
                    <SidebarMenuButton 
                      asChild 
                      isActive={isActive}
                      tooltip={item.name}
                      className={cn(
                        "w-full px-4 py-2.5 rounded-full text-xs font-medium tracking-tight transition-all duration-200 cursor-pointer",
                        isActive 
                          ? "bg-primary text-primary-foreground shadow-[0_16px_40px_-12px_rgba(0,0,0,0.02)] dark:bg-zinc-800" 
                          : "text-zinc-500 dark:text-zinc-400 hover:bg-muted hover:text-foreground"
                      )}
                    >
                      <Link href={item.href}>
                        <item.icon className={cn("w-4 h-4 shrink-0", isActive ? "stroke-[1.5]" : "opacity-80")} />
                        <span>{item.name}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* MARKETING & GROWTH TOOLS */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 tracking-widest uppercase mb-2 px-3">
            Growth
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {marketingItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <SidebarMenuItem key={item.name}>
                    <SidebarMenuButton 
                      asChild 
                      isActive={isActive}
                      tooltip={item.name}
                      className={cn(
                        "w-full px-4 py-2.5 rounded-full text-xs font-medium tracking-tight transition-all duration-200 cursor-pointer",
                        isActive 
                          ? "bg-primary text-primary-foreground shadow-[0_16px_40px_-12px_rgba(0,0,0,0.02)] dark:bg-zinc-800" 
                          : "text-zinc-500 dark:text-zinc-400 hover:bg-muted hover:text-foreground"
                      )}
                    >
                      <Link href={item.href}>
                        <item.icon className={cn("w-4 h-4 shrink-0", isActive ? "stroke-[2]" : "opacity-80")} />
                        <span>{item.name}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

      </SidebarContent>

      {/* SYSTEM PREFERENCES UTILITY FOOTER */}
      <SidebarFooter className="p-3 border-t border-border/40 space-y-1">
        <SidebarMenu>
          
          {/* BACK TO PUBLIC MARKETPLACE */}
          <SidebarMenuItem>
            <SidebarMenuButton 
              asChild 
              tooltip="View Marketplace"
              className="w-full px-4 py-2.5 rounded-full text-xs font-medium tracking-tight text-zinc-500 dark:text-zinc-400 hover:bg-muted hover:text-foreground cursor-pointer"
            >
              <Link href="/">
                <IconSmartHome  className="w-4 h-4 shrink-0" />
                <span>MarketPlace</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>

          {/* DYNAMIC THEME SYSTEM TOGGLE PANEL */}
          <SidebarMenuItem>
            <SidebarMenuButton 
              onClick={toggleTheme}
              tooltip={!mounted ? "Loading Theme" : isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
              className="w-full px-4 py-2.5 rounded-full text-xs font-medium tracking-tight text-zinc-500 dark:text-zinc-400 hover:bg-muted hover:text-foreground cursor-pointer"
            >
              {!mounted ? (
                <>
                  <div className="w-4 h-4 rounded-full border border-zinc-300 dark:border-zinc-700 animate-pulse shrink-0" />
                  <span className="text-muted-foreground/60">Loading...</span>
                </>
              ) : isDark ? (
                <>
                  <Sun className="w-4 h-4 text-amber-500 shrink-0 animate-in fade-in zoom-in-75 duration-200" />
                  <span>Light Mode</span>
                </>
              ) : (
                <>
                  <Moon className="w-4 h-4 text-zinc-400 shrink-0 animate-in fade-in zoom-in-75 duration-200" />
                  <span>Dark Mode</span>
                </>
              )}
            </SidebarMenuButton>
          </SidebarMenuItem>

        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}