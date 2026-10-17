"use client";

import * as React from "react";
import { type ColumnDef } from "@tanstack/react-table";
import { CalendarClock, Eye, Megaphone, Pencil, Plus, Send, XCircle } from "lucide-react";
import { toast } from "sonner";
import { DashboardPageHeader } from "@/components/dashboard-page-header";
import { DataTable } from "@/components/data-table";
import { DataTableRowActions } from "@/components/data-table-row-actions";
import { DataTableStatusFilter } from "@/components/data-table-status-filter";
import { NotificationCard } from "@/components/notifications/NotificationsSheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { AnnouncementClient, type AnnouncementDraft, type AnnouncementRecord } from "@/lib/announcement-client";
import { AdminMetricCard } from "@/components/admin/admin-metric-card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MarketingCampaignsPanel } from "./MarketingCampaignsPanel";

const blank: AnnouncementDraft = { title: "", message: "", category: "GENERAL", priority: "NORMAL", audience: "ALL", presentation: "NOTIFICATION", destination: null, scheduledAt: null, expiresAt: null };
const labels = (value: string) => value.replaceAll("_", " ").toLowerCase().replace(/^./, (letter) => letter.toUpperCase());
const localInput = (value: string | null) => value ? new Date(value).toISOString().slice(0, 16) : "";
const utc = (value: string) => value ? new Date(value).toISOString() : null;
const date = (value: string | null) => value ? new Date(value).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "Not set";

