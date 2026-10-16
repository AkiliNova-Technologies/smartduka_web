"use client";

import * as React from "react";
import {
  LayoutDashboard,
  MessageSquare,
  Package,
  Warehouse,
  Settings,
  ShoppingBag,
  ShoppingCart,
  ReceiptText,
  Megaphone,
  CreditCard,
  ShieldCheck,
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
      { label: "Overview", href: "/vendor", icon: LayoutDashboard },
      { label: "Orders", href: "/vendor/orders", icon: ShoppingCart },
      { label: "Transactions", href: "/vendor/transactions", icon: ReceiptText },
      { label: "Marketing", href: "/vendor/marketing", icon: Megaphone },
      { label: "Subscription", href: "/vendor/subscription", icon: CreditCard },
      { label: "Products", href: "/vendor/products", icon: Package },
      { label: "Inventory", href: "/vendor/inventory", icon: Warehouse },
      { label: "Reviews", href: "/vendor/reviews", icon: MessageSquare },
      { label: "Verification", href: "/vendor/settings/verification", icon: ShieldCheck },
    ],
  },
  {
    label: "Settings",
    items: [
      { label: "Shop settings", href: "/vendor/settings", icon: Settings },
    ],
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
