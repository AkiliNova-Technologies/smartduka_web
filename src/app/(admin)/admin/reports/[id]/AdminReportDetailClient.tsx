"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { DashboardPageHeader } from "@/components/dashboard-page-header";
import { StatusBadge } from "@/components/marketplace/status-badge";

const label = (value: string | null | undefined) => value ? value.replaceAll("_", " ").replace(/\b\w/g, (character) => character.toUpperCase()) : "—";
const transitions: Record<string, string[]> = { SUBMITTED: ["UNDER_REVIEW"], UNDER_REVIEW: ["AWAITING_INFORMATION", "ACTION_REQUIRED", "RESOLVED", "DISMISSED"], AWAITING_INFORMATION: ["UNDER_REVIEW"], ACTION_REQUIRED: ["UNDER_REVIEW", "RESOLVED"], RESOLVED: [], DISMISSED: [] };
const severities = ["UNASSESSED", "LOW", "MEDIUM", "HIGH", "CRITICAL"];
const resolutions = ["NO_VIOLATION", "PRODUCT_UPDATED", "PRODUCT_REMOVED", "SHOP_WARNED", "SHOP_RESTRICTED", "SHOP_SUSPENDED", "CONTENT_REMOVED", "REFERRED_FOR_FURTHER_REVIEW", "OTHER"];

type AdminOption = { id: string; name: string; platformRole: string | null };
type AdminReport = {
  publicId: string; targetTitleSnapshot: string; targetType: string; reason: string; status: string; productId: string | null; targetSlugSnapshot: string | null;
  reporter: { name: string; email: string } | null; createdAt: string; description: string | null; severity: string; assignedAdminId: string | null; assignedAdmin: { name: string } | null; assignedAt: string | null;
  notes: Array<{ id: string; body: string; createdAt: string; admin: { name: string } }>;
  activities: Array<{ id: string; type: string; fromValue: string | null; toValue: string | null; createdAt: string; actor: { name: string } | null }>;
};
type ApiResult<T> = { success: true; data: T } | { success: false; error: string };

