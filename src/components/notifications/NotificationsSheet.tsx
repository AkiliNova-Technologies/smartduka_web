"use client";

import * as React from "react";
import Image from "next/image";
import {
  Bell,
  Check,
  ShoppingBag,
  Truck,
  CreditCard,
  X,
  CheckCheck,
} from "lucide-react";
import { useUserData } from "@/providers/UserDataProvider";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// ==========================================
// TYPES
// ==========================================

interface NotificationsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// ==========================================
// HELPERS
// ==========================================

function getNotificationIcon(type: string) {
  switch (type) {
    case "ORDER_PLACED":
      return { icon: ShoppingBag, color: "text-blue-500 bg-blue-500/10" };
    case "PAYMENT_RECEIVED":
      return { icon: CreditCard, color: "text-emerald-500 bg-emerald-500/10" };
    case "ORDER_STATUS_UPDATE":
      return { icon: Truck, color: "text-amber-500 bg-amber-500/10" };
    case "SUCCESS":
      return { icon: Check, color: "text-emerald-500 bg-emerald-500/10" };
    case "WARNING":
      return { icon: Bell, color: "text-amber-500 bg-amber-500/10" };
    case "ERROR":
      return { icon: X, color: "text-rose-500 bg-rose-500/10" };
    default:
      return { icon: Bell, color: "text-muted-foreground bg-muted" };
  }
}

function formatTimeAgo(dateString: string, now: number | null): string {
  if (now === null) {
    return new Date(dateString).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }
  const then = new Date(dateString).getTime();
  const diff = now - then;

  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function groupNotificationsByDate(
  notifications: {
    id: string;
    type: string;
    title: string;
    message: string;
    readAt: string | null;
    createdAt: string;
  }[],
  now: number | null,
) {
  const today: typeof notifications = [];
  const yesterday: typeof notifications = [];
  const earlier: typeof notifications = [];

  if (now === null) return { today, yesterday, earlier: notifications };
  const current = new Date(now);
  const todayStart = new Date(current.getFullYear(), current.getMonth(), current.getDate()).getTime();
  const yesterdayStart = todayStart - 86400000;

  for (const n of notifications) {
    const time = new Date(n.createdAt).getTime();
    if (time >= todayStart) {
      today.push(n);
    } else if (time >= yesterdayStart) {
      yesterday.push(n);
    } else {
      earlier.push(n);
    }
  }

  return { today, yesterday, earlier };
}

// ==========================================
// COMPONENT
// ==========================================

export function NotificationsSheet({
  open,
  onOpenChange,
}: NotificationsSheetProps) {
  const { notifications, unreadCount, markAsRead, markAllAsRead } =
    useUserData();
  const [now, setNow] = React.useState<number | null>(null);

  React.useEffect(() => {
    const timer = window.setTimeout(() => setNow(Date.now()), 0);
    return () => window.clearTimeout(timer);
  }, []);

  const grouped = groupNotificationsByDate(notifications, now);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-md p-0 flex flex-col bg-card border-l border-border/60">
        {/* Header */}
        <SheetHeader className="px-5 pt-8 pb-6 border-b border-border/40 shrink-0">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-base font-semibold text-foreground flex items-center gap-2">
              <Bell className="w-4 h-4" />
              Notifications
              {unreadCount > 0 && (
                <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 bg-primary text-primary-foreground rounded-full text-[10px] font-bold">
                  {unreadCount}
                </span>
              )}
            </SheetTitle>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={markAllAsRead}
                className="h-7 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground rounded-full gap-1.5 cursor-pointer">
                <CheckCheck className="w-3.5 h-3.5" />
                Mark all read
              </Button>
            )}
          </div>
        </SheetHeader>

        {/* Notification List */}
        <div className="flex-1 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center px-6 py-10 text-center">
              <Image
                src="/illustrations/empty-notifications.svg"
                alt=""
                width={144}
                height={112}
                className="h-auto w-28"
                loading="eager"
              />
              <p className="mt-4 text-sm font-semibold text-foreground">
                You’re all caught up
              </p>
              <p className="mt-1 max-w-56 text-xs leading-5 text-muted-foreground">
                No new notifications. We’ll let you know when something arrives.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border/40">
              {/* Today */}
              {grouped.today.length > 0 && (
                <NotificationGroup
                  label="Today"
                  notifications={grouped.today}
                  onMarkRead={markAsRead}
                  now={now}
                />
              )}

              {/* Yesterday */}
              {grouped.yesterday.length > 0 && (
                <NotificationGroup
                  label="Yesterday"
                  notifications={grouped.yesterday}
                  onMarkRead={markAsRead}
                  now={now}
                />
              )}

              {/* Earlier */}
              {grouped.earlier.length > 0 && (
                <NotificationGroup
                  label="Earlier"
                  notifications={grouped.earlier}
                  onMarkRead={markAsRead}
                  now={now}
                />
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border/40 shrink-0">
          <p className="text-[10px] text-muted-foreground text-center font-medium">
            Notifications are stored for 30 days
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ==========================================
// NOTIFICATION GROUP
// ==========================================

function NotificationGroup({
  label,
  notifications,
  onMarkRead,
  now,
}: {
  label: string;
  notifications: {
    id: string;
    type: string;
    title: string;
    message: string;
    readAt: string | null;
    createdAt: string;
  }[];
  onMarkRead: (id: string) => void;
  now: number | null;
}) {
  return (
    <div>
      <div className="px-5 py-2 bg-muted/20">
        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
          {label}
        </span>
      </div>
      {notifications.map((notification) => {
        const { icon: Icon, color } = getNotificationIcon(notification.type);
        const isUnread = !notification.readAt;

        return (
          <button
            key={notification.id}
            onClick={() => onMarkRead(notification.id)}
            className={cn(
              "w-full text-left px-5 py-3.5 flex items-start gap-3 hover:bg-muted/30 transition-colors",
              isUnread && "bg-primary/[0.02]",
            )}>
            {/* Icon */}
            <div
              className={cn(
                "w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5",
                color,
              )}>
              <Icon className="w-4 h-4" />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0 space-y-1">
              <div className="flex items-center justify-between gap-2">
                <p
                  className={cn(
                    "text-xs font-semibold truncate",
                    isUnread ? "text-foreground" : "text-muted-foreground",
                  )}>
                  {notification.title}
                </p>
                {isUnread && (
                  <span className="w-2 h-2 rounded-full bg-primary shrink-0" />
                )}
              </div>
              <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                {notification.message}
              </p>
              <p className="text-[10px] text-muted-foreground/60 font-medium">
                {formatTimeAgo(notification.createdAt, now)}
              </p>
            </div>
          </button>
        );
      })}
    </div>
  );
}
