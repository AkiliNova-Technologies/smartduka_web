import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { partitionRowActions, type DataTableRowAction } from "@/components/data-table-row-actions";
import { formatStatusLabel, getStatusPresentation } from "@/components/marketplace/status-badge";

const source = (file: string) => readFileSync(resolve(process.cwd(), file), "utf8");
const TestIcon = () => null;
const actions = (count: number): DataTableRowAction[] => Array.from({ length: count }, (_, index) => ({ id: String(index), label: `Action ${index}`, icon: TestIcon }));

describe("dashboard table status badges", () => {
  it("maps known business statuses explicitly to semantic styles", () => {
    expect(getStatusPresentation("ACTIVE").tone).toBe("success");
    expect(getStatusPresentation("PENDING").tone).toBe("warning");
    expect(getStatusPresentation("FAILED").tone).toBe("danger");
    expect(getStatusPresentation("NEEDS_REVIEW").tone).toBe("info");
    expect(getStatusPresentation("SUSPENDED").label).toBe("Suspended");
  });

  it("uses a readable neutral fallback without guessing semantics", () => {
    expect(getStatusPresentation("provider_deferred")).toMatchObject({ tone: "neutral", label: "Provider Deferred" });
    expect(formatStatusLabel(undefined)).toBe("Unknown");
  });

  it("retains the Vendors & Shops badge geometry and dark theme styles", () => {
    const badge = source("src/components/marketplace/status-badge.tsx");
    expect(badge).toContain("rounded-full border px-2.5 py-1 text-xs font-medium leading-none");
    expect(badge).toContain("dark:bg-zinc-800");
    expect(badge).toContain("STATUS_PRESENTATION");
  });
});

describe("dashboard row actions", () => {
  it.each([1, 2, 3])("renders %i actions directly when no overflow is needed", (count) => {
    expect(partitionRowActions(actions(count))).toEqual({ direct: actions(count), overflow: [] });
  });

  it("keeps at most three top-level controls and moves the rest to Options", () => {
    const result = partitionRowActions(actions(5));
    expect(result.direct).toHaveLength(2);
    expect(result.overflow).toHaveLength(3);
    expect(result.direct.length + Number(result.overflow.length > 0)).toBeLessThanOrEqual(3);
  });

  it("omits unauthorized actions and supports disabled, loading, destructive and row-click isolation", () => {
    const result = partitionRowActions([{ id: "hidden", label: "Hidden", icon: TestIcon, hidden: true }, { id: "unauthorized", label: "Unauthorized", icon: TestIcon, authorized: false }, { id: "view", label: "View", icon: TestIcon }]);
    expect(result.direct.map((action) => action.id)).toEqual(["view"]);
    const component = source("src/components/data-table-row-actions.tsx");
    expect(component).toContain("action.disabled || action.loading");
    expect(component).toContain('action.destructive ? "destructive"');
    expect(component).toContain("event.stopPropagation()");
  });

  it("renders compact icon-only controls with accessible names and focusable tooltips", () => {
    const component = source("src/components/data-table-row-actions.tsx");
    expect(component).toContain('size="icon"');
    expect(component).toContain("size-8 shrink-0 rounded-full");
    expect(component).toContain("aria-label={action.label}");
    expect(component).toContain("<TooltipTrigger asChild>");
    expect(component).toContain("<TooltipContent");
    expect(component).not.toContain('hidden sm:inline">{action.label}');
    expect(component).not.toContain('hidden sm:inline">{optionsLabel}');
  });

  it("keeps labels and destructive styling inside the overflow menu", () => {
    const component = source("src/components/data-table-row-actions.tsx");
    expect(component).toContain("{action.label}");
    expect(component).toContain('variant={action.destructive ? "destructive" : "default"}');
    expect(component).toContain('optionsLabel = "More options"');
  });
});

describe("dashboard status filters", () => {
  it("uses the accessible shared shadcn Select with visible selected values", () => {
    const filter = source("src/components/data-table-status-filter.tsx");
    expect(filter).toContain("SelectValue");
    expect(filter).toContain('aria-label={`${label} filter`}');
    expect(filter).toContain("w-full items-center gap-2 sm:w-auto");
  });

  it("preserves URL search state and resets server pagination", () => {
    const orders = source("src/app/(vendor)/vendor/orders/vendor-orders-client.tsx");
    const transactions = source("src/app/(vendor)/vendor/transactions/vendor-transactions-client.tsx");
    expect(orders).toContain('page: "1"');
    expect(orders).toContain("DataTableStatusFilter");
    expect(transactions).toContain('filter: filter === "ALL" ? null : filter');
    expect(transactions).toContain('page: "1"');
  });

  it("combines local search and status changes with pagination resets", () => {
    const marketing = source("src/app/(vendor)/vendor/marketing/page.tsx");
    const payments = source("src/app/(admin)/admin/payments/page.tsx");
    expect(marketing).toContain("DataTableStatusFilter");
    expect(marketing).toContain("setPage(1)");
    expect(payments).toContain("DataTableStatusFilter");
    expect(payments).toContain("setSubmittedSearch(value)");
    expect(payments).toContain("setPage(1)");
  });
});
