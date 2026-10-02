"use client";

import * as React from "react";
import { type ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/data-table";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { DeleteDialog } from "@/components/alert-dialog";
import { humanizeOperation, operationBadgeClass, shortReference } from "@/lib/admin-operations";

type Issue = { id:string; status:string; subOrderId:string; createdAt:string; reason:string; amount?:string|number; currency?:string; customerId?:string; vendorId?:string; orderId?:string; openedAt?:string; items?:Array<{quantity:number}> };
type Tab = "returns" | "refunds" | "disputes";
const date = (v?: string) => v ? new Intl.DateTimeFormat("en-UG", { day:"numeric", month:"short", year:"numeric" }).format(new Date(v)) : "—";
const money = (v: string|number|undefined, c?: string) => v == null ? "—" : new Intl.NumberFormat("en-UG", { style:"currency", currency:c || "UGX", maximumFractionDigits:2 }).format(Number(v));
const Badge = ({value}:{value:string}) => <span className={`inline-flex rounded-full px-2 py-1 text-[10px] font-semibold ${operationBadgeClass(value)}`}>{humanizeOperation(value)}</span>;

export default function AdminIssuesPage() {
  const [tab, setTab] = React.useState<Tab>("returns");
  const [records, setRecords] = React.useState<Record<Tab,Issue[]>>({returns:[],refunds:[],disputes:[]});
  const [loading, setLoading] = React.useState(true); const [error, setError] = React.useState("");
  const [selected, setSelected] = React.useState<Issue|null>(null); const [confirm, setConfirm] = React.useState<{item:Issue; action:string}|null>(null); const [reason,setReason]=React.useState(""); const [saving,setSaving]=React.useState(false);
  const load = React.useCallback(async () => { setLoading(true); setError(""); try { const responses=await Promise.all(["returns","refunds","disputes"].map((name)=>fetch(`/api/admin/${name}`,{cache:"no-store"}).then(async r=>({r,json:await r.json()})))); const next={} as Record<Tab,Issue[]>; for (const [i,key] of (["returns","refunds","disputes"] as Tab[]).entries()) { if (!responses[i].r.ok || !responses[i].json.success) throw new Error(responses[i].json.error || "Unable to load customer issues."); next[key]=responses[i].json.data; } setRecords(next); } catch (e) { setError(e instanceof Error ? e.message : "Unable to load customer issues."); } finally { setLoading(false); } },[]);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- initial authenticated API request intentionally populates local view state
  React.useEffect(()=>{ void load(); },[load]);
  const mutate=async(item:Issue,action:string)=>{ setSaving(true); try { const endpoint=tab === "returns" ? `/api/admin/returns/${item.id}` : tab === "refunds" ? `/api/admin/refunds/${item.id}` : `/api/admin/disputes/${item.id}`; const body=tab === "disputes" ? {status:action,resolution:reason} : {action,reason}; const r=await fetch(endpoint,{method:"PATCH",headers:{"content-type":"application/json"},body:JSON.stringify(body)}); const json=await r.json(); if(!r.ok||!json.success) throw new Error(json.error||"Action could not be completed."); toast.success("Customer issue updated."); setConfirm(null); setSelected(null); setReason(""); await load(); } catch(e){toast.error(e instanceof Error?e.message:"Action could not be completed.");} finally {setSaving(false);} };
  const columns=React.useMemo<ColumnDef<Issue>[]>(()=> [
    {accessorKey:"id",header:"Reference",cell:({row})=><button className="font-mono text-xs text-muted-foreground hover:text-foreground" onClick={()=>setSelected(row.original)} title={row.original.id}>{shortReference(row.original.id)}</button>},
    {accessorKey:"reason",header:"Reason",cell:({row})=><button className="max-w-[260px] truncate text-left font-medium hover:text-primary" onClick={()=>setSelected(row.original)}>{row.original.reason || "No reason supplied"}</button>},
    {accessorKey:"subOrderId",header:"Sub-order",cell:({row})=><span className="font-mono text-xs text-muted-foreground" title={row.original.subOrderId}>{shortReference(row.original.subOrderId)}</span>},
    {accessorKey:"amount",header:"Amount",cell:({row})=>tab==="refunds"?money(row.original.amount,row.original.currency): row.original.items?.reduce((n,x)=>n+x.quantity,0) ?? "—"},
    {accessorKey:"status",header:"Status",cell:({row})=><Badge value={row.original.status}/>},
    {accessorKey:"createdAt",header:"Opened",cell:({row})=>date(row.original.createdAt || row.original.openedAt)},
    {id:"action",header:"",cell:({row})=> <Button variant="outline" size="sm" className="h-8 rounded-lg text-xs" onClick={()=>setSelected(row.original)}>Review</Button>},
  ],[tab]);
  const list=records[tab];
  const action = selected && (tab === "returns" && selected.status === "REQUESTED" ? {label:"Approve return",value:"approve"} : tab === "refunds" && selected.status === "REQUESTED" ? {label:"Approve refund",value:"approve"} : tab === "disputes" && selected.status === "OPEN" ? {label:"Start review",value:"UNDER_REVIEW"} : tab === "disputes" && selected.status === "UNDER_REVIEW" ? {label:"Resolve for vendor",value:"RESOLVED_VENDOR"} : null);
  return <><div className="space-y-6 p-4 md:p-6"><div><h1 className="text-2xl font-semibold tracking-tight">Customer issues</h1><p className="mt-1 text-sm text-muted-foreground">Review real return, refund, and dispute records. Financial processing remains server-controlled.</p></div>{error?<div className="rounded-xl border border-rose-500/30 bg-rose-500/5 p-4 text-sm text-rose-700"><p>{error}</p><Button variant="outline" size="sm" className="mt-3" onClick={()=>void load()}>Try again</Button></div>:<DataTable columns={columns} data={list} getRowId={(r)=>r.id} isLoading={loading} renderTabs={<div className="flex flex-wrap gap-2" role="tablist" aria-label="Customer issue types">{(["returns","refunds","disputes"] as Tab[]).map(key=><Button key={key} variant={tab===key?"default":"outline"} size="sm" className="rounded-lg capitalize" role="tab" aria-selected={tab===key} onClick={()=>setTab(key)}>{key} <span className="ml-1 opacity-70">{records[key].length}</span></Button>)}</div>}/>}</div>
  <Sheet open={!!selected} onOpenChange={(open)=>!open&&setSelected(null)}><SheetContent className="w-full overflow-y-auto sm:max-w-lg"><SheetHeader><SheetTitle>{tab === "returns" ? "Return request" : tab === "refunds" ? "Refund request" : "Dispute"}</SheetTitle><SheetDescription>Reference <span className="font-mono">{selected?.id}</span></SheetDescription></SheetHeader>{selected&&<div className="mt-6 space-y-5 text-sm"><div className="grid grid-cols-2 gap-3"><div><p className="text-muted-foreground">Status</p><Badge value={selected.status}/></div><div><p className="text-muted-foreground">Sub-order</p><p className="font-mono text-xs" title={selected.subOrderId}>{shortReference(selected.subOrderId)}</p></div>{tab==="refunds"&&<div><p className="text-muted-foreground">Authoritative amount</p><p className="font-medium">{money(selected.amount,selected.currency)}</p></div>}</div><div><p className="text-muted-foreground">Reason</p><p className="mt-1 whitespace-pre-wrap break-words">{selected.reason || "—"}</p></div>{tab==="refunds"&&selected.status==="REQUESTED"&&<><Textarea value={reason} onChange={e=>setReason(e.target.value)} placeholder="Rejection reason (required only when rejecting)"/><Button variant="outline" className="w-full" onClick={()=>setConfirm({item:selected,action:"reject"})}>Reject refund</Button></>}{action&&<Button className="w-full" onClick={()=>setConfirm({item:selected,action:action.value})}>{action.label}</Button>}<p className="text-xs text-muted-foreground">Only state transitions currently supported by the authorized service are available here.</p></div>}</SheetContent></Sheet>
  <DeleteDialog open={!!confirm} onOpenChange={(open)=>!open&&setConfirm(null)} title="Confirm operational action" description={confirm?.action==="approve"?"Approve this refund? Provider settlement is not triggered from this screen.":"Apply this authorized issue transition?"} itemType="action" variant="warning" isDeleting={saving} onConfirm={async()=>{if(confirm){if(confirm.action==="reject"&&!reason.trim()){toast.error("A rejection reason is required.");return;} await mutate(confirm.item,confirm.action);}}}/>
  </>;
}
