"use client";

import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  BadgePercent,
  CircleHelp,
  Heart,
  Home,
  LayoutGrid,
  LogOut,
  Package,
  Settings,
  ShoppingBag,
  Sparkles,
  Store,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { useState } from "react";
import { useTheme } from "@/hooks/use-theme";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { useWorkspaceAccess } from "@/hooks/use-workspace-access";
import { isRouteActive } from "@/components/layout/nav-utils";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

const shopItems = [
  { label: "Home", href: "/", icon: Home },
  { label: "All products", href: "/products", icon: ShoppingBag },
  { label: "Categories", href: "/categories", icon: LayoutGrid },
  { label: "Shops", href: "/shops", icon: Store },
  { label: "Deals", href: "/deals", icon: BadgePercent },
  { label: "New arrivals", href: "/new-arrivals", icon: Sparkles },
];
const accountItems = [
  { label: "My orders", href: "/orders", icon: Package },
  { label: "Wishlist", href: "/wishlist", icon: Heart },
  { label: "Settings", href: "/settings", icon: Settings },
];
const helpItems = [{ label: "Help & support", href: "/help", icon: CircleHelp }];

export function CustomerNavigationSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading, isAuthenticated, logout } = useAuth();
  const { canAccessVendor, canAccessAdmin, loading: workspaceLoading } =
    useWorkspaceAccess();
  const [avatarFailed, setAvatarFailed] = useState(false);
  const { theme, setTheme, mounted } = useTheme();
  const name = user?.displayName || user?.email?.split("@")[0] || "Account";
  const navigate = () => onOpenChange(false);
  const signOut = async () => {
    onOpenChange(false);
    await logout();
    router.replace("/");
  };
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="left"
        className="w-[88vw] max-w-[380px] gap-0 p-0"
        aria-describedby="customer-navigation-description">
        <SheetHeader className="border-b px-5 py-4 pr-14">
          <SheetTitle className="flex items-center gap-2 text-base font-bold">
            <span className="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground">
              <ShoppingBag className="size-4" />
            </span>
            Smart<span className="text-primary">Duka</span>
          </SheetTitle>
          <SheetDescription
            id="customer-navigation-description"
            className="sr-only">
            Marketplace navigation
          </SheetDescription>
        </SheetHeader>
        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-4">
          {!loading &&
            (isAuthenticated ? (
              <Link
                href="/settings"
                onClick={navigate}
                className="mb-5 flex items-center gap-3 rounded-lg bg-muted/60 p-3 hover:bg-muted">
                <Avatar
                  name={name}
                  photoUrl={user?.photoURL || null}
                  failed={avatarFailed}
                  onError={() => setAvatarFailed(true)}
                />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold">
                    {name}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    View account
                  </span>
                </span>
              </Link>
            ) : (
              <div className="mb-5 rounded-lg border bg-muted/30 p-3">
                <p className="text-sm font-medium">Welcome to SmartDuka</p>
                <div className="mt-3 flex gap-2">
                  <Link
                    href="/login"
                    onClick={navigate}
                    className="inline-flex h-10 items-center rounded-lg px-3 text-sm font-semibold hover:bg-muted">
                    Sign in
                  </Link>
                  <Link
                    href="/register"
                    onClick={navigate}
                    className="inline-flex h-10 items-center rounded-lg bg-primary px-3 text-sm font-semibold text-primary-foreground">
                    Create account
                  </Link>
                </div>
              </div>
            ))}
          <NavGroup
            label="Shop"
            items={shopItems}
            pathname={pathname}
            onNavigate={navigate}
          />
          {isAuthenticated && (
            <NavGroup
              label="Your account"
              items={accountItems}
              pathname={pathname}
              onNavigate={navigate}
            />
          )}
          {!workspaceLoading && (canAccessVendor || canAccessAdmin) && (
            <NavGroup
              label="Workspaces"
              items={[
                ...(canAccessVendor
                  ? [{ label: "Vendor dashboard", href: "/vendor", icon: Store }]
                  : []),
                ...(canAccessAdmin
                  ? [{ label: "Admin dashboard", href: "/admin", icon: ShieldCheck }]
                  : []),
              ]}
              pathname={pathname}
              onNavigate={navigate}
            />
          )}
          <NavGroup
            label="Help"
            items={[
              ...helpItems,
              ...(!isAuthenticated || !canAccessVendor
                ? [{ label: "Become a seller", href: "/become-seller", icon: Store }]
                : []),
            ]}
            pathname={pathname}
            onNavigate={navigate}
          />
          <section className="mb-2 px-3"><h2 className="text-xs font-medium tracking-wide text-muted-foreground">Appearance</h2><div className="mt-2 grid grid-cols-2 rounded-full border p-1"><button aria-pressed={mounted && theme === "light"} onClick={() => setTheme("light")} className={cn("h-9 rounded-full text-xs font-medium", mounted && theme === "light" && "bg-primary text-primary-foreground")}>Light</button><button aria-pressed={mounted && theme === "dark"} onClick={() => setTheme("dark")} className={cn("h-9 rounded-full text-xs font-medium", mounted && theme === "dark" && "bg-primary text-primary-foreground")}>Dark</button></div></section>
        </div>
        {isAuthenticated && (
          <SheetFooter className="border-t p-3">
            <button
              onClick={signOut}
              className="flex h-11 w-full items-center gap-3 rounded-lg px-3 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground">
              <LogOut className="size-4" />
              Sign out
            </button>
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  );
}
function NavGroup({
  label,
  items,
  pathname,
  onNavigate,
}: {
  label: string;
  items: { label: string; href: string; icon: typeof Home }[];
  pathname: string;
  onNavigate: () => void;
}) {
  return (
    <section className="mb-5">
      <h2 className="px-3 text-xs font-medium tracking-wide text-muted-foreground">
        {label}
      </h2>
      <div className="mt-2 space-y-1">
        {items.map((item) => {
          const active = isRouteActive(pathname, item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium",
                active
                  ? "bg-primary/10 text-primary"
                  : "text-foreground hover:bg-muted",
              )}>
              <Icon className="size-4" />
              {item.label}
            </Link>
          );
        })}
      </div>
    </section>
  );
}
function Avatar({
  name,
  photoUrl,
  failed,
  onError,
}: {
  name: string;
  photoUrl: string | null;
  failed: boolean;
  onError: () => void;
}) {
  return (
    <span className="relative grid size-10 shrink-0 place-items-center overflow-hidden rounded-full bg-primary/10 text-sm font-semibold text-primary">
      {photoUrl && !failed ? (
        <Image
          src={photoUrl}
          alt=""
          fill
          sizes="40px"
          className="object-cover"
          onError={onError}
        />
      ) : (
        <>
          {name.trim().charAt(0).toUpperCase() || (
            <UserRound className="size-4" />
          )}
        </>
      )}
    </span>
  );
}
