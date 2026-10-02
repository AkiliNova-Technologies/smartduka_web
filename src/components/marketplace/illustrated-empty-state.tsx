import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";

type NavigationEmptyStateAction = { label: string; href: string; onClick?: never };
type CallbackEmptyStateAction = { label: string; onClick: () => void; href?: never };
type EmptyStateAction = NavigationEmptyStateAction | CallbackEmptyStateAction;

function isNavigationAction(action: EmptyStateAction): action is NavigationEmptyStateAction {
  return typeof action.href === "string";
}
type IllustratedEmptyStateProps = {
  illustration: string;
  title: string;
  description: string;
  action?: EmptyStateAction;
  secondaryAction?: NavigationEmptyStateAction;
  size?: "compact" | "standard" | "prominent";
};

export function IllustratedEmptyState({
  illustration,
  title,
  description,
  action,
  secondaryAction,
  size = "standard",
}: IllustratedEmptyStateProps) {
  const imageSize =
    size === "compact"
      ? "w-32 sm:w-36"
      : size === "prominent"
        ? "w-60 sm:w-72"
        : "w-44 sm:w-52";
  const minHeight =
    size === "compact"
      ? "min-h-60 py-7"
      : size === "prominent"
        ? "min-h-[420px] py-12"
        : "min-h-[340px] py-10";

  return (
    <section
      className={`flex ${minHeight} flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card px-6 py-6 text-center`}>
      <Image
        src={illustration}
        alt=""
        width={280}
        height={220}
        loading="eager"
        className={`h-auto ${imageSize}`}
      />
      <h2 className="mt-5 text-xl font-semibold tracking-tight text-foreground">
        {title}
      </h2>
      <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
        {description}
      </p>
      {action ? (
        isNavigationAction(action) ? (
          <Link href={action.href} className="mt-6 inline-flex h-11 items-center rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 dark:text-white">{action.label}</Link>
        ) : (
          <Button onClick={action.onClick} className="mt-6 h-11 rounded-full px-5 dark:text-white">{action.label}</Button>
        )
      ) : null}
      {secondaryAction ? (
        <Link
          href={secondaryAction.href}
          className="mt-3 text-sm font-medium text-primary hover:underline ">
          {secondaryAction.label}
        </Link>
      ) : null}
    </section>
  );
}
