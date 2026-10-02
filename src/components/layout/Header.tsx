"use client";

import { Suspense, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Bell,
  LogOut,
  Menu,
  Package,
  Settings,
  ShoppingBag,
  ShoppingCart,
  ShieldCheck,
  Store,
  UserRound,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useWorkspaceAccess } from "@/hooks/use-workspace-access";
import { Skeleton } from "@/components/ui/skeleton";
import { useUserData } from "@/providers/UserDataProvider";
import { NotificationsSheet } from "@/components/notifications/NotificationsSheet";
import { MarketplaceSearch } from "@/components/marketplace/marketplace-search";
import { CustomerNavigationSheet } from "@/components/layout/CustomerNavigationSheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const emptySubscribe = () => () => {};

function AccountAvatar({
  name,
  photoUrl,
}: {
  name: string;
  photoUrl: string | null;
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const initial = name.trim().charAt(0).toUpperCase() || "U";
  return (
    <span className="relative flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/10 text-xs font-bold text-primary">
      {photoUrl && !imageFailed ? (
        <Image
          alt=""
          src={photoUrl}
          fill
          sizes="36px"
          className="object-cover"
          onError={() => setImageFailed(true)}
        />
      ) : (
        initial
      )}
    </span>
  );
}

function ProfileSection() {
  const router = useRouter();
  const { user, loading, isAuthenticated, logout } = useAuth();
  const { canAccessVendor, canAccessAdmin, loading: workspaceLoading } =
    useWorkspaceAccess();
  if (loading && !isAuthenticated)
    return <Skeleton className="size-9 rounded-full" />;
  if (!isAuthenticated)
    return (
      <div className="flex items-center gap-1">
        <Link
          href="/login"
          className="inline-flex min-h-10 items-center rounded-full px-3 text-sm font-medium text-foreground hover:bg-muted"
        >
          Sign in
        </Link>
        <Link
          href="/register"
          className="hidden min-h-10 items-center rounded-full bg-primary px-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 sm:inline-flex dark:text-white"
        >
          Create account
        </Link>
      </div>
    );
  const name = user?.displayName || user?.email?.split("@")[0] || "Account";
  const signOut = async () => {
    await logout();
    router.replace("/");
  };
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="inline-flex min-h-11 items-center gap-2 rounded-full p-1 text-left outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Open account menu"
        >
          <AccountAvatar name={name} photoUrl={user?.photoURL || null} />
          <span className="hidden max-w-28 truncate text-sm font-medium sm:inline">
            {name}
          </span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 mt-2">
        <DropdownMenuLabel className="truncate">{name}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/settings">
            <UserRound />
            My account
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/orders">
            <Package />
            My orders
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/wishlist">
            <ShoppingBag />
            Wishlist
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/settings">
            <Settings />
            Settings
          </Link>
        </DropdownMenuItem>
        {!workspaceLoading && (canAccessVendor || canAccessAdmin) && (
          <>
            <DropdownMenuSeparator />
            {canAccessVendor && (
              <DropdownMenuItem asChild>
                <Link href="/vendor">
                  <Store />
                  Vendor dashboard
                </Link>
              </DropdownMenuItem>
            )}
            {canAccessAdmin && (
              <DropdownMenuItem asChild>
                <Link href="/admin">
                  <ShieldCheck />
                  Admin dashboard
                </Link>
              </DropdownMenuItem>
            )}
          </>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={signOut} variant="destructive">
          <LogOut />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function CartButton() {
  const { cartCount } = useUserData();
  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
  return (
    <Link
      href="/cart"
      aria-label="Open cart"
      className="relative inline-flex size-11 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
    >
      <ShoppingCart className="size-5" />
      {mounted && cartCount > 0 && (
        <span className="absolute right-0.5 top-0.5 flex size-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground ring-2 ring-background">
          {cartCount > 99 ? "99+" : cartCount}
        </span>
      )}
    </Link>
  );
}

function NotificationsButton() {
  const { unreadCount } = useUserData();
  const [sheetOpen, setSheetOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setSheetOpen(true)}
        className="relative inline-flex size-11 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
        aria-label="Open notifications"
      >
        <Bell className="size-5" />
        {unreadCount > 0 && (
          <span className="absolute right-0.5 top-0.5 flex min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold leading-4 text-primary-foreground ring-2 ring-background">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>
      <NotificationsSheet open={sheetOpen} onOpenChange={setSheetOpen} />
    </>
  );
}

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/95 backdrop-blur">
      <div className="mx-auto flex min-h-16 w-full max-w-7xl items-center gap-3 px-4 sm:px-6 lg:px-8">
        <button
          onClick={() => setMenuOpen(true)}
          aria-label="Open menu"
          className="inline-flex size-11 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <Menu className="size-5" />
        </button>
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2 text-base font-bold tracking-tight text-foreground"
        >
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <ShoppingBag className="size-4" />
          </span>
          <span className="hidden sm:inline">
            Smart<span className="text-primary">Duka</span>
          </span>
        </Link>
        <Suspense
          fallback={
            <div className="hidden h-10 max-w-2xl flex-1 animate-pulse rounded-lg bg-muted md:block" />
          }
        >
          <MarketplaceSearch className="hidden max-w-2xl flex-1 md:block" />
        </Suspense>
        <MarketplaceSearch mobileTrigger className="md:hidden" />
        <nav
          aria-label="Marketplace shortcuts"
          className="hidden items-center gap-1 lg:flex"
        >
          <Link
            href="/categories"
            className="inline-flex min-h-11 items-center rounded-lg px-3 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            Categories
          </Link>
          <Link
            href="/shops"
            className="inline-flex min-h-11 items-center rounded-lg px-3 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            Shops
          </Link>
        </nav>
        <div className="ml-auto flex shrink-0 items-center gap-1">
          <CartButton />
          <NotificationsButton />
          <ProfileSection />
        </div>
      </div>
      <CustomerNavigationSheet open={menuOpen} onOpenChange={setMenuOpen} />
    </header>
  );
}
