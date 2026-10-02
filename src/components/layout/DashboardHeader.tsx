"use client";

import { useState, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, LogOut, Menu, Moon, Settings, Sun } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "@/hooks/use-theme";
import { useUserData } from "@/providers/UserDataProvider";
import { useSidebar } from "@/components/ui/sidebar";
import { NotificationsSheet } from "@/components/notifications/NotificationsSheet";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type HeaderLink = { href: string; label: string; icon: typeof Settings };

function HeaderButton({
  children,
  label,
  onClick,
}: {
  children: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="relative inline-flex size-11 shrink-0 items-center justify-center rounded-lg text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring">
      {children}
    </button>
  );
}

function NotificationsButton() {
  const { unreadCount } = useUserData();
  const [open, setOpen] = useState(false);
  return (
    <>
      <HeaderButton label="Open notifications" onClick={() => setOpen(true)}>
        <Bell className="size-5" />
        {unreadCount > 0 && (
          <span
            aria-label={`${unreadCount} unread notifications`}
            className="absolute right-0.5 top-0.5 flex min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold leading-4 text-primary-foreground ring-2 ring-background">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </HeaderButton>
      <NotificationsSheet open={open} onOpenChange={setOpen} />
    </>
  );
}

function ThemeButton() {
  const { isDark, toggleTheme } = useTheme();
  return (
    <HeaderButton
      label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      onClick={toggleTheme}>
      {isDark ? <Sun className="size-5" /> : <Moon className="size-5" />}
    </HeaderButton>
  );
}

function AccountMenu({
  links,
}: {
  links: HeaderLink[];
}) {
  const router = useRouter();
  const { user, loading, logout } = useAuth();
  const [imageFailed, setImageFailed] = useState(false);
  if (loading) return <Skeleton className="size-9 rounded-full" />;
  const name = user?.displayName || user?.email?.split("@")[0] || "Account";
  const photo = user?.photoURL;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="inline-flex min-h-11 items-center gap-2 rounded-full p-1 text-left outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Open account menu">
          <span className="relative flex size-9 items-center justify-center overflow-hidden rounded-full bg-primary/10 text-xs font-bold text-primary">
            {photo && !imageFailed ? (
              <Image
                alt=""
                src={photo}
                fill
                sizes="36px"
                className="object-cover"
                onError={() => setImageFailed(true)}
              />
            ) : (
              name.charAt(0).toUpperCase()
            )}
          </span>
          <span className="hidden max-w-28 truncate text-sm font-medium sm:inline">
            {name}
          </span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="mt-2 w-56">
        <DropdownMenuLabel className="truncate">{name}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {links.map((link) => (
          <DropdownMenuItem key={link.href} asChild>
            <Link href={link.href}>
              <link.icon />
              {link.label}
            </Link>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={async () => {
            await logout();
            router.replace("/");
          }}
          variant="destructive">
          <LogOut />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function DashboardHeader({
  context,
  title,
  accountLinks,
}: {
  context: string;
  title: string;
  accountLinks: HeaderLink[];
}) {
  const { open, toggleSidebar } = useSidebar();
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/95 backdrop-blur">
      <div className="mx-auto flex min-h-16 w-full max-w-7xl items-center gap-3 px-4 sm:px-6 lg:px-8">
        <button
          type="button"
          onClick={toggleSidebar}
          aria-label={
            open ? "Collapse navigation sidebar" : "Expand navigation sidebar"
          }
          aria-expanded={open}
          className="inline-flex size-11 shrink-0 items-center justify-center rounded-lg text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring">
          <Menu className="size-5" />
        </button>
        <span className="rounded-md border border-border/60 bg-muted px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          {context}
        </span>
        <h1 className="min-w-0 truncate text-sm font-semibold text-foreground">
          {title}
        </h1>
        <div className="ml-auto flex shrink-0 items-center gap-1">
          <ThemeButton />
          <NotificationsButton />
          <AccountMenu links={accountLinks} />
        </div>
      </div>
    </header>
  );
}