function Composer({ open, editing, onClose, onSaved }: { open: boolean; editing: AnnouncementRecord | null; onClose: () => void; onSaved: () => Promise<void> }) {
  const [stage, setStage] = React.useState<"DETAILS" | "PREVIEW" | "PUBLISH">("DETAILS");
  const [draft, setDraft] = React.useState<AnnouncementDraft>(() => editing ? { title: editing.title, message: editing.message, category: editing.category, priority: editing.priority, audience: editing.audience, presentation: editing.presentation, destination: editing.destination, scheduledAt: editing.scheduledAt, expiresAt: editing.expiresAt } : blank);
  const [recordId, setRecordId] = React.useState<string | null>(editing?.id ?? null);
  const [saving, setSaving] = React.useState(false);
  const [previewNow] = React.useState(() => Date.now());
  const save = async () => { setSaving(true); try { const row = recordId ? await AnnouncementClient.update(recordId, draft) : await AnnouncementClient.create(draft); setRecordId(row.id); await onSaved(); toast.success("Draft saved."); return row; } catch (error) { toast.error(error instanceof Error ? error.message : "Unable to save draft."); } finally { setSaving(false); } };
  const publish = async () => { if (saving) return; setSaving(true); try { let id = recordId; if (id) await AnnouncementClient.update(id, draft); else id = (await AnnouncementClient.create(draft)).id; await AnnouncementClient.publish(id); await onSaved(); toast.success(draft.scheduledAt && new Date(draft.scheduledAt) > new Date() ? "Announcement scheduled." : "Announcement published."); onClose(); } catch (error) { toast.error(error instanceof Error ? error.message : "Unable to publish announcement."); } finally { setSaving(false); } };
  const valid = draft.title.trim() && draft.message.trim();
  return <Sheet open={open} onOpenChange={(value) => !value && !saving && onClose()}>
    <SheetContent className="flex w-full flex-col overflow-hidden p-0 sm:max-w-xl">
      <SheetHeader className="border-b px-6 py-5"><SheetTitle>{editing ? "Edit announcement" : "Create announcement"}</SheetTitle><SheetDescription>Details · Preview · Publish</SheetDescription></SheetHeader>
      <div className="flex gap-2 border-b px-6 py-3" aria-label="Composer progress">{(["DETAILS", "PREVIEW", "PUBLISH"] as const).map((item, index) => <Badge key={item} variant={stage === item ? "default" : "outline"}>{index + 1}. {labels(item)}</Badge>)}</div>
      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
        {stage === "DETAILS" && <div className="space-y-5">
          <div className="space-y-2"><Label htmlFor="announcement-title">Title</Label><Input id="announcement-title" maxLength={160} value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} /></div>
          <div className="space-y-2"><Label htmlFor="announcement-message">Message</Label><Textarea id="announcement-message" maxLength={2000} className="min-h-32" value={draft.message} onChange={(e) => setDraft({ ...draft, message: e.target.value })} /><p className="text-xs text-muted-foreground">{draft.message.length}/2000</p></div>
          <div className="grid gap-4 sm:grid-cols-2">
            <FieldSelect label="Category" value={draft.category} values={["GENERAL","OPERATIONS","SECURITY","POLICY","PRODUCT"]} onChange={(category) => setDraft({ ...draft, category: category as AnnouncementDraft["category"] })} />
            <FieldSelect label="Priority" value={draft.priority} values={["NORMAL","IMPORTANT","CRITICAL"]} onChange={(priority) => setDraft({ ...draft, priority: priority as AnnouncementDraft["priority"] })} />
            <FieldSelect label="Audience" value={draft.audience} values={["ALL","CUSTOMERS","VENDORS","ADMINISTRATORS"]} onChange={(audience) => setDraft({ ...draft, audience: audience as AnnouncementDraft["audience"] })} />
            <FieldSelect label="Presentation" value={draft.presentation} values={["NOTIFICATION","BANNER"]} onChange={(presentation) => setDraft({ ...draft, presentation: presentation as AnnouncementDraft["presentation"] })} />
          </div>
          <div className="space-y-2"><Label htmlFor="announcement-destination">Internal destination</Label><Input id="announcement-destination" placeholder="/orders" value={draft.destination ?? ""} onChange={(e) => setDraft({ ...draft, destination: e.target.value || null })} /></div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2"><Label htmlFor="announcement-schedule">Publish at</Label><Input id="announcement-schedule" type="datetime-local" value={localInput(draft.scheduledAt)} onChange={(e) => setDraft({ ...draft, scheduledAt: utc(e.target.value) })} /><p className="text-xs text-muted-foreground">Shown in your local timezone; stored as UTC.</p></div>
            <div className="space-y-2"><Label htmlFor="announcement-expiration">Expire at</Label><Input id="announcement-expiration" type="datetime-local" value={localInput(draft.expiresAt)} onChange={(e) => setDraft({ ...draft, expiresAt: utc(e.target.value) })} /></div>
          </div>
        </div>}
        {stage === "PREVIEW" && <div className="space-y-4"><p className="text-sm text-muted-foreground">This matches the notification-center presentation.</p><NotificationCard notification={{ id: "preview", source: "ANNOUNCEMENT", category: draft.category, eventType: draft.presentation === "BANNER" ? "MAINTENANCE" : "SYSTEM", type: draft.priority, title: draft.title || "Announcement title", message: draft.message || "Announcement message", actionPath: draft.destination, readAt: null, createdAt: new Date(previewNow).toISOString() }} now={previewNow} pendingFor={() => false} onNavigate={() => {}} onMarkRead={async () => {}} onMarkUnread={async () => {}} onDelete={async () => {}} /><div className="rounded-lg border bg-muted/30 p-4 text-sm"><p><strong>Destination:</strong> {draft.destination || "No destination"}</p><p className="mt-1"><strong>Behavior:</strong> {draft.destination ? "Selecting the card opens this internal page." : "Informational only."}</p></div></div>}
        {stage === "PUBLISH" && <div className="space-y-4"><Card><CardHeader><CardTitle className="text-base">Publication summary</CardTitle></CardHeader><CardContent className="space-y-3 text-sm"><Summary label="Announcement" value={draft.title} /><Summary label="Audience" value={labels(draft.audience)} /><Summary label="Timing" value={draft.scheduledAt ? date(draft.scheduledAt) : "Immediately"} /><Summary label="Expiration" value={date(draft.expiresAt)} /><Summary label="Priority" value={labels(draft.priority)} /></CardContent></Card><p className="text-sm text-muted-foreground">Publishing is explicit and cannot be silently rewritten afterward.</p></div>}
      </div>
      <SheetFooter className="border-t px-6 py-4 sm:justify-between"><div>{stage === "DETAILS" && <Button variant="outline" disabled={!valid || saving} onClick={() => void save()}>Save draft</Button>}</div><div className="flex gap-2">{stage !== "DETAILS" && <Button variant="outline" disabled={saving} onClick={() => setStage(stage === "PUBLISH" ? "PREVIEW" : "DETAILS")}>Back</Button>}{stage !== "PUBLISH" ? <Button disabled={!valid || saving} onClick={() => setStage(stage === "DETAILS" ? "PREVIEW" : "PUBLISH")}>Continue</Button> : <Button disabled={saving} onClick={() => void publish()}><Send />{draft.scheduledAt && new Date(draft.scheduledAt) > new Date() ? "Schedule" : "Publish now"}</Button>}</div></SheetFooter>
    </SheetContent>
  </Sheet>;
}

function FieldSelect({ label, value, values, onChange }: { label: string; value: string; values: string[]; onChange: (value: string) => void }) { return <div className="space-y-2"><Label>{label}</Label><Select value={value} onValueChange={onChange}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent>{values.map((item) => <SelectItem key={item} value={item}>{labels(item)}</SelectItem>)}</SelectContent></Select></div>; }
function Summary({ label, value }: { label: string; value: string }) { return <div className="flex justify-between gap-4"><span className="text-muted-foreground">{label}</span><span className="text-right font-medium">{value}</span></div>; }

