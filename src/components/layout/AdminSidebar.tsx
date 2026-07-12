"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, ShoppingCart, Package, FileChartColumn,
  Store, Moon, Sun, LayoutGrid, ShieldCheck
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/hooks/use-theme";
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
import { IconTrolley } from "@tabler/icons-react";

const managementItems = [
  { name: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { name: "Categories", href: "/admin/categories", icon: LayoutGrid },
  { name: "Vendors & Shops", href: "/admin/vendors", icon: Store },
  { name: "All Products", href: "/admin/products", icon: Package },
];

const analyticItems = [
  { name: "Global Orders", href: "/admin/orders", icon: ShoppingCart },
  { name: "Customer Complaints", href: "/admin/complaints", icon: FileChartColumn },
];

const emptySubscribe = () => () => {};

export function AdminSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname();
  const { state } = useSidebar();
  const { isDark, toggleTheme } = useTheme();
  
  const mounted = React.useSyncExternalStore(
    emptySubscribe,
    () => true,  
    () => false 
  );

  return (
    <Sidebar 
      collapsible="icon" 
      className="border-r border-border/60 bg-card text-card-foreground transition-all"
      {...props}
    >
      <SidebarHeader className="p-4 flex flex-row items-center gap-3 select-none overflow-hidden h-18 border-b border-border/40">
        <div className="w-9 h-9 bg-primary text-primary-foreground rounded-xl flex items-center justify-center shadow-xs shrink-0 transition-transform duration-300 hover:rotate-6">
          <ShieldCheck className="w-4 h-4 stroke-[2.2]" />
        </div>
        {state === "expanded" && (
          <div className="flex flex-col gap-0.5 leading-none transition-fadeIn animate-in fade-in duration-200">
            <h1 className="font-medium text-sm tracking-tight text-foreground">
              SmartDuka Admin
            </h1>
            <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
              System Root
            </span>
          </div>
        )}
      </SidebarHeader>

      <SidebarContent className="px-2 py-4 space-y-4 rounded-xl">
        
        {/* MANAGEMENT PIPELINE */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] font-medium text-muted-foreground tracking-widest uppercase mb-2 px-3">
            Management
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {managementItems.map((item) => {
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
                          ? "bg-primary text-primary-foreground shadow-xs" 
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
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

        {/* ANALYTICS & REPORTS */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] font-medium text-muted-foreground tracking-widest uppercase mb-2 px-3">
            Analytics
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {analyticItems.map((item) => {
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
                          ? "bg-primary text-primary-foreground shadow-xs" 
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
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

      <SidebarFooter className="p-3 border-t border-border/40 space-y-1">
        <SidebarMenu>
          
          <SidebarMenuItem>
            <SidebarMenuButton 
              asChild 
              tooltip="Marketplace"
              className="w-full px-4 py-2.5 rounded-full text-xs font-medium tracking-tight text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer"
            >
              <Link href="/">
                <IconTrolley className="w-4 h-4 shrink-0" />
                <span>Marketplace</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>

          <SidebarMenuItem>
            <SidebarMenuButton 
              onClick={toggleTheme}
              tooltip={!mounted ? "Loading Theme" : isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
              className="w-full px-4 py-2.5 rounded-full text-xs font-medium tracking-tight text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer"
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