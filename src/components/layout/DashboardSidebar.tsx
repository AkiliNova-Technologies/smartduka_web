"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, type LucideIcon, ShoppingBag } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";

export type DashboardNavigationItem = { label: string; href: string; icon: LucideIcon };
export type DashboardNavigationGroup = { label: string; items: DashboardNavigationItem[] };

export function isActiveDashboardRoute(pathname: string, href: string) {
  return href.endsWith("/vendor") || href.endsWith("/admin")
    ? pathname === href
    : pathname === href || pathname.startsWith(`${href}/`);
}

export function DashboardSidebar({
  workspace,
  navigationGroups,
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  workspace: { name: string; description: string; icon?: LucideIcon; logoUrl?: string | null; loading?: boolean };
  navigationGroups: DashboardNavigationGroup[];
}) {
  const pathname = usePathname();
  const { isMobile, setOpenMobile, state } = useSidebar();
  const [failedLogoUrl, setFailedLogoUrl] = React.useState<string | null>(null);
  const WorkspaceIcon = workspace.icon ?? ShoppingBag;
  const closeMobileSidebar = () => { if (isMobile) setOpenMobile(false); };

  const imageFailed = failedLogoUrl === workspace.logoUrl;

  return (
    <Sidebar collapsible="icon" className="border-r border-border/60 bg-sidebar text-sidebar-foreground transition-[width] duration-200" {...props}>
      <SidebarHeader className="flex h-16 flex-row items-center gap-3 overflow-hidden border-b border-border/60 px-4 py-3 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-2">
        <span className="relative flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-primary text-primary-foreground">
          {workspace.logoUrl && !imageFailed ? <Image alt="" src={workspace.logoUrl} fill sizes="36px" className="object-cover" onError={() => setFailedLogoUrl(workspace.logoUrl ?? null)} /> : <WorkspaceIcon className="size-4" aria-hidden="true" />}
        </span>
        {state === "expanded" && <div className="min-w-0 leading-tight">{workspace.loading ? <><Skeleton className="h-4 w-28" /><Skeleton className="mt-1 h-3 w-20" /></> : <><p className="truncate text-sm font-semibold text-foreground">{workspace.name}</p><p className="truncate text-xs text-muted-foreground">{workspace.description}</p></>}</div>}
      </SidebarHeader>
      <SidebarContent className="px-2 py-4">
        <nav aria-label={`${workspace.name} navigation`}>
          {navigationGroups.map((group) => <SidebarGroup key={group.label} className="py-0 pb-4">
            <SidebarGroupLabel className="px-3 pb-1 text-xs font-medium tracking-wide text-muted-foreground">{group.label}</SidebarGroupLabel>
            <SidebarGroupContent><SidebarMenu>{group.items.map((item) => {
              const isActive = isActiveDashboardRoute(pathname, item.href);
              return <SidebarMenuItem key={item.href}><SidebarMenuButton asChild isActive={isActive} tooltip={item.label} className={cn("h-10 rounded-lg px-3 text-sm font-medium transition-colors", isActive ? "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground")}><Link href={item.href} aria-current={isActive ? "page" : undefined} onClick={closeMobileSidebar}><item.icon className="size-[18px] shrink-0" /><span>{item.label}</span></Link></SidebarMenuButton></SidebarMenuItem>;
            })}</SidebarMenu></SidebarGroupContent>
          </SidebarGroup>)}
        </nav>
      </SidebarContent>
      <SidebarFooter className="border-t border-border/60 p-3"><SidebarMenu><SidebarMenuItem><SidebarMenuButton asChild tooltip="Marketplace" className="h-10 rounded-lg px-3 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"><Link href="/" onClick={closeMobileSidebar}><Home className="size-[18px] shrink-0" /><span>Marketplace</span></Link></SidebarMenuButton></SidebarMenuItem></SidebarMenu></SidebarFooter>
    </Sidebar>
  );
}
