import type { LucideIcon } from "lucide-react";
import { DashboardMetricCard } from "@/components/dashboard-metric-card";

export function AdminMetricCard({ label, value, icon, helper, tone = "default" }: { label: string; value: React.ReactNode; icon: LucideIcon; helper?: React.ReactNode; tone?: "default" | "success" | "warning" | "danger" | "info" }) {
  return <DashboardMetricCard label={label} value={value} icon={icon} description={helper} tone={tone} />;
}
