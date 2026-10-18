"use client";
import * as React from "react";
import Link from "next/link";
import { CircleAlert, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  PublicAnnouncementClient,
  type BannerAnnouncement,
} from "@/lib/public-announcement-client";

export function MaintenanceBanner() {
  const [banner, setBanner] = React.useState<BannerAnnouncement | null>(null);
  React.useEffect(() => {
    const controller = new AbortController();
    PublicAnnouncementClient.banners(controller.signal)
      .then((items) => setBanner(items[0] ?? null))
      .catch(() => undefined);
    return () => controller.abort();
  }, []);
  if (!banner) return null;
  const dismiss = async () => {
    const current = banner;
    setBanner(null);
    try {
      await PublicAnnouncementClient.dismiss(current.id);
    } catch {
      setBanner(current);
    }
  };
  return (
    <aside
      className="border-b border-amber-500/20 bg-amber-50 text-amber-950 dark:bg-amber-950/40 dark:text-amber-100"
      aria-label="Important platform announcement">
      <div className="mx-auto flex max-w-7xl items-start gap-3 px-4 py-3 sm:px-6 lg:px-8">
        <CircleAlert className="mt-0.5 size-4 shrink-0" />
        <div className="min-w-0 flex-1 text-sm">
          <p className="font-semibold">{banner.title}</p>
          <p className="mt-0.5 text-xs opacity-80">{banner.message}</p>
          {banner.destination && (
            <Link
              className="mt-1 inline-block text-xs font-semibold underline underline-offset-2"
              href={banner.destination}>
              Learn more
            </Link>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Dismiss announcement"
          onClick={() => void dismiss()}>
          <X />
        </Button>
      </div>
    </aside>
  );
}
