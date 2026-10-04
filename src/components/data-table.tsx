"use client";

import dynamic from "next/dynamic";
import type { ReactElement } from "react";
import type { DataTableProps } from "@/components/data-table-runtime";

const DataTableRuntime = dynamic(
  () => import("@/components/data-table-runtime").then((module) => module.DataTableRuntime),
  {
    ssr: false,
    loading: () => <DataTableShell />,
  },
) as unknown as <TData, TValue>(props: DataTableProps<TData, TValue>) => ReactElement;

/**
 * Keeps TanStack Table out of Cache Components prerendering. TanStack 8.21.3
 * performs development timing reads inside its row-model memo path even when
 * its public debug options are false.
 */
export function DataTable<TData, TValue>(props: DataTableProps<TData, TValue>) {
  return <DataTableRuntime {...props} />;
}

function DataTableShell() {
  return (
    <div aria-busy="true" aria-label="Loading table" className="min-h-44 w-full rounded-[24px] border border-border/60 bg-card p-5">
      <div className="h-5 w-36 rounded bg-muted" />
      <div className="mt-5 h-28 rounded-xl border border-border/60 bg-muted/30" />
    </div>
  );
}

export type { DataTableFeatures, DataTableProps } from "@/components/data-table-runtime";
