"use client";

import { usePathname } from "next/navigation";
import { LayoutDashboard, Settings } from "lucide-react";
import { DashboardHeader } from "@/components/layout/DashboardHeader";

function titleFor(pathname: string) {
  if (pathname.startsWith("/admin/orders")) return "Orders";
  if (pathname.startsWith("/admin/products")) return "Products";
  if (pathname.startsWith("/admin/vendors")) return "Vendors & shops";
  if (pathname.startsWith("/admin/finance")) return "Finance";
  if (pathname.startsWith("/admin/users")) return "Users";
  return "Admin workspace";
}

export function AdminHeader() {
  const pathname = usePathname();
  return <DashboardHeader context="Admin" title={titleFor(pathname)} accountLinks={[{ href: "/admin", label: "Admin dashboard", icon: LayoutDashboard }, { href: "/settings", label: "My account", icon: Settings }]} />;
}
