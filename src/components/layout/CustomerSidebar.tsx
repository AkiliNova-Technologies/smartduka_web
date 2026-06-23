"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  ShoppingBag, Home, LayoutGrid, Tag, Sparkles, 
  Store, Heart, Ticket, 
  Settings, Headphones, Moon, Sun 
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

const discoverItems = [
  { name: "Home", href: "/", icon: Home },
  { name: "Categories", href: "/categories", icon: LayoutGrid },
  { name: "Deals", href: "/deals", icon: Tag },
  { name: "New Arrivals", href: "/new-arrivals", icon: Sparkles },
  { name: "Brands", href: "/brands", icon: Store },
];

const workspaceItems = [
  { name: "My Orders", href: "/orders", icon: ShoppingBag },
  { name: "Wishlist", href: "/wishlist", icon: Heart },
  { name: "Coupons", href: "/coupons", icon: Ticket },
  { name: "Settings", href: "/settings", icon: Settings },
];

const emptySubscribe = () => () => {};

export function CustomerSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
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
      className="border-r border-border/60 bg-card text-card-foreground transition-all duration-300"
      {...props}
    >
      {/* BRAND IDENTITY HEADER */}
      <SidebarHeader className="p-4 flex flex-row items-center gap-3 select-none overflow-hidden h-18 border-b border-border/40">
        <div className="w-9 h-9 bg-primary text-primary-foreground rounded-xl flex items-center justify-center shadow-xs shrink-0 transition-transform duration-300 hover:rotate-6">
          <ShoppingBag className="w-4 h-4 stroke-[2.5]" />
        </div>
        {state === "expanded" && (
          <h1 className="font-bold text-lg tracking-tight text-zinc-900 dark:text-zinc-50 transition-fadeIn">
            Smart<span className="text-primary">Duka</span>
          </h1>
        )}
      </SidebarHeader>

      {/* CORE HUB NAVIGATION */}
      <SidebarContent className="px-2 py-4 space-y-4 rounded-xl">
        
        {/* DISCOVER SECTION */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 tracking-widest uppercase mb-2 px-3">
            Discover
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {discoverItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <SidebarMenuItem key={item.name}>
                    <SidebarMenuButton 
                      asChild 
                      isActive={isActive}
                      tooltip={item.name}
                      className={cn(
                        "w-full px-4 py-2.5 rounded-full text-xs font-bold tracking-tight transition-all duration-200 cursor-pointer",
                        isActive 
                          ? "bg-primary text-primary-foreground shadow-xs" 
                          : "text-zinc-500 dark:text-zinc-400 hover:bg-muted hover:text-foreground"
                      )}
                    >
                      <Link href={item.href}>
                        <item.icon className={cn("w-4 h-4 shrink-0", isActive ? "stroke-[2.5]" : "opacity-80")} />
                        <span>{item.name}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* WORKSPACE SECTION */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 tracking-widest uppercase mb-2 px-3">
            Workspace
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {workspaceItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <SidebarMenuItem key={item.name}>
                    <SidebarMenuButton 
                      asChild 
                      isActive={isActive}
                      tooltip={item.name}
                      className={cn(
                        "w-full px-4 py-2.5 rounded-full text-xs font-bold tracking-tight transition-all duration-200 cursor-pointer",
                        isActive 
                          ? "bg-primary text-primary-foreground shadow-xs" 
                          : "text-zinc-500 dark:text-zinc-400 hover:bg-muted hover:text-foreground"
                      )}
                    >
                      <Link href={item.href}>
                        <item.icon className={cn("w-4 h-4 shrink-0", isActive ? "stroke-[2.5]" : "opacity-80")} />
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
          
          {/* HELP HUB TRIGGER */}
          <SidebarMenuItem>
            <SidebarMenuButton 
              asChild 
              isActive={pathname === "/help"}
              tooltip="Help Center"
              className={cn(
                "w-full px-4 py-2.5 rounded-full text-xs font-bold tracking-tight transition-all cursor-pointer",
                pathname === "/help"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-zinc-500 dark:text-zinc-400 hover:bg-muted hover:text-foreground"
              )}
            >
              <Link href="/help">
                <Headphones className="w-4 h-4 shrink-0" />
                <span>Help Center</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>

          {/* DYNAMIC THEME SYSTEM SWITCH TOKENS */}
          <SidebarMenuItem>
            <SidebarMenuButton 
              onClick={toggleTheme}
              tooltip={!mounted ? "Loading Theme" : isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
              className="w-full px-4 py-2.5 rounded-full text-xs font-bold tracking-tight text-zinc-500 dark:text-zinc-400 hover:bg-muted hover:text-foreground cursor-pointer"
            >
              {/* Check mount status before evaluating dynamic theme variables */}
              {!mounted ? (
                <>
                  <div className="w-4 h-4 rounded-full border border-zinc-300 dark:border-zinc-700 animate-pulse shrink-0" />
                  <span className="text-muted-foreground/60">Loading Theme...</span>
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