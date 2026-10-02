import { Suspense } from "react";
import { parseMarketplacePage } from "@/lib/marketplace-page";
import { WishlistContent, WishlistPageFallback } from "./WishlistContent";

type WishlistPageProps = { searchParams: Promise<{ page?: string }> };

export default function WishlistPage({ searchParams }: WishlistPageProps) {
  return <Suspense fallback={<WishlistPageFallback />}><WishlistRuntime searchParams={searchParams} /></Suspense>;
}

async function WishlistRuntime({ searchParams }: WishlistPageProps) {
  const { page } = await searchParams;
  return <WishlistContent requestedPage={parseMarketplacePage(page)} />;
}
