import { notFound } from "next/navigation";
import { Suspense } from "react";
import { VendorService } from "@/services/vendor";
import { StoreProfileContent } from "./StoreProfileContent";
import { Skeleton } from "@/components/ui/skeleton";

interface PageProps {
  params: Promise<{ vendorSlug: string }>;
}

function StoreProfilePageFallback() {
  return <main className="mx-auto w-full max-w-7xl space-y-7 px-4 py-6 sm:px-6 sm:py-8"><section className="overflow-hidden rounded-xl border bg-card"><Skeleton className="aspect-[5/1] min-h-28 w-full" /><div className="flex gap-5 p-5 sm:p-7"><Skeleton className="size-20 shrink-0 rounded-2xl" /><div className="flex-1 space-y-3"><Skeleton className="h-7 w-56" /><Skeleton className="h-4 w-full max-w-2xl" /><Skeleton className="h-4 w-40" /></div></div></section><div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 lg:gap-5">{Array.from({ length: 8 }, (_, index) => <Skeleton key={index} className="aspect-[.75] rounded-xl" />)}</div></main>;
}

export default function StoreProfilePage({ params }: PageProps) {
  return <Suspense fallback={<StoreProfilePageFallback />}><StoreProfileRuntime params={params} /></Suspense>;
}

async function StoreProfileRuntime({ params }: PageProps) {
  const { vendorSlug } = await params;
  const shop = await VendorService.getPublicShopBySlug(vendorSlug);
  if (!shop) notFound();
  return <StoreProfileContent {...shop} />;
}
