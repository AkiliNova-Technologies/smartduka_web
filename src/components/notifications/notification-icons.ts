import {
  BadgeCheck, BadgeX, Bell, CircleAlert, ClipboardCheck, CreditCard,
  FileCheck2, Gift, Info, Landmark, Megaphone, PackageCheck, ShieldCheck,
  ShoppingBag, Truck, Wallet, Wrench, type LucideIcon,
} from "lucide-react";

export interface NotificationIconStyle { icon: LucideIcon; className: string }

const success = "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400";
const warning = "bg-amber-500/10 text-amber-700 dark:text-amber-400";
const primary = "bg-primary/10 text-primary";
const danger = "bg-destructive/10 text-destructive";
const neutral = "bg-muted text-muted-foreground";

const eventIcons: Record<string, NotificationIconStyle> = {
  VERIFICATION_SUBMITTED: { icon: FileCheck2, className: primary },
  VERIFICATION_ASSIGNED: { icon: ClipboardCheck, className: primary },
  VERIFICATION_INFORMATION_PROVIDED: { icon: FileCheck2, className: primary },
  VERIFICATION_UNDER_REVIEW: { icon: ClipboardCheck, className: primary },
  VERIFICATION_INFORMATION_REQUIRED: { icon: CircleAlert, className: warning },
  VERIFICATION_APPROVED: { icon: BadgeCheck, className: success },
  VERIFICATION_REJECTED: { icon: BadgeX, className: danger },
  VERIFICATION_SUSPENDED: { icon: CircleAlert, className: warning },
  VERIFICATION_RESTORED: { icon: BadgeCheck, className: success },
  VERIFICATION_REVOKED: { icon: BadgeX, className: danger },
  ORDER_CREATED: { icon: ShoppingBag, className: primary },
  ORDER_RECEIVED: { icon: ShoppingBag, className: primary },
  ORDER_PROCESSING: { icon: ShoppingBag, className: primary },
  ORDER_CANCELLED: { icon: CircleAlert, className: danger },
  ORDER_DISPATCHED: { icon: Truck, className: primary },
  ORDER_READY_FOR_PICKUP: { icon: PackageCheck, className: primary },
  ORDER_DELIVERED: { icon: PackageCheck, className: success },
  PAYMENT_CONFIRMED: { icon: Wallet, className: success },
  PAYMENT_FAILED: { icon: CircleAlert, className: danger },
  PAYMENT_REVERSED: { icon: CircleAlert, className: warning },
  PAYOUT_UPDATED: { icon: Landmark, className: primary },
  SUBSCRIPTION_UPDATED: { icon: CreditCard, className: primary },
  ADVERTISING: { icon: Megaphone, className: primary },
  MARKETING: { icon: Gift, className: primary },
  SECURITY: { icon: ShieldCheck, className: warning },
  MAINTENANCE: { icon: Wrench, className: neutral },
  SYSTEM: { icon: Info, className: neutral },
};

const fallback: NotificationIconStyle = { icon: Bell, className: neutral };
export function getNotificationIcon(eventType?: string | null): NotificationIconStyle {
  return eventType ? eventIcons[eventType] ?? fallback : fallback;
}
