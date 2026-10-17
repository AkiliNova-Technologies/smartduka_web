import { readFileSync } from "node:fs";
import { join } from "node:path";
import { BadgeCheck, Bell, PackageCheck, Truck, Wallet } from "lucide-react";
import { describe, expect, it } from "vitest";
import { getNotificationIcon } from "@/components/notifications/notification-icons";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

describe("modern notification sheet", () => {
  it("maps persisted business events and preserves a historical fallback", () => {
    expect(getNotificationIcon("VERIFICATION_APPROVED").icon).toBe(BadgeCheck);
    expect(getNotificationIcon("ORDER_DISPATCHED").icon).toBe(Truck);
    expect(getNotificationIcon("ORDER_DELIVERED").icon).toBe(PackageCheck);
    expect(getNotificationIcon("PAYMENT_CONFIRMED").icon).toBe(Wallet);
    expect(getNotificationIcon(null).icon).toBe(Bell);
    expect(getNotificationIcon("FUTURE_EVENT").icon).toBe(Bell);
  });

  it("renders distinct cards with keyboard-safe navigation and separate contextual actions", () => {
    const sheet = read("src/components/notifications/NotificationsSheet.tsx");
    expect(sheet).toContain("export function NotificationCard");
    expect(sheet).toContain("<Card");
    expect(sheet).toContain("<DropdownMenu>");
    expect(sheet).toContain("Notification actions");
    expect(sheet).toContain("Mark as {unread ? \"read\" : \"unread\"}");
    expect(sheet).toContain("onSelect={() => void onDelete(notification.id)}");
    expect(sheet).toContain("focus-visible:ring-2");
    expect(sheet).not.toContain("<button key={notification.id}");
  });

  it("keeps responsive spacing, sticky hierarchy, grouped dates, and card-shaped skeletons", () => {
    const sheet = read("src/components/notifications/NotificationsSheet.tsx");
    expect(sheet).toContain("sticky top-0");
    expect(sheet).toContain("px-4 py-5");
    expect(sheet).toContain("sm:max-w-md");
    expect(sheet).toContain('label="Yesterday"');
    expect(sheet).toContain("function NotificationSkeletons");
    expect(sheet).toContain("You’re all caught up");
  });

  it("persists unread and soft-delete mutations behind active-user ownership", () => {
    const unread = read("src/app/api/v1/notifications/[id]/unread/route.ts");
    const deletion = read("src/app/api/v1/notifications/[id]/route.ts");
    const list = read("src/app/api/v1/notifications/route.ts");
    expect(unread).toContain("requireActiveUserId()");
    expect(unread).toContain("id, userId, deletedAt: null");
    expect(deletion).toContain("id, userId, deletedAt: null");
    expect(deletion).toContain("deletedAt: new Date()");
    expect(list).toContain("userId, deletedAt: null");
  });

  it("retains optimistic rollback, mutation deduplication, and identity reset", () => {
    const provider = read("src/providers/UserDataProvider.tsx");
    expect(provider).toContain("NotificationClient.markUnread(notificationId)");
    expect(provider).toContain("NotificationClient.delete(notificationId)");
    expect(provider).toContain("readMutationIdsRef.current.has(notificationId)");
    expect(provider).toContain("restored.splice");
    expect(provider).toContain("notificationAbortRef.current?.abort()");
    expect(provider).toContain("setNotificationMutationIds(new Set())");
  });
});
