"use client";

import * as React from "react";
import { Monitor, Smartphone } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

export function MarketingPreviewShell({
  title = "Customer preview",
  description = "This preview is non-interactive.",
  empty,
  children,
  className,
}: {
  title?: string;
  description?: string;
  empty?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}) {
  const [viewport, setViewport] = React.useState<"desktop" | "mobile">("desktop");
  return (
    <section className={cn("overflow-hidden rounded-xl border border-border/60 bg-card", className)} aria-label={title}>
      <div className="flex flex-col gap-3 border-b border-border/60 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold text-foreground">{title}</h2>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
        <Tabs value={viewport} onValueChange={(value) => setViewport(value as "desktop" | "mobile")}>
          <TabsList aria-label="Preview viewport">
            <TabsTrigger value="desktop"><Monitor aria-hidden="true" />Desktop</TabsTrigger>
            <TabsTrigger value="mobile"><Smartphone aria-hidden="true" />Mobile</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      <div className="overflow-x-auto bg-muted/30 p-3 sm:p-5">
        <div className={cn("mx-auto transition-[max-width] motion-reduce:transition-none", viewport === "mobile" ? "max-w-[390px]" : "max-w-full")}>
          {children ? <div inert className="pointer-events-none select-none" aria-label="Non-interactive marketplace preview">{children}</div> : empty}
        </div>
      </div>
    </section>
  );
}

export function MarketingPreviewEmpty({ title, description, illustration }: { title: string; description: string; illustration?: React.ReactNode }) {
  return <div className="flex min-h-64 flex-col items-center justify-center rounded-lg border border-dashed border-border/70 bg-background px-6 py-10 text-center">{illustration}<h3 className="mt-3 text-base font-semibold text-foreground">{title}</h3><p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">{description}</p></div>;
}
