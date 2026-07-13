"use client";

import { useState, FormEvent, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Search,
  Bell,
  AlignStartVertical,
  AlignEndVertical,
  ShoppingCart,
} from "lucide-react";
import Image from "next/image";
import { useSidebar } from "@/components/ui/sidebar";
import { useAuth } from "@/hooks/use-auth";
import { Skeleton } from "@/components/ui/skeleton";

function SearchInputFields() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentSearchParam = searchParams.get("search") || "";

  const [searchQuery, setSearchQuery] = useState(currentSearchParam);
  const [prevSearchParam, setPrevSearchParam] = useState(currentSearchParam);

  if (currentSearchParam !== prevSearchParam) {
    setSearchQuery(currentSearchParam);
    setPrevSearchParam(currentSearchParam);
  }

  const handleSearchSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      router.push("/products");
    } else {
      router.push(`/products?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <form
      onSubmit={handleSearchSubmit}
      className="relative w-full max-w-md hidden md:block group"
    >
      <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" />
      <input
        type="text"
        placeholder="Search products, brands, stores..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="w-full h-11 pl-11 pr-5 bg-zinc-200/60 dark:bg-background/60 hover:bg-background/80 border border-transparent rounded-full text-sm text-foreground placeholder-muted-foreground/70 font-medium focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary focus:bg-background transition-all duration-200"
      />
    </form>
  );
}

function ProfileSection() {
  const router = useRouter();
  const { user, loading, isAuthenticated, userRole } = useAuth();

  if (loading && !isAuthenticated) {
    return (
      <div className="flex items-center gap-3">
        <Skeleton className="w-9 h-9 rounded-full" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <button
        onClick={() => router.push("/login")}
        className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-full text-xs font-semibold hover:bg-emerald-600 transition-colors cursor-pointer"
      >
        <span className="hidden sm:inline">Sign In</span>
      </button>
    );
  }

  // Show dashboard for privileged roles
  const canAccessDashboard = userRole === "SUPER_ADMIN" || 
                              userRole === "ADMIN" || 
                              userRole === "VENDOR";
  
  const getDashboardPath = () => {
    switch (userRole) {
      case "SUPER_ADMIN":
      case "ADMIN":
        return "/admin";
      case "VENDOR":
        return "/vendor";
      default:
        return "/";
    }
  };

  const displayName = user?.displayName || user?.email?.split("@")[0] || "User";
  const avatarUrl = user?.photoURL || null;

  return (
    <div className="flex items-center gap-2">
      {/* Dashboard Button - now using isAuthenticated + userRole */}
      {isAuthenticated && canAccessDashboard && (
        <button
          onClick={() => router.push(getDashboardPath())}
          className="hidden sm:flex items-center gap-2 px-3 py-2 bg-primary/10 hover:bg-primary/20 text-primary rounded-full text-xs font-semibold transition-all duration-200 hover:shadow-sm cursor-pointer border border-primary/20"
          title={`${userRole === "VENDOR" ? "Vendor" : "Admin"} Dashboard`}
        >
          <span>Dashboard</span>
        </button>
      )}

      <div
        onClick={() => router.push("/settings")}
        className="flex items-center gap-3 border-transparent hover:border-border hover:bg-card hover:shadow-2xs cursor-pointer group transition-all duration-200 rounded-full px-1 py-1"
      >
        <div className="relative w-9 h-9 rounded-full overflow-hidden ring-2 ring-transparent group-hover:ring-primary/20 transition-all shadow-none shrink-0">
          {avatarUrl ? (
            <Image
              alt={`${displayName} Avatar Profile`}
              src={avatarUrl}
              fill
              sizes="36px"
              className="object-cover"
              priority
            />
          ) : (
            <div className="w-full h-full bg-primary/10 flex items-center justify-center rounded-full">
              <span className="text-xs font-bold text-primary uppercase">
                {displayName.charAt(0)}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// 3. Export the main structural header with a Suspense fallback node
export function Header() {
  const { toggleSidebar, open } = useSidebar();
  const router = useRouter();

  return (
    <header className="sticky top-0 left-0 right-0 z-40 w-full bg-customer-sidebar backdrop-blur-md border-b border-border/40 dark:border-zinc-800/60 transition-all duration-300">
      <div className="max-w-8xl mx-auto w-full h-20 px-4 sm:px-6 md:px-10 flex justify-between items-center">
        {/* LEFT PANEL: Sidebar Controls & Search Capsule */}
        <div className="flex items-center gap-4 flex-1">
          <button
            onClick={() => toggleSidebar()}
            aria-label={
              open
                ? "Collapse Navigation Sidebar"
                : "Expand Navigation Sidebar"
            }
            className="p-2.5 -ml-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl transition-all active:scale-95 cursor-pointer"
          >
            {open ? (
              <AlignStartVertical className="w-5 h-5 animate-in fade-in zoom-in-75 duration-200" />
            ) : (
              <AlignEndVertical className="w-5 h-5 animate-in fade-in zoom-in-75 duration-200" />
            )}
          </button>

          {/* Wrap dynamic inputs in a Suspense frame to support clean static layout pre-rendering */}
          <Suspense
            fallback={
              <div className="w-full max-w-md h-11 bg-muted/40 rounded-full hidden md:block animate-pulse" />
            }
          >
            <SearchInputFields />
          </Suspense>
        </div>

        {/* RIGHT PANEL: Interactive Utilities & Profile Capsule */}
        <div className="flex items-center gap-2.5 sm:gap-3 ml-4 shrink-0">
          {/* Shopping Kaveera (Cart) Trigger Button */}
          <button
            aria-label="Open Cart View"
            className="p-2.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-full relative transition-all active:scale-95 group cursor-pointer"
            onClick={() => router.push("/cart")}
          >
            <ShoppingCart className="w-5 h-5 transition-transform group-hover:scale-105" />
            {/* Live Count Ripple Badge Layer */}
            <span className="absolute top-1 right-1 w-4 h-4 bg-primary text-primary-foreground rounded-full text-[9px] font-bold flex items-center justify-center ring-2 ring-background scale-90 select-none">
              2
            </span>
          </button>

          {/* Notifications Trigger Button */}
          <button className="p-2.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-full relative transition-all active:scale-95 group cursor-pointer">
            <Bell className="w-5 h-5 transition-transform group-hover:rotate-12" />
            <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-primary rounded-full ring-2 ring-background" />
            <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-primary rounded-full animate-ping opacity-40" />
          </button>

          {/* Add a Dashboard button that appears when one logs in this button will be able to redirect a user to there dashboard according to there role */}

          <div className="h-5 w-[1px] bg-border mx-1.5 hidden sm:block" />

          <ProfileSection />
        </div>
      </div>
    </header>
  );
}