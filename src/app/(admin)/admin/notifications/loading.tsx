import { Skeleton } from "@/components/ui/skeleton";
export default function Loading() { return <div className="space-y-6"><Skeleton className="h-16 w-full" /><div className="grid gap-4 sm:grid-cols-3">{[1,2,3].map((item) => <Skeleton key={item} className="h-28 rounded-xl" />)}</div><Skeleton className="h-96 rounded-xl" /></div>; }
