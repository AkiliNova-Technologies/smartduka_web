import type { ReactNode } from "react";
import { DetailPageHeader } from "@/components/detail-page-header";

export function DashboardPageHeader({
  title,
  description,
  backHref,
  trailing,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  backHref?: string;
  trailing?: ReactNode;
  className?: string;
}) {
  return (
    <DetailPageHeader
      title={title}
      description={description}
      backHref={backHref}
      className={className}>
      {trailing}
    </DetailPageHeader>
  );
}
