import { Skeleton } from "@/components/ui/skeleton";

export function VerificationDetailSkeleton() {
  return <main className="w-full space-y-6" aria-label="Loading verification details" aria-busy="true">
    <div className="flex items-start gap-3 border-b border-border/40 pb-4"><Skeleton className="size-10 shrink-0 rounded-full"/><div className="flex-1 space-y-2"><Skeleton className="h-7 w-56"/><Skeleton className="h-4 max-w-xl"/></div><Skeleton className="hidden h-9 w-36 sm:block"/></div>
    <div className="grid gap-4 lg:grid-cols-3"><Skeleton className="h-64 rounded-xl lg:col-span-2"/><Skeleton className="h-64 rounded-xl"/></div>
    <div className="space-y-3"><Skeleton className="h-6 w-44"/><div className="grid gap-3 sm:grid-cols-2"><Skeleton className="h-28 rounded-xl"/><Skeleton className="h-28 rounded-xl"/></div></div>
    <div className="grid gap-4 lg:grid-cols-2"><Skeleton className="h-56 rounded-xl"/><Skeleton className="h-56 rounded-xl"/></div>
  </main>;
}

export default VerificationDetailSkeleton;
