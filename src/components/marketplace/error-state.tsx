import { AlertCircle } from "lucide-react";
export function ErrorState({
  title = "We couldn't load products",
  description = "Please try again. If the problem continues, return to the marketplace and try later.",
  actions,
}: {
  title?: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div
      role="alert"
      className="rounded-2xl border border-rose-200 bg-rose-50/60 px-6 py-10 text-center dark:border-rose-900 dark:bg-rose-950/20">
      <AlertCircle
        className="mx-auto size-6 text-rose-600"
        aria-hidden="true"
      />
      <h2 className="mt-4 text-lg font-semibold text-foreground">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
        {description}
      </p>
      {actions && (
        <div className="mt-5 flex justify-center gap-3">{actions}</div>
      )}
    </div>
  );
}
