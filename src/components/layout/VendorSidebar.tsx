"use client";

import * as React from "react";
import {
  LayoutDashboard,
  MessageSquare,
  Package,
  Settings,
  ShoppingBag,
  ShoppingCart,
  Wallet,
} from "lucide-react";
import { useVendor } from "@/hooks/use-vendor";
import {
  DashboardSidebar,
  type DashboardNavigationGroup,
} from "@/components/layout/DashboardSidebar";

const navigationGroups: DashboardNavigationGroup[] = [
  {
    label: "Operations",
    items: [
      { label: "Dashboard", href: "/vendor", icon: LayoutDashboard },
      { label: "Orders", href: "/vendor/orders", icon: ShoppingCart },
      { label: "Products", href: "/vendor/products", icon: Package },
      { label: "Reviews", href: "/vendor/reviews", icon: MessageSquare },
    ],
  },
  {
    label: "Finance",
    items: [
      { label: "Earnings & withdrawals", href: "/vendor/finance", icon: Wallet },
    ],
  },
  {
    label: "Shop management",
    items: [{ label: "Store settings", href: "/vendor/settings", icon: Settings }],
  },
];

export function VendorSidebar(
  props: Omit<React.ComponentProps<typeof DashboardSidebar>, "workspace" | "navigationGroups">,
) {
  const { profile, loading } = useVendor();
  return (
    <DashboardSidebar
      {...props}
      workspace={{
        name: profile?.storeName || "Your shop",
        description: profile?.city
          ? `Vendor workspace · ${profile.city}`
          : "Vendor workspace",
        icon: ShoppingBag,
        logoUrl: profile?.logoUrl,
        loading,
      }}
      navigationGroups={navigationGroups}
    />
  );
}
