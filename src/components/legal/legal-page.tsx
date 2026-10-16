import { PageContainer } from "@/components/marketplace/page-container";
import { DetailPageHeader } from "@/components/detail-page-header";

const descriptions: Record<string, string> = {
  "Mwezora Terms & Conditions": "Understand your rights and responsibilities.",
  "Privacy Policy": "How we collect, use and protect your information.",
  "Cookie Policy": "Understand how Mwezora uses cookies and similar technologies.",
};

export function LegalPage({ title, updated, children }: { title: string; updated: string; children: React.ReactNode }) {
  return <PageContainer className="py-8 sm:py-12"><article className="mx-auto max-w-3xl"><DetailPageHeader title={title} description={descriptions[title]} backHref="/" backLabel="Back to Mwezora" /><section aria-label="Document information" className="mt-5 rounded-xl border border-border/60 bg-muted/30 px-4 py-3"><p className="text-xs font-medium text-muted-foreground">Document status</p><p className="mt-1 text-sm text-foreground">{updated}</p></section><div className="mt-8 space-y-8 text-sm leading-6 text-muted-foreground [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:tracking-tight [&_h2]:text-foreground [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-5">{children}</div></article></PageContainer>;
}
