"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { Search, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

export function MarketplaceSearch({
  className,
  mobileTrigger = false,
}: {
  className?: string;
  mobileTrigger?: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const current = searchParams.get("search") || "";
  const [query, setQuery] = useState(current);
  const [previousCurrent, setPreviousCurrent] = useState(current);
  if (current !== previousCurrent) {
    setPreviousCurrent(current);
    setQuery(current);
  }
  const submit = (event: FormEvent) => {
    event.preventDefault();
    const value = query.trim();
    router.push(
      value ? `/products?search=${encodeURIComponent(value)}` : "/products",
    );
  };
  if (mobileTrigger)
    return (
      <Link
        href="/products"
        aria-label="Search marketplace"
        className={cn(
          "inline-flex size-11 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          className,
        )}>
        <Search className="size-5" />
        <span className="sr-only">Search marketplace</span>
      </Link>
    );
  return (
    <form
      role="search"
      onSubmit={submit}
      className={cn("relative w-full", className)}>
      <label className="sr-only" htmlFor="marketplace-search">
        Search products, categories or shops
      </label>
      <Search
        aria-hidden="true"
        className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
      />
      <input
        id="marketplace-search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search products, categories or shops"
        className="h-11 w-full rounded-full border border-input bg-background py-2 pl-10 pr-10 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20"
      />
      {query && (
        <button
          type="button"
          aria-label="Clear marketplace search"
          onClick={() => {
            setQuery("");
            router.push("/products");
          }}
          className="absolute right-1.5 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <X className="size-4" />
        </button>
      )}
    </form>
  );
}
