import { Suspense } from "react";
import SettingsContent from "./settings-content";

export default function SettingsPage() {
  return (
    <Suspense fallback={<SettingsSkeleton />}>
      <SettingsContent />
    </Suspense>
  );
}

function SettingsSkeleton() {
  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8 pb-24 sm:px-6 sm:py-10">
      <div className="h-8 w-32 animate-pulse rounded bg-muted" />
      <div className="mt-3 h-5 w-80 max-w-full animate-pulse rounded bg-muted" />
      <div className="mt-8 grid gap-8 md:grid-cols-3">
        <div className="space-y-2"><div className="h-10 animate-pulse rounded-full bg-muted" /><div className="h-10 animate-pulse rounded-full bg-muted" /><div className="h-10 animate-pulse rounded-full bg-muted" /></div>
        <div className="space-y-4 md:col-span-2"><div className="h-14 w-64 animate-pulse rounded bg-muted" /><div className="h-72 animate-pulse rounded-xl border bg-card" /></div>
      </div>
    </main>
  );
}
