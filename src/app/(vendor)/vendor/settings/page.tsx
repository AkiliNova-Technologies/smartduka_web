"use client";

import React, { useState } from "react";
import {
  Store, Shield, Globe, ImageIcon,
} from "lucide-react";
import { useVendor } from "@/hooks/use-vendor";
import { StoreBrandingTab } from "@/components/vendor/settings/store-branding-tab";
import { StoreInfoTab } from "@/components/vendor/settings/store-info-tab";
import { DocumentsTab } from "@/components/vendor/settings/documents-tab";
import { PreviewTab } from "@/components/vendor/settings/preview-tab";
import type { VendorProfile, Document } from "@prisma/client";
import { Skeleton } from "@/components/ui/skeleton";

type TabID = "branding" | "information" | "documents" | "preview";

type FullVendorProfile = VendorProfile & {
  documents: Document[];
  _count: { products: number; subOrders: number };
};

const TABS = [
  { id: "branding" as const, label: "Store Branding", icon: ImageIcon },
  { id: "information" as const, label: "Store Information", icon: Store },
  { id: "documents" as const, label: "Verification Docs", icon: Shield },
  { id: "preview" as const, label: "Live Preview", icon: Globe },
];

export default function VendorSettingsPage() {
  const { fullProfile, fullProfileLoading } = useVendor();
  const [activeTab, setActiveTab] = useState<TabID>("branding");

  // Loading skeleton — only shows on first load, not on subsequent navigations
  if (fullProfileLoading || !fullProfile) {
    return (
      <div className="max-w-8xl w-full mx-auto px-4 py-10 space-y-10">
        <div className="border-b border-border/60 pb-6">
          <div className="flex items-center gap-2.5">
            <Skeleton className="w-9 h-9 rounded-full" />
            <div className="space-y-1.5">
              <Skeleton className="h-5 w-36" />
              <Skeleton className="h-3 w-64" />
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="space-y-2">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-10 w-full rounded-full" />
            ))}
          </div>
          <div className="md:col-span-2">
            <Skeleton className="h-64 w-full rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  const profile = fullProfile as FullVendorProfile;

  return (
    <div className="max-w-8xl w-full mx-auto px-4 py-10 space-y-10 text-foreground antialiased selection:bg-emerald-500/10 selection:text-emerald-700">
      {/* Header Section */}
      <div className="border-b border-border/60 pb-6">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-muted rounded-full border border-border/40">
            <Store className="w-5 h-5 text-zinc-800 dark:text-zinc-200" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
              Store Settings
            </h1>
            <p className="text-xs font-semibold text-zinc-400 dark:text-zinc-500 mt-0.5">
              Manage your store branding, profile information, and verification documents.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Left Navigation */}
        <div className="space-y-1 md:col-span-1">
          <p className="text-[10px] font-bold tracking-wider text-zinc-400 dark:text-zinc-500 uppercase px-3 mb-2">
            Configurations
          </p>

          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-xs font-bold rounded-full transition-all text-left cursor-pointer ${
                activeTab === tab.id
                  ? "bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-950 shadow-xs"
                  : "text-zinc-500 hover:bg-muted hover:text-zinc-900 dark:hover:text-zinc-200"
              }`}
            >
              <tab.icon className="w-4 h-4" /> {tab.label}
            </button>
          ))}
        </div>

        {/* Right Content */}
        <div className="md:col-span-2">
          {activeTab === "branding" && (
            <StoreBrandingTab profile={profile} />
          )}
          {activeTab === "information" && (
            <StoreInfoTab profile={profile} />
          )}
          {activeTab === "documents" && (
            <DocumentsTab vendorId={profile.id} initialDocuments={profile.documents} />
          )}
          {activeTab === "preview" && (
            <PreviewTab profile={profile} />
          )}
        </div>
      </div>
    </div>
  );
}