"use client";

import * as React from "react";
import {
  CircleAlert,
  BellRing,
  DatabaseZap,
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
  ReceiptText,
} from "lucide-react";
import {
  DashboardSidebar,
  type DashboardNavigationGroup,
} from "@/components/layout/DashboardSidebar";
import { useAuth } from "@/providers/AuthProvider";
import { brand } from "@/config/brand";

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
    { label: "Marketplace reports", href: "/admin/reports", icon: ShieldCheck },
    { label: "Shop verification", href: "/admin/verifications", icon: ShieldCheck },
    { label: "Customer issues", href: "/admin/issues", icon: CircleAlert },
    { label: "Financial exceptions", href: "/admin/financial-exceptions", icon: Landmark },
  ] },
  { label: "Payments", items: [
    { label: "Payment operations", href: "/admin/payments", icon: ScanSearch },
  ] },
];

export function AdminSidebar(
  props: Omit<React.ComponentProps<typeof DashboardSidebar>, "workspace" | "navigationGroups">,
) {
  const { userRole } = useAuth();
  const canManageBilling = ["SUPER_ADMIN", "ADMIN", "BILLING"].includes(userRole ?? "");
  const canManageAnnouncements = ["SUPER_ADMIN", "ADMIN"].includes(userRole ?? "");
  const groups = navigationGroups.map((group) => {
    if (group.label === "Payments") return { ...group, items: canManageBilling ? [...group.items, { label: "Platform Revenue", href: "/admin/revenue", icon: ReceiptText }] : [] };
    if (group.label === "Marketing" && canManageBilling) return { ...group, items: [...group.items, { label: "Promotion capacity", href: "/admin/marketing/capacity", icon: LayoutGrid }] };
    if (group.label === "Operations" && userRole === "SUPER_ADMIN") return { ...group, items: [...group.items, { label: "Test data cleanup", href: "/admin/test-data-cleanup", icon: DatabaseZap }] };
    if (group.label === "Customers" && canManageAnnouncements) return { ...group, items: [...group.items, { label: "Notifications", href: "/admin/notifications", icon: BellRing }] };
    return group;
  }).filter((group) => group.items.length);
  return <DashboardSidebar {...props} workspace={{ name: `${brand.name} Admin`, description: "Administration workspace", icon: ShieldCheck }} navigationGroups={groups} />;
}
