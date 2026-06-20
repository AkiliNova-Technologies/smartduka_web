"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  ShoppingBag, Home, LayoutGrid, Tag, Sparkles, 
  Store, Layers, Heart, Ticket, 
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
  { name: "Home", href: "/products", icon: Home },
  { name: "Categories", href: "/categories", icon: LayoutGrid },
  { name: "Deals", href: "/deals", icon: Tag },
  { name: "New Arrivals", href: "/new-arrivals", icon: Sparkles },
  { name: "Brands", href: "/brands", icon: Store },
  { name: "Collections", href: "/collections", icon: Layers },
];

const workspaceItems = [
  { name: "My Orders", href: "/orders", icon: ShoppingBag },
  { name: "Wishlist", href: "/wishlist", icon: Heart },
  { name: "Coupons", href: "/coupons", icon: Ticket },
  { name: "Settings", href: "/settings", icon: Settings },
];

export function CustomerSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname();
  const { state } = useSidebar();
  
  const { isDark, toggleTheme } = useTheme();

  return (
    <Sidebar 
      collapsible="icon" 
      className="dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 transition-all duration-300"
      {...props}
    >
      {/* BRAND IDENTITY HEADER */}
      <SidebarHeader className="p-4 flex flex-row items-center gap-3 select-none overflow-hidden h-20 border-b border-zinc-100/60 dark:border-zinc-900">
        <div className="w-9 h-9 bg-emerald-700 dark:bg-emerald-600 rounded-xl flex items-center justify-center text-white shadow-sm shrink-0 transition-transform duration-300 hover:rotate-6">
          <ShoppingBag className="w-4 h-4 stroke-[2.5]" />
        </div>
        {state === "expanded" && (
          <h1 className="font-bold text-lg tracking-tight text-zinc-900 dark:text-zinc-50 transition-fadeIn">
            Smart<span className="text-emerald-700 dark:text-emerald-500">Duka</span>
          </h1>
        )}
      </SidebarHeader>

      {/* CORE HUB NAVIGATION */}
      <SidebarContent className="px-2 py-4 space-y-4 rounded-xl">
        
        {/* DISCOVER SECTION */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 tracking-widest uppercase mb-1">
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
                        "w-full px-3 py-2.5 rounded-full text-xs font-semibold tracking-tight transition-all duration-200",
                        isActive 
                          ? "bg-emerald-700 text-white dark:bg-emerald-600 dark:text-white shadow-xs" 
                          : "text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900 hover:text-zinc-900 dark:hover:text-zinc-100"
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
          <SidebarGroupLabel className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 tracking-widest uppercase mb-1">
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
                        "w-full px-3 py-2.5 rounded-full text-xs font-semibold tracking-tight transition-all duration-200",
                        isActive 
                          ? "bg-emerald-700 text-white dark:bg-emerald-600 dark:text-white shadow-xs" 
                          : "text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900 hover:text-zinc-900 dark:hover:text-zinc-100"
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
      <SidebarFooter className="p-3 border-t border-zinc-100/60 dark:border-zinc-900 space-y-1">
        <SidebarMenu>
          
          {/* HELP HUB TRIGGER */}
          <SidebarMenuItem>
            <SidebarMenuButton 
              asChild 
              isActive={pathname === "/help"}
              tooltip="Help Center"
              className={cn(
                "w-full px-3 py-2.5 rounded-full text-xs font-semibold tracking-tight transition-all",
                pathname === "/help"
                  ? "bg-emerald-700 text-white dark:bg-emerald-600 shadow-xs"
                  : "text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900 hover:text-zinc-900 dark:hover:text-zinc-100"
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
              tooltip={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
              className="w-full px-3 py-2.5 rounded-full text-xs font-semibold tracking-tight text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900 hover:text-zinc-900 dark:hover:text-zinc-100"
            >
              {isDark ? (
                <>
                  <Sun className="w-4 h-4 text-amber-500 shrink-0" />
                  <span>Light Mode</span>
                </>
              ) : (
                <>
                  <Moon className="w-4 h-4 text-zinc-400 shrink-0" />
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