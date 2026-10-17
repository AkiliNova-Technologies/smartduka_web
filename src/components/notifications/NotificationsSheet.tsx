"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bell,
  Check,
  CheckCheck,
  MoreVertical,
  RefreshCw,
  Trash2,
  X,
} from "lucide-react";
import {
  useUserData,
  type UserNotification,
} from "@/providers/UserDataProvider";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { getNotificationIcon } from "@/components/notifications/notification-icons";

interface NotificationsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function formatTimeAgo(dateString: string, now: number | null): string {
  if (now === null)
    return new Date(dateString).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });
  const diff = Math.max(0, now - new Date(dateString).getTime());
  const minutes = Math.floor(diff / 60_000),
    hours = Math.floor(diff / 3_600_000),
    days = Math.floor(diff / 86_400_000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return new Date(dateString).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export function groupNotificationsByDate(
  notifications: UserNotification[],
  now: number | null,
) {
  const groups = {
    today: [] as UserNotification[],
    yesterday: [] as UserNotification[],
    earlier: [] as UserNotification[],
  };
  if (now === null) return { ...groups, earlier: notifications };
  const current = new Date(now);
  const todayStart = new Date(
    current.getFullYear(),
    current.getMonth(),
    current.getDate(),
  ).getTime();
  const yesterdayStart = new Date(
    current.getFullYear(),
    current.getMonth(),
    current.getDate() - 1,
  ).getTime();
  for (const notification of notifications) {
    const time = new Date(notification.createdAt).getTime();
    if (time >= todayStart) groups.today.push(notification);
    else if (time >= yesterdayStart) groups.yesterday.push(notification);
    else groups.earlier.push(notification);
  }
  return groups;
}

type CardCallbacks = {
  now: number | null;
  pendingFor: (id: string) => boolean;
  onNavigate: (path: string) => void;
  onMarkRead: (id: string) => Promise<void>;
  onMarkUnread: (id: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
};

export function NotificationCard({
  notification,
  now,
  pendingFor,
  onNavigate,
  onMarkRead,
  onMarkUnread,
  onDelete,
}: CardCallbacks & { notification: UserNotification }) {
  const unread = !notification.readAt;
  const destination = notification.actionPath?.startsWith("/")
    ? notification.actionPath
    : null;
  const pending = pendingFor(notification.id);
  const { icon: Icon, className: iconClassName } = getNotificationIcon(
    notification.eventType,
  );
  return (
    <Card
      className={cn(
        "relative overflow-hidden border-border/60 p-0 shadow-none transition-colors",
        unread ? "border-primary/20 bg-primary/[0.025]" : "bg-card",
      )}>
      <button
        type="button"
        disabled={!destination}
        onClick={() => destination && onNavigate(destination)}
        className={cn(
          "flex w-full min-w-0 items-start gap-3 p-4 pr-12 text-left outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
          destination ? "cursor-pointer hover:bg-muted/30" : "cursor-default",
        )}>
        <span
          className={cn(
            "mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg",
            iconClassName,
          )}>
          <Icon aria-hidden="true" className="size-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex min-w-0 items-start gap-2">
            <span
              className={cn(
                "min-w-0 flex-1 break-words text-sm font-semibold leading-5",
                !unread && "text-muted-foreground",
              )}>
              {notification.title}
            </span>
            {unread && (
              <span
                className="mt-1.5 size-2 shrink-0 rounded-full bg-primary"
                aria-label="Unread"
              />
            )}
          </span>
          <span className="mt-1 block break-words text-xs leading-5 text-muted-foreground">
            {notification.message}
          </span>
          <span className="mt-2 block text-[11px] font-medium text-muted-foreground/70">
            {notification.source === "MARKETING" && <span className="mr-2 rounded-full bg-primary/10 px-2 py-0.5 text-primary">Promotional</span>}
            {formatTimeAgo(notification.createdAt, now)}
          </span>
        </span>
      </button>
      <div className="absolute right-2 top-2">
        <DropdownMenu>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  disabled={pending}
                  aria-label={`Actions for ${notification.title}`}
                  className="rounded-full text-muted-foreground">
                  <MoreVertical aria-hidden="true" />
                </Button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent side="left">Notification actions</TooltipContent>
          </Tooltip>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem
              onSelect={() =>
                void (unread
                  ? onMarkRead(notification.id)
                  : onMarkUnread(notification.id))
              }>
              <Check aria-hidden="true" />
              Mark as {unread ? "read" : "unread"}
            </DropdownMenuItem>
            <DropdownMenuItem
              variant="destructive"
              onSelect={() => void onDelete(notification.id)}>
              <Trash2 aria-hidden="true" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </Card>
  );
}

function NotificationGroup({
  label,
  notifications,
  ...callbacks
}: { label: string; notifications: UserNotification[] } & CardCallbacks) {
  if (!notifications.length) return null;
  const id = `notification-group-${label.toLowerCase()}`;
  return (
    <section aria-labelledby={id}>
      <h2
        id={id}
        className="mb-2 px-1 text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </h2>
      <div className="space-y-3">
        {notifications.map((notification) => (
          <NotificationCard
            key={notification.id}
            notification={notification}
            {...callbacks}
          />
        ))}
      </div>
    </section>
  );
}

function NotificationSkeletons() {
  return (
    <div className="space-y-3 px-4 py-5" aria-label="Loading notifications">
      {[0, 1, 2].map((item) => (
        <Card key={item} className="flex items-start gap-3 p-4 shadow-none">
          <Skeleton className="size-9 shrink-0 rounded-lg" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-5/6" />
            <Skeleton className="h-3 w-16" />
          </div>
        </Card>
      ))}
    </div>
  );
}

export function NotificationsSheet({
  open,
  onOpenChange,
}: NotificationsSheetProps) {
  const {
    notifications,
    unreadCount,
    notificationsLoading,
    notificationsError,
    markAsRead,
    markAsUnread,
    deleteNotification,
    markAllAsRead,
    isNotificationMutating,
    refreshNotifications,
  } = useUserData();
  const [now, setNow] = React.useState<number | null>(null);
  const router = useRouter();
  React.useEffect(() => {
    const timer = window.setTimeout(() => setNow(Date.now()), 0);
    return () => window.clearTimeout(timer);
  }, []);
  React.useEffect(() => {
    if (open) void refreshNotifications();
  }, [open, refreshNotifications]);
  const grouped = groupNotificationsByDate(notifications, now);
  const callbacks: CardCallbacks = {
    now,
    pendingFor: isNotificationMutating,
    onMarkRead: markAsRead,
    onMarkUnread: markAsUnread,
    onDelete: deleteNotification,
    onNavigate: (path) => {
      onOpenChange(false);
      router.push(path);
    },
  };
  return (
    <Sheet open={open} onOpenChange={onOpenChange} >
      <SheetContent
        side="right"
        className="flex w-full flex-col overflow-hidden border-l border-border/60 bg-background p-0 sm:max-w-md">
        <SheetHeader  className="sticky top-0 z-10 shrink-0 border-b border-border/60 bg-background/95 px-4 pb-4 pr-12 pt-[max(1.25rem,env(safe-area-inset-top))] backdrop-blur">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <SheetTitle className="flex items-center gap-2 text-base font-semibold">
                <Bell className="size-4" />
                Notifications{" "}
                {unreadCount > 0 && (
                  <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold leading-5 text-primary-foreground">
                    {unreadCount}
                  </span>
                )}
              </SheetTitle>
              <p className="mt-1 text-xs text-muted-foreground">
                {unreadCount ? `${unreadCount} unread` : "You’re all caught up"}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              disabled={!unreadCount || notificationsLoading}
              onClick={() => void markAllAsRead()}
              className="shrink-0 gap-1.5 rounded-full text-xs">
              <CheckCheck className="size-3.5" />
              Mark all read
            </Button>
          </div>
        </SheetHeader>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-[env(safe-area-inset-bottom)]">
          {notificationsLoading && !notifications.length ? (
            <NotificationSkeletons />
          ) : notificationsError && !notifications.length ? (
            <div
              className="flex h-full flex-col items-center justify-center px-6 py-12 text-center"
              role="alert">
              <span className="flex size-11 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
                <X className="size-5" />
              </span>
              <p className="mt-4 text-sm font-semibold">
                Notifications unavailable
              </p>
              <p className="mt-1 max-w-64 text-xs leading-5 text-muted-foreground">
                {notificationsError}
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-4 gap-2"
                onClick={() => void refreshNotifications()}>
                <RefreshCw className="size-3.5" />
                Retry
              </Button>
            </div>
          ) : !notifications.length ? (
            <div className="flex h-full flex-col items-center justify-center px-6 py-12 text-center">
              <Image
                src="/illustrations/empty-notifications.svg"
                alt=""
                width={144}
                height={112}
                className="h-auto w-28"
              />
              <p className="mt-4 text-sm font-semibold">You’re all caught up</p>
              <p className="mt-1 max-w-60 text-xs leading-5 text-muted-foreground">
                New account, order, payment, and shop updates will appear here.
              </p>
            </div>
          ) : (
            <TooltipProvider>
              <div className="space-y-6 px-4 py-5">
                {notificationsError && (
                  <div
                    className="flex items-center justify-between gap-3 rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-xs text-destructive"
                    role="alert">
                    <span>{notificationsError}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => void refreshNotifications()}>
                      Retry
                    </Button>
                  </div>
                )}
                <NotificationGroup
                  label="Today"
                  notifications={grouped.today}
                  {...callbacks}
                />
                <NotificationGroup
                  label="Yesterday"
                  notifications={grouped.yesterday}
                  {...callbacks}
                />
                <NotificationGroup
                  label="Earlier"
                  notifications={grouped.earlier}
                  {...callbacks}
                />
              </div>
            </TooltipProvider>
          )}
        </div>
        <div className="shrink-0 border-t bg-background p-3"><Button asChild variant="ghost" className="w-full"><Link href="/notifications" onClick={() => onOpenChange(false)}>View all notifications</Link></Button></div>
      </SheetContent>
    </Sheet>
  );
}