export function AdminNotificationsClient() {
  const [rows, setRows] = React.useState<AnnouncementRecord[]>([]); const [loading, setLoading] = React.useState(true); const [error, setError] = React.useState(""); const [filter, setFilter] = React.useState("ALL"); const [composer, setComposer] = React.useState(false); const [editing, setEditing] = React.useState<AnnouncementRecord | null>(null); const [cancel, setCancel] = React.useState<AnnouncementRecord | null>(null); const [workspace, setWorkspace] = React.useState("announcements"); const [marketingComposer, setMarketingComposer] = React.useState(false); const [marketingActivated, setMarketingActivated] = React.useState(false);
  const load = React.useCallback(async (signal?: AbortSignal) => { setLoading(true); try { setRows((await AnnouncementClient.list(signal)).announcements); setError(""); } catch (caught) { if (!signal?.aborted) setError(caught instanceof Error ? caught.message : "Unable to load announcements."); } finally { if (!signal?.aborted) setLoading(false); } }, []);
  React.useEffect(() => { const controller = new AbortController(); queueMicrotask(() => void load(controller.signal)); return () => controller.abort(); }, [load]);
  const visible = filter === "ALL" ? rows : rows.filter((row) => row.status === filter);
  const columns = React.useMemo<ColumnDef<AnnouncementRecord, unknown>[]>(() => [
    { accessorKey: "title", header: "Announcement", cell: ({ row }) => <div className="max-w-72"><p className="truncate font-medium">{row.original.title}</p><p className="truncate text-xs text-muted-foreground">{row.original.message}</p></div> },
    { accessorKey: "audience", header: "Audience", cell: ({ row }) => <span className="text-xs">{labels(row.original.audience)}</span> },
    { accessorKey: "status", header: "Status", cell: ({ row }) => <Badge variant={row.original.status === "PUBLISHED" ? "default" : "outline"}>{labels(row.original.status)}</Badge> },
    { id: "timing", header: "Publication", cell: ({ row }) => <span className="text-xs">{date(row.original.publishedAt ?? row.original.scheduledAt)}</span> },
    { id: "actions", header: "", cell: ({ row }) => <DataTableRowActions actions={[{ id: "view", label: "Preview announcement", icon: Eye, onSelect: () => { setEditing(row.original); setComposer(true); } }, ...(["DRAFT","SCHEDULED"].includes(row.original.status) ? [{ id: "edit", label: "Edit announcement", icon: Pencil, onSelect: () => { setEditing(row.original); setComposer(true); } }, { id: "cancel", label: "Cancel announcement", icon: XCircle, destructive: true, onSelect: () => setCancel(row.original) }] : [])]} /> },
  ], []);
  const counts = Object.fromEntries(["DRAFT","SCHEDULED","PUBLISHED"].map((status) => [status, rows.filter((row) => row.status === status).length]));
  return <main className="space-y-6"><DashboardPageHeader title="Notifications" description="Manage platform announcements and keep your community informed." trailing={<Button onClick={() => workspace === "announcements" ? (setEditing(null), setComposer(true)) : setMarketingComposer(true)}><Plus />{workspace === "announcements" ? "Create announcement" : "Create campaign"}</Button>} />
    <Tabs value={workspace} onValueChange={(value) => { setWorkspace(value); if (value === "marketing") setMarketingActivated(true); }}><TabsList aria-label="Notification management areas"><TabsTrigger value="announcements">Announcements</TabsTrigger><TabsTrigger value="marketing">Marketing</TabsTrigger></TabsList><TabsContent value="announcements" className="space-y-6 pt-4"><div className="grid gap-4 sm:grid-cols-3"><AdminMetricCard icon={Pencil} label="Draft announcements" value={counts.DRAFT} /><AdminMetricCard icon={CalendarClock} label="Scheduled" value={counts.SCHEDULED} tone="warning" /><AdminMetricCard icon={Megaphone} label="Published" value={counts.PUBLISHED} tone="success" /></div>
    {error ? <Card><CardContent className="py-8 text-center"><p className="text-sm text-destructive">{error}</p><Button className="mt-4" variant="outline" onClick={() => void load()}>Retry</Button></CardContent></Card> : <DataTable columns={columns} data={visible} getRowId={(row) => row.id} isLoading={loading} defaultPageSize={10} getSearchText={(row) => `${row.title} ${row.message} ${row.category} ${row.audience}`} searchPlaceholder="Search announcements..." renderTabs={<DataTableStatusFilter value={filter} onValueChange={setFilter} options={["ALL","DRAFT","SCHEDULED","PUBLISHED","CANCELLED","EXPIRED"].map((value) => ({ value, label: labels(value) }))} />} emptyStateContent={<span>No announcements match this view.</span>} />}</TabsContent><TabsContent value="marketing" className="pt-4">{marketingActivated && <MarketingCampaignsPanel createOpen={marketingComposer} onCreateOpenChange={setMarketingComposer} />}</TabsContent></Tabs>
    {composer && <Composer open editing={editing} onClose={() => setComposer(false)} onSaved={() => load()} />}
    <AlertDialog open={!!cancel} onOpenChange={(open) => !open && setCancel(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Cancel this announcement?</AlertDialogTitle><AlertDialogDescription>It will not be published. This action is recorded in the audit log.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Keep announcement</AlertDialogCancel><AlertDialogAction onClick={() => { if (!cancel) return; void AnnouncementClient.cancel(cancel.id).then(() => load()).then(() => toast.success("Announcement cancelled.")).catch((error) => toast.error(error.message)); }}>Cancel announcement</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </main>;
}
