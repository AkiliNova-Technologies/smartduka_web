"use client";

import { Suspense } from "react";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export const MARKETPLACE_PAGE_SIZE = 12;

export function MarketplacePagination({ total, pageSize = MARKETPLACE_PAGE_SIZE }: { total: number; pageSize?: number }) {
  return <Suspense fallback={<MarketplacePaginationFallback />}><MarketplacePaginationRuntime total={total} pageSize={pageSize} /></Suspense>;
}

export function MarketplacePaginationFallback() {
  return <div aria-hidden="true" className="h-11 pt-2" />;
}

function MarketplacePaginationRuntime({ total, pageSize }: { total: number; pageSize: number }) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const requestedPage = Number(searchParams.get("page"));
  const page = Math.min(Math.max(Number.isInteger(requestedPage) ? requestedPage : 1, 1), pageCount);
  if (pageCount <= 1) return null;
  const goTo = (nextPage: number) => {
    const params = new URLSearchParams(searchParams);
    if (nextPage <= 1) params.delete("page");
    else params.set("page", String(nextPage));
    router.push(`${pathname}${params.size ? `?${params}` : ""}`);
  };
  const previous = page > 1, next = page < pageCount;
  const control = "grid size-9 place-items-center rounded-full border text-muted-foreground transition-colors hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-40";
  return <nav aria-label="Pagination" className="flex items-center justify-center gap-2 pt-2"><button type="button" className={`${control} hidden sm:grid`} disabled={!previous} onClick={() => goTo(1)} aria-label="First page"><ChevronsLeft className="size-4" /></button><button type="button" className={control} disabled={!previous} onClick={() => goTo(page - 1)} aria-label="Previous page"><ChevronLeft className="size-4" /></button><span className="min-w-24 text-center text-sm font-medium">Page {page} of {pageCount}</span><button type="button" className={control} disabled={!next} onClick={() => goTo(page + 1)} aria-label="Next page"><ChevronRight className="size-4" /></button><button type="button" className={`${control} hidden sm:grid`} disabled={!next} onClick={() => goTo(pageCount)} aria-label="Last page"><ChevronsRight className="size-4" /></button></nav>;
}