export function AdminReportDetailClient({ reportId }: { reportId: string }) {
  const [report, setReport] = useState<AdminReport | null>(null);
  const [admins, setAdmins] = useState<AdminOption[]>([]);
  const [note, setNote] = useState("");
  const [resolution, setResolution] = useState("NO_VIOLATION");
  const [summary, setSummary] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const response = await fetch(`/api/admin/marketplace-reports/${reportId}`);
    const value = await response.json() as ApiResult<{ report: AdminReport }>;
    if (value.success) setReport(value.data.report); else setError(value.error);
  }, [reportId]);

  useEffect(() => {
    const task = window.setTimeout(() => void load(), 0);
    void fetch("/api/admin/marketplace-reports?admins=1").then((response) => response.json() as Promise<ApiResult<{ admins: AdminOption[] }>>).then((value) => { if (value.success) setAdmins(value.data.admins || []); });
    return () => window.clearTimeout(task);
  }, [load]);

  const update = async (body: object) => {
    setError("");
    const response = await fetch(`/api/admin/marketplace-reports/${reportId}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    const data = await response.json() as { error?: string };
    if (!response.ok) return setError(data.error || "Update failed.");
    setNote(""); setSummary(""); void load();
  };

  if (error && !report) return <p>{error}</p>;
  if (!report) return <p className="text-sm text-muted-foreground">Loading case…</p>;
  const next = transitions[report.status] || [];
  const live = report.targetType === "PRODUCT" && report.productId ? `/products/${report.targetSlugSnapshot}` : report.targetType === "SHOP" && report.targetSlugSnapshot ? `/shops/${report.targetSlugSnapshot}` : null;

  return <div className="space-y-6">
    <DashboardPageHeader title="Report Details" description={<>{report.publicId} · {report.targetTitleSnapshot} · {label(report.targetType)} · {label(report.reason)} {live && <Link href={live} className="ml-2 text-primary underline">View live target</Link>}</>} backHref="/admin/reports" trailing={<StatusBadge status={report.status} />} />
    {error && <p role="alert" className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
    <div className="grid gap-4 lg:grid-cols-3">
      <section className="space-y-4 rounded-xl border bg-card p-4 lg:col-span-2">
        <h2 className="font-semibold">Report</h2>
        <div className="grid gap-4 text-sm sm:grid-cols-2"><p><span className="text-muted-foreground">Reporter</span><br/>{report.reporter?.name}<br/><span className="text-xs text-muted-foreground">{report.reporter?.email}</span></p><p><span className="text-muted-foreground">Filed</span><br/>{new Date(report.createdAt).toLocaleString()}</p></div>
        <p className="whitespace-pre-wrap rounded-lg bg-muted/40 p-3 text-sm">{report.description || "No additional description."}</p>
        <div className="grid gap-3 sm:grid-cols-2"><label className="text-sm">Severity<select value={report.severity} onChange={(event) => void update({ severity: event.target.value })} className="mt-1 h-10 w-full rounded border bg-background px-2">{severities.map((value) => <option key={value} value={value}>{label(value)}</option>)}</select></label><label className="text-sm">Assign to<select value={report.assignedAdminId || ""} onChange={(event) => event.target.value && void update({ assignedAdminId: event.target.value })} className="mt-1 h-10 w-full rounded border bg-background px-2"><option value="">Unassigned</option>{admins.map((admin) => <option key={admin.id} value={admin.id}>{admin.name} · {label(admin.platformRole)}</option>)}</select></label></div>
        <p className="text-xs text-muted-foreground">Current assignee: {report.assignedAdmin?.name || "Unassigned"}{report.assignedAt ? ` · assigned ${new Date(report.assignedAt).toLocaleString()}` : ""}</p>
      </section>
      <section className="rounded-xl border bg-card p-4"><h2 className="font-semibold">Case action</h2><div className="mt-3 space-y-3"><p className="text-xs text-muted-foreground">Choose an action below after adding a closure summary where needed.</p>{["RESOLVED", "DISMISSED"].some((value) => next.includes(value)) && <><select value={resolution} onChange={(event) => setResolution(event.target.value)} className="h-10 w-full rounded border bg-background px-2">{resolutions.map((value) => <option key={value} value={value}>{label(value)}</option>)}</select><textarea value={summary} onChange={(event) => setSummary(event.target.value)} placeholder="Closure or dismissal note" className="min-h-20 w-full rounded border bg-background p-2 text-sm"/></>}<div className="flex flex-wrap gap-2">{next.filter((value) => !["RESOLVED", "DISMISSED"].includes(value)).map((value) => <button key={value} onClick={() => void update({ status: value })} className="rounded-lg border px-3 py-2 text-xs font-semibold">Mark {label(value)}</button>)}{next.includes("RESOLVED") && <button onClick={() => void update({ status: "RESOLVED", resolution, resolutionNote: summary })} className="rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground">Resolve</button>}{next.includes("DISMISSED") && <button onClick={() => void update({ status: "DISMISSED", resolutionNote: summary })} className="rounded-lg border border-destructive px-3 py-2 text-xs font-semibold text-destructive">Dismiss</button>}</div></div></section>
    </div>
    <div className="grid gap-4 lg:grid-cols-2">
      <section className="rounded-xl border bg-card p-4"><h2 className="font-semibold">Internal notes</h2><div className="mt-3 space-y-3">{report.notes.map((item) => <article key={item.id} className="rounded-lg bg-muted/40 p-3 text-sm"><p className="whitespace-pre-wrap">{item.body}</p><p className="mt-2 text-xs text-muted-foreground">{item.admin.name} · {new Date(item.createdAt).toLocaleString()}</p></article>)}</div><textarea value={note} onChange={(event) => setNote(event.target.value)} className="mt-3 min-h-20 w-full rounded border bg-background p-2 text-sm" placeholder="Add internal note"/><button disabled={!note.trim()} onClick={() => void update({ note })} className="mt-2 rounded-lg bg-secondary px-3 py-2 text-xs font-semibold disabled:opacity-50">Add note</button></section>
      <section className="rounded-xl border bg-card p-4"><h2 className="font-semibold">Activity</h2><ol className="mt-3 space-y-3 border-l pl-4">{report.activities.map((activity) => <li key={activity.id} className="text-sm"><p className="font-medium">{label(activity.type)}{activity.fromValue ? `: ${label(activity.fromValue)} → ${label(activity.toValue)}` : ""}</p><p className="text-xs text-muted-foreground">{activity.actor?.name || "System"} · {new Date(activity.createdAt).toLocaleString()}</p></li>)}</ol></section>
    </div>
  </div>;
}
