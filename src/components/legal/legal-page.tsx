import Link from "next/link";
import { PageContainer } from "@/components/marketplace/page-container";

export function LegalPage({ title, updated, children }: { title: string; updated: string; children: React.ReactNode }) {
  return <PageContainer className="py-8 sm:py-12"><article className="mx-auto max-w-3xl"><Link href="/" className="text-sm font-medium text-primary hover:underline">← Back to SmartDuka</Link><p className="mt-8 text-sm font-medium text-muted-foreground">Last updated: {updated}</p><h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h1><div className="mt-8 space-y-8 text-sm leading-6 text-muted-foreground [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:tracking-tight [&_h2]:text-foreground [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-5">{children}</div></article></PageContainer>;
}
