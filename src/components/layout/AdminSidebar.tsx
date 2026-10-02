"use client";

import * as React from "react";
import {
  CircleAlert,
  LayoutDashboard,
  Landmark,
  LayoutGrid,
  Megaphone,
  Package,
  ScanSearch,
  ShieldCheck,
  ShoppingCart,
  Star,
  Store,
  Users,
  WalletCards,
} from "lucide-react";
import {
  DashboardSidebar,
  type DashboardNavigationGroup,
} from "@/components/layout/DashboardSidebar";

const navigationGroups: DashboardNavigationGroup[] = [
  { label: "Overview", items: [{ label: "Dashboard", href: "/admin", icon: LayoutDashboard }] },
  { label: "Commerce", items: [
    { label: "Orders", href: "/admin/orders", icon: ShoppingCart },
    { label: "Products", href: "/admin/products", icon: Package },
    { label: "Categories", href: "/admin/categories", icon: LayoutGrid },
    { label: "Vendors & shops", href: "/admin/vendors", icon: Store },
  ] },
  { label: "Customers", items: [{ label: "Users", href: "/admin/users", icon: Users }] },
  { label: "Marketing", items: [
    { label: "Hero promotions", href: "/admin/marketing/promotions", icon: Megaphone },
    { label: "Featured products", href: "/admin/marketing/featured-products", icon: Star },
    { label: "Featured shops", href: "/admin/marketing/featured-shops", icon: Store },
  ] },
  { label: "Operations", items: [
    { label: "Customer issues", href: "/admin/issues", icon: CircleAlert },
    { label: "Financial exceptions", href: "/admin/financial-exceptions", icon: Landmark },
  ] },
  { label: "Finance", items: [
    { label: "Withdrawals", href: "/admin/finance/withdrawals", icon: WalletCards },
    { label: "Payment investigation", href: "/admin/finance/payments", icon: ScanSearch },
  ] },
];

export function AdminSidebar(
  props: Omit<React.ComponentProps<typeof DashboardSidebar>, "workspace" | "navigationGroups">,
) {
  return <DashboardSidebar {...props} workspace={{ name: "SmartDuka Admin", description: "Administration workspace", icon: ShieldCheck }} navigationGroups={navigationGroups} />;
}
