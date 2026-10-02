"use client";

import { usePathname } from "next/navigation";
import { LayoutDashboard, Settings, Store } from "lucide-react";
import { DashboardHeader } from "@/components/layout/DashboardHeader";

function titleFor(pathname: string) {
  if (pathname.startsWith("/vendor/orders")) return "Orders Pipeline";
  if (pathname.startsWith("/vendor/products/new")) return "New Product";
  if (pathname.startsWith("/vendor/products")) return "Stock & Inventory";
  if (pathname.startsWith("/vendor/settings")) return "Store Settings";
  if (pathname.startsWith("/vendor/finance")) return "Earnings & withdrawals";
  return "Dashboard Overview";
}

export function VendorHeader() {
  const pathname = usePathname();
  return <DashboardHeader context="Vendor" title={titleFor(pathname)} accountLinks={[{ href: "/vendor", label: "Vendor dashboard", icon: LayoutDashboard }, { href: "/vendor/settings", label: "Store settings", icon: Store }, { href: "/settings", label: "My account", icon: Settings }]} />;
}
