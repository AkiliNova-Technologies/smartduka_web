import { BadgeCheck } from "lucide-react";

export function ShopVerificationBadge({ compact = false, className = "" }: { compact?: boolean; className?: string }) {
  return <span title="Verified by SmartDuka — we have reviewed this shop's verification information." aria-label="Verified by SmartDuka" className={`inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary ${className}`}><BadgeCheck aria-hidden="true" className="size-3.5" />{compact ? <span className="sr-only">Verified shop</span> : <span>Verified shop</span>}</span>;
}
