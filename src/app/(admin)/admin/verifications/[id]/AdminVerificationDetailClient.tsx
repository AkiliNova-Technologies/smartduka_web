"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Download, Eye, FileText } from "lucide-react";
import { DashboardPageHeader } from "@/components/dashboard-page-header";
import { DeleteDialog } from "@/components/alert-dialog";
import { ShopVerificationStatusBadge, verificationLabel } from "@/components/marketplace/shop-verification-status-badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

const actions: Record<string, string[]> = { PENDING: ["UNDER_REVIEW"], UNDER_REVIEW: ["NEEDS_INFORMATION", "VERIFIED", "REJECTED"], NEEDS_INFORMATION: ["UNDER_REVIEW"], VERIFIED: ["SUSPENDED", "REVOKED"], SUSPENDED: ["VERIFIED", "REVOKED"] };
const reasons = new Set(["NEEDS_INFORMATION", "REJECTED", "SUSPENDED", "REVOKED"]);
const activityLabels: Record<string, string> = { APPLICATION_SUBMITTED: "Application submitted", REVIEW_STARTED: "Review started", INFORMATION_REQUESTED: "More information requested", INFORMATION_PROVIDED: "Information submitted", APPROVED: "Verification approved", REJECTED: "Verification rejected", SUSPENDED: "Verification suspended", REINSTATED: "Verification restored", REVOKED: "Verification revoked", INTERNAL_NOTE_ADDED: "Internal note added", ASSIGNED: "Reviewer assigned", REASSIGNED: "Reviewer reassigned" };

type VerificationSnapshot = { shopName?: string; legalName?: string; contact?: { email?: string; phone?: string }; kycStatus?: string; address?: string };
type VerificationApplication = {
  publicId: string; status: string; submittedAt: string; assignedAdminId: string | null; snapshot: VerificationSnapshot;
  vendorApplicationId: string | null;
  vendor: { storeName: string; owner: { name: string | null; email: string } };
  documents: Array<{ id: string; source: string; type: string; name: string; status: string; uploadedAt: string; submittedAt: string; viewUrl: string; downloadUrl: string }>;
  context: { openReports: number; severeReports: number; openRiskFlags: number };
  notes: Array<{ id: string; body: string; createdAt: string; admin: { name: string } }>;
  activities: Array<{ id: string; type: string; toValue: string | null; createdAt: string; actor: { name: string } | null }>;
};
type AdminOption = { id: string; name: string; platformRole: string | null };
type ApiResult<T> = { success: true; data: T } | { success: false; error?: string };

