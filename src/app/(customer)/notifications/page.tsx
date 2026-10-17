"use client";

import * as React from "react";
import { Bell, CheckCheck, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { NotificationCard } from "@/components/notifications/NotificationsSheet";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { NotificationClient } from "@/lib/notification-client";
import { useUserData, type UserNotification } from "@/providers/UserDataProvider";

export default function NotificationHistoryPage() {
  const router = useRouter();
  const { markAllAsRead, refreshNotifications } = useUserData();
  const [pending, setPending] = React.useState(new Set<string>());
  const [now, setNow] = React.useState<number | null>(null);
  const [items, setItems] = React.useState<UserNotification[]>([]); const [page, setPage] = React.useState(1); const [meta, setMeta] = React.useState({ page: 1, pageSize: 20, total: 0, hasMore: false }); const [status, setStatus] = React.useState("all"); const [category, setCategory] = React.useState("all"); const [loading, setLoading] = React.useState(true); const [error, setError] = React.useState("");
  const load = React.useCallback(async (signal?: AbortSignal) => { setLoading(true); try { const result = await NotificationClient.list(signal, { page, pageSize: 20, status: status === "all" ? undefined : status as "read" | "unread", category: category === "all" ? undefined : category }); setItems(result.items); setMeta(result.meta); setError(""); } catch (caught) { if (!signal?.aborted) setError(caught instanceof Error ? caught.message : "Unable to load notification history."); } finally { if (!signal?.aborted) setLoading(false); } }, [category, page, status]);
  React.useEffect(() => { const controller = new AbortController(); queueMicrotask(() => void load(controller.signal)); return () => controller.abort(); }, [load]);
  React.useEffect(() => { const timer = window.setTimeout(() => setNow(Date.now()), 0); return () => window.clearTimeout(timer); }, []);
  const mutate = async (action: (id: string) => Promise<unknown>, id: string) => { setPending((current) => new Set(current).add(id)); try { await action(id); await Promise.all([load(), refreshNotifications()]); } finally { setPending((current) => { const next = new Set(current); next.delete(id); return next; }); } };
  return <main className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 lg:py-12">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight"><Bell className="size-6" />Notification history</h1><p className="mt-1 text-sm text-muted-foreground">Your personal updates and eligible platform announcements.</p></div><Button variant="outline" disabled={!items.some((item) => !item.readAt)} onClick={() => void markAllAsRead().then(() => load())}><CheckCheck />Mark all read</Button></div>
    <div className="mt-6 flex flex-col gap-3 sm:flex-row"><Select value={status} onValueChange={(value) => { setStatus(value); setPage(1); }}><SelectTrigger className="w-full sm:w-44"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All notifications</SelectItem><SelectItem value="unread">Unread</SelectItem><SelectItem value="read">Read</SelectItem></SelectContent></Select><Select value={category} onValueChange={(value) => { setCategory(value); setPage(1); }}><SelectTrigger className="w-full sm:w-44"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All categories</SelectItem>{["GENERAL","OPERATIONS","SECURITY","POLICY","PRODUCT","MARKETING"].map((value) => <SelectItem key={value} value={value}>{value[0] + value.slice(1).toLowerCase()}</SelectItem>)}</SelectContent></Select></div>
    <div className="mt-6">
      {loading ? <div className="space-y-3">{[1,2,3,4].map((item) => <Skeleton key={item} className="h-32 rounded-xl" />)}</div> : error ? <Card><CardContent className="py-12 text-center"><p className="text-sm text-destructive">{error}</p><Button className="mt-4" variant="outline" onClick={() => void load()}><RefreshCw />Retry</Button></CardContent></Card> : !items.length ? <Card><CardContent className="flex flex-col items-center py-16 text-center"><Bell className="size-8 text-muted-foreground" /><p className="mt-4 font-medium">No notifications found</p><p className="mt-1 text-sm text-muted-foreground">Try another filter or check back later.</p></CardContent></Card> : <div className="space-y-3">{items.map((item) => <NotificationCard key={item.id} notification={item} now={now} pendingFor={(id) => pending.has(id)} onNavigate={(path) => router.push(path)} onMarkRead={(id) => mutate(NotificationClient.markRead, id)} onMarkUnread={(id) => mutate(NotificationClient.markUnread, id)} onDelete={(id) => mutate(NotificationClient.delete, id)} />)}</div>}
    </div>
    {!loading && meta.total > meta.pageSize && <nav className="mt-6 flex items-center justify-between" aria-label="Notification history pagination"><Button variant="outline" disabled={page === 1} onClick={() => setPage((value) => value - 1)}>Previous</Button><span className="text-sm text-muted-foreground">Page {page} of {Math.ceil(meta.total / meta.pageSize)}</span><Button variant="outline" disabled={!meta.hasMore} onClick={() => setPage((value) => value + 1)}>Next</Button></nav>}
  </main>;
}
