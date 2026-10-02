"use client";

import * as React from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldError } from "@/components/ui/field-error";

export type ProductSpecification = { id?: string; name: string; value: string };
const rowId = () => crypto.randomUUID();
/** Kept for callers/tests; category names no longer create guessed fields. */
export const definitionsForCategory = () => [] as Array<{ name: string }>;

export function ProductSpecificationsEditor({
  value,
  onChange,
}: {
  categoryNames?: string[];
  value: ProductSpecification[];
  onChange: (value: ProductSpecification[]) => void;
}) {
  const [touched, setTouched] = React.useState<Set<string>>(new Set());
  const rows = React.useMemo(
    () =>
      value.map((specification, index) => ({
        ...specification,
        id: specification.id ?? `saved-${index}`,
      })),
    [value],
  );
  const errors = React.useMemo(() => {
    const names = new Map<string, number>();
    rows.forEach((row) => {
      const name = row.name.trim().toLowerCase();
      if (name) names.set(name, (names.get(name) ?? 0) + 1);
    });
    return new Map(
      rows.map((row) => {
        const name = row.name.trim(),
          itemValue = row.value.trim();
        const error =
          name && !itemValue
            ? "Enter a value for this specification."
            : itemValue && !name
              ? "Enter a specification name."
              : name && (names.get(name.toLowerCase()) ?? 0) > 1
                ? "Specification names must be unique."
                : undefined;
        return [row.id, error];
      }),
    );
  }, [rows]);
  const update = (id: string, field: "name" | "value", next: string) =>
    onChange(
      rows.map((row) => (row.id === id ? { ...row, [field]: next } : row)),
    );

  return (
    <section className="space-y-5">
      <div>
        <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Specifications
        </Label>
        <p className="mt-1 text-xs text-muted-foreground">
          Add only details that are useful for this product.
        </p>
      </div>
      {rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/70 bg-muted/20 p-5 text-center text-sm text-muted-foreground">
          No specifications added yet.
        </div>
      ) : (
        <div className="space-y-3">
          <div className="hidden grid-cols-[minmax(0,1fr)_minmax(0,2fr)_auto] gap-2 px-1 text-xs font-medium uppercase tracking-wider text-muted-foreground sm:grid">
            <span>Specification</span>
            <span>Value</span>
            <span className="sr-only">Remove</span>
          </div>
          {rows.map((row) => {
            const error = errors.get(row.id),
              showError = touched.has(row.id) && error;
            return (
              <div
                key={row.id}
                className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)_auto]">
                <Input
                  value={row.name}
                  onChange={(event) =>
                    update(row.id, "name", event.target.value)
                  }
                  onBlur={() =>
                    setTouched((current) => new Set(current).add(row.id))
                  }
                  aria-invalid={Boolean(showError)}
                  aria-describedby={showError ? `${row.id}-error` : undefined}
                  placeholder="Specification"
                  className="h-10 rounded-full border-border/60 text-xs"
                />
                <div>
                  <Input
                    value={row.value}
                    onChange={(event) =>
                      update(row.id, "value", event.target.value)
                    }
                    onBlur={() =>
                      setTouched((current) => new Set(current).add(row.id))
                    }
                    aria-invalid={Boolean(showError)}
                    aria-describedby={showError ? `${row.id}-error` : undefined}
                    placeholder="Value"
                    className="h-10 rounded-full border-border/60 text-xs"
                  />
                  <FieldError id={`${row.id}-error`}>{showError}</FieldError>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={`Remove ${row.name || "specification"}`}
                  onClick={() =>
                    onChange(rows.filter((item) => item.id !== row.id))
                  }>
                  <Trash2 className="size-4" />
                </Button>
              </div>
            );
          })}
        </div>
      )}
      <Button
        type="button"
        variant="outline"
        className="h-10 rounded-full border-border/60 text-xs"
        onClick={() =>
          onChange([...rows, { id: rowId(), name: "", value: "" }])
        }>
        <Plus className="size-3.5" /> Add Specification
      </Button>
    </section>
  );
}