export function AdminVerificationDetailClient({ reportId }: { reportId: string }) {
  const [app, setApp] = useState<VerificationApplication>();
  const [admins, setAdmins] = useState<AdminOption[]>([]);
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [confirmAction, setConfirmAction] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const response = await fetch(`/api/admin/verifications/${reportId}`);
      const value = await response.json() as ApiResult<{ application: VerificationApplication }>;
      if (value.success) setApp(value.data.application); else setError("Unable to load verification case.");
    } catch { setError("Unable to load verification case."); }
  }, [reportId]);

  useEffect(() => {
    const task = window.setTimeout(() => void load(), 0);
    void fetch("/api/admin/verifications?admins=1").then((response) => response.json() as Promise<ApiResult<{ admins: AdminOption[] }>>).then((value) => { if (value.success) setAdmins(value.data.admins || []); });
    return () => window.clearTimeout(task);
  }, [load]);

  const update = async (body: object) => {
    setSaving(true); setError("");
    const response = await fetch(`/api/admin/verifications/${reportId}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    const json = await response.json() as { error?: string };
    setSaving(false);
    if (!response.ok) return setError(json.error || "Update failed.");
    setReason(""); setNote(""); void load();
  };

  if (!app) return <p className="text-sm text-muted-foreground">{error || "Loading verification case…"}</p>;
  const snapshot = app.snapshot;

  return <main className="w-full space-y-6">
    <DashboardPageHeader title="Verification Review" description={<>{app.publicId} · {app.vendor.storeName} · {app.vendor.owner.name || app.vendor.owner.email} · submitted {new Date(app.submittedAt).toLocaleDateString("en-UG", { dateStyle: "medium" })}</>} backHref="/admin/verifications" trailing={<>{app.vendorApplicationId && <Link href={`/admin/vendors?applicationId=${app.vendorApplicationId}`} className="text-xs font-medium text-primary hover:underline">Open vendor details →</Link>}<ShopVerificationStatusBadge status={app.status} /></>} />
    {error && <div role="alert" className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">{error}</div>}
    <div className="grid gap-4 lg:grid-cols-3">
      <section className="space-y-5 rounded-2xl border border-border/60 bg-card p-5 lg:col-span-2">
        <div><h2 className="text-sm font-medium">Application overview</h2><p className="mt-1 text-xs text-muted-foreground">Information supplied when this application was submitted.</p></div>
        <dl className="grid gap-4 text-sm sm:grid-cols-2"><div><dt className="text-xs text-muted-foreground">Shop / legal name</dt><dd className="mt-1">{snapshot.shopName} · {snapshot.legalName}</dd></div><div><dt className="text-xs text-muted-foreground">Contact</dt><dd className="mt-1">{snapshot.contact?.email} · {snapshot.contact?.phone}</dd></div><div><dt className="text-xs text-muted-foreground">KYC status</dt><dd className="mt-1">{verificationLabel(snapshot.kycStatus)}</dd></div><div><dt className="text-xs text-muted-foreground">Address</dt><dd className="mt-1">{snapshot.address || "Not recorded"}</dd></div></dl>
        <div className="grid gap-3 sm:grid-cols-2"><div className="rounded-xl bg-muted/50 p-3"><p className="text-sm font-medium">Marketplace reports</p><p className="mt-1 text-xs text-muted-foreground">{app.context.openReports} open · {app.context.severeReports} high or critical</p></div><div className="rounded-xl bg-muted/50 p-3"><p className="text-sm font-medium">Risk flags</p><p className="mt-1 text-xs text-muted-foreground">{app.context.openRiskFlags} open flags</p></div></div>
        <label className="block text-sm font-medium">Assign reviewer<select value={app.assignedAdminId || ""} onChange={(event) => event.target.value && void update({ assignedAdminId: event.target.value })} className="mt-2 h-10 w-full rounded-md border bg-background px-3 text-sm"><option value="">Unassigned</option>{admins.map((admin) => <option key={admin.id} value={admin.id}>{admin.name} · {admin.platformRole}</option>)}</select></label>
      </section>
      <section className="rounded-2xl border border-border/60 bg-card p-5"><h2 className="text-sm font-medium">Case actions</h2><p className="mt-1 text-xs text-muted-foreground">Only actions valid for this case are available.</p><Textarea value={reason} onChange={(event) => setReason(event.target.value)} className="mt-4 min-h-24" placeholder="Reason for the selected action"/><div className="mt-3 grid gap-2">{(actions[app.status] || []).map((status) => <Button key={status} variant={status === "REVOKED" || status === "REJECTED" ? "destructive" : "default"} disabled={saving || (reasons.has(status) && reason.trim().length < 3)} onClick={() => ["REVOKED", "SUSPENDED"].includes(status) ? setConfirmAction(status) : void update({ status, reason })}>{verificationLabel(status)}</Button>)}</div></section>
    </div>
    <section className="rounded-2xl border border-border/60 bg-card p-5"><div className="flex items-center gap-2"><FileText className="size-4 text-muted-foreground"/><div><h2 className="text-sm font-medium">Submitted documents</h2><p className="mt-1 text-xs text-muted-foreground">Exact document records attached when this application was submitted.</p></div></div><div className="mt-4 grid gap-3 sm:grid-cols-2">{app.documents.length ? app.documents.map((document) => <article key={`${document.source}-${document.id}`} className="rounded-xl border border-border/50 bg-muted/20 p-3"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate text-sm font-medium">{document.name}</p><p className="mt-1 text-xs text-muted-foreground">{document.type.replaceAll("_", " ")} · {document.status.replaceAll("_", " ")}</p><p className="mt-1 text-[10px] text-muted-foreground">Uploaded {new Date(document.uploadedAt).toLocaleString("en-UG", { dateStyle: "medium", timeStyle: "short" })}</p><p className="mt-1 text-[10px] text-muted-foreground">Submitted {new Date(document.submittedAt).toLocaleString("en-UG", { dateStyle: "medium", timeStyle: "short" })}</p></div><div className="flex shrink-0 gap-1"><a href={document.viewUrl} target="_blank" rel="noopener noreferrer" className="rounded-lg p-2 hover:bg-muted" aria-label={`Preview ${document.name}`}><Eye className="size-4"/></a><a href={document.downloadUrl} className="rounded-lg p-2 hover:bg-muted" aria-label={`Download ${document.name}`}><Download className="size-4"/></a></div></div></article>) : <p className="text-sm text-muted-foreground">No submitted documents are linked to this application.</p>}</div></section>
    <div className="grid gap-4 lg:grid-cols-2">
      <section className="rounded-2xl border border-border/60 bg-card p-5"><h2 className="text-sm font-medium">Internal notes</h2><div className="mt-4 space-y-3">{app.notes.length ? app.notes.map((item) => <article key={item.id} className="rounded-xl bg-muted/50 p-3 text-sm"><p>{item.body}</p><p className="mt-2 text-xs text-muted-foreground">{item.admin.name} · {new Date(item.createdAt).toLocaleString("en-UG", { dateStyle: "medium", timeStyle: "short" })}</p></article>) : <p className="text-sm text-muted-foreground">No internal notes yet.</p>}</div><Textarea value={note} onChange={(event) => setNote(event.target.value)} className="mt-4 min-h-20" placeholder="Add internal note"/><Button size="sm" className="mt-2" disabled={saving || note.trim().length < 2} onClick={() => void update({ note })}>Add note</Button></section>
      <section className="rounded-2xl border border-border/60 bg-card p-5"><h2 className="text-sm font-medium">Activity</h2><ol className="mt-4 space-y-4 border-l border-border pl-4">{app.activities.map((activity) => <li key={activity.id} className="relative text-sm before:absolute before:-left-[21px] before:top-1.5 before:size-2 before:rounded-full before:bg-primary"><p className="font-medium">{activityLabels[activity.type] || verificationLabel(activity.toValue)}</p><p className="mt-1 text-xs text-muted-foreground">{activity.actor?.name || "System"} · {new Date(activity.createdAt).toLocaleString("en-UG", { dateStyle: "medium", timeStyle: "short" })}</p></li>)}</ol></section>
    </div>
    <DeleteDialog open={!!confirmAction} onOpenChange={(open) => !open && setConfirmAction(null)} title="Confirm verification action" description={`Are you sure you want to mark this application as ${verificationLabel(confirmAction).toLowerCase()}?`} itemType="action" variant="warning" isDeleting={saving} onConfirm={async () => { if (confirmAction) { await update({ status: confirmAction, reason }); setConfirmAction(null); } }}/>
  </main>;
}
