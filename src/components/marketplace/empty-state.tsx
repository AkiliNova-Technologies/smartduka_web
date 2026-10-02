import { SearchX } from "lucide-react";
export function EmptyState({
  title,
  description,
  actions,
  icon: Icon = SearchX,
}: {
  title: string;
  description: string;
  actions?: React.ReactNode;
  icon?: typeof SearchX;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card px-6 py-12 text-center sm:px-10">
      <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
        <Icon className="size-6" aria-hidden="true" />
      </div>
      <h2 className="mt-5 text-lg font-semibold tracking-tight text-foreground">
        {title}
      </h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
        {description}
      </p>
      {actions && (
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          {actions}
        </div>
      )}
    </div>
  );
}
export { IllustratedEmptyState } from "./illustrated-empty-state";
