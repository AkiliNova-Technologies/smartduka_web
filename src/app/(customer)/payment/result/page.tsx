import Link from "next/link";
import { CircleCheck, Clock3 } from "lucide-react";

export default function PaymentResultPage() {
  return <main className="mx-auto flex min-h-[70vh] max-w-lg flex-col items-center justify-center px-6 text-center"><div className="grid size-14 place-items-center rounded-full bg-primary/10 text-primary"><CircleCheck className="size-7" /></div><h1 className="mt-5 text-2xl font-semibold tracking-tight">Payment return received</h1><p className="mt-3 text-sm leading-relaxed text-muted-foreground">We are confirming the payment response securely. Your order status will update once verification is complete.</p><div className="mt-5 flex items-center gap-2 rounded-xl border bg-card px-4 py-3 text-left text-xs text-muted-foreground"><Clock3 className="size-4 shrink-0 text-primary" />Payment status is never inferred from this page.</div><Link href="/orders" className="mt-6 inline-flex h-11 items-center rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground">View your orders</Link><Link href="/products" className="mt-3 text-sm font-medium text-muted-foreground hover:text-foreground">Continue shopping</Link></main>;
}
