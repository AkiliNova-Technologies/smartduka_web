"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { House, LayoutGrid, Search, ShoppingCart, UserRound } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useUserData } from "@/providers/UserDataProvider";
import { isRouteActive } from "@/components/layout/nav-utils";

const items = [
  { label: "Home", href: "/", icon: House },
  { label: "Categories", href: "/categories", icon: LayoutGrid },
  { label: "Search", href: "/products", icon: Search },
  { label: "Cart", href: "/cart", icon: ShoppingCart },
];

export function MobileCommerceNavFallback() {
  return (
    <nav
      aria-label="Mobile marketplace navigation"
      aria-hidden="true"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-border/70 bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
    >
      <div className="mx-auto grid max-w-lg grid-cols-5">
        {[...items, { label: "Account", href: "/login", icon: UserRound }].map(({ label, icon: Icon }) => (
          <div key={label} className="flex min-h-14 flex-col items-center justify-center gap-1 text-[11px] font-medium text-muted-foreground">
            <Icon className="size-5" />
            <span>{label}</span>
          </div>
        ))}
      </div>
    </nav>
  );
}

export function MobileCommerceNav() {
  const pathname = usePathname();
  const { isAuthenticated } = useAuth();
  const { cartCount } = useUserData();
  const accountHref = isAuthenticated ? "/settings" : "/login";
  const navigation = [
    ...items,
    { label: "Account", href: accountHref, icon: UserRound },
  ];
  return (
    <nav
      aria-label="Mobile marketplace navigation"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-border/70 bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
    >
      <div className="mx-auto grid max-w-lg grid-cols-5">
        {navigation.map((item) => {
          const active = isRouteActive(pathname, item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.label}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`relative flex min-h-14 flex-col items-center justify-center gap-1 text-[11px] ${active ? "font-semibold text-primary" : "font-medium text-muted-foreground"}`}
            >
              <Icon className="size-5" />
              {item.label === "Cart" && cartCount > 0 ? (
                <span className="absolute top-1 right-[calc(50%-16px)] flex min-w-4 justify-center rounded-full bg-primary px-1 text-[9px] leading-4 text-primary-foreground">
                  {cartCount > 99 ? "99+" : cartCount}
                </span>
              ) : null}
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
