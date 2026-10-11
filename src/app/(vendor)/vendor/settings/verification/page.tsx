"use client";

import { CheckCircle2, Circle, Clock3, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { DashboardPageHeader } from "@/components/dashboard-page-header";
import { ShopVerificationBadge } from "@/components/marketplace/shop-verification-badge";
import {
  ShopVerificationStatusBadge,
  verificationLabel,
} from "@/components/marketplace/shop-verification-status-badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { DocumentsTab } from "@/components/vendor/settings/documents-tab";
import { useShopVerification } from "@/hooks/use-shop-verification";

const requirements: Record<string, string> = {
  ACTIVE_SHOP: "Active shop",
  SHOP_NAME: "Shop profile",
  BUSINESS_CONTACT: "Business contact information",
  SHOP_DESCRIPTION: "Shop description",
  BUSINESS_ADDRESS: "Business address",
  KYC_APPROVAL: "KYC approval",
  BUSINESS_REGISTRATION: "Business registration document",
  IDENTITY_DOCUMENT: "National ID or passport",
};
const activityLabels: Record<string, string> = {
  APPLICATION_SUBMITTED: "Application submitted",
  REVIEW_STARTED: "Review started",
  INFORMATION_REQUESTED: "More information requested",
  INFORMATION_PROVIDED: "Information submitted",
  APPROVED: "Verification approved",
  REJECTED: "Verification rejected",
  SUSPENDED: "Verification suspended",
  REINSTATED: "Verification restored",
  REVOKED: "Verification revoked",
};

function Loading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      <Skeleton className="h-36 rounded-2xl" />
      <Skeleton className="h-52 rounded-2xl" />
    </div>
  );
}

export default function VendorVerificationPage() {
  const [vendorResponse, setVendorResponse] = useState("");
  const { data, error, saving, reload, submit } = useShopVerification();

  if (!data) return <Loading />;
  const app = data.application;
  const currentStatus = app?.status || "NOT_APPLIED";
  const missing = new Set(
    data.eligibility.missing.filter((item) => item !== "ACTIVE_APPLICATION"),
  );
  const stateCopy =
    currentStatus === "VERIFIED"
      ? {
          title: "Verified Shop",
          description:
            "Your verified status is active. No new application is needed.",
        }
      : currentStatus === "PENDING" || currentStatus === "UNDER_REVIEW"
        ? {
            title: "Verification under review",
            description:
              "Your application is with our review team. You cannot submit another active application.",
          }
        : currentStatus === "REJECTED"
          ? {
              title: "Verification needs attention",
              description:
                "Review the decision and correct the highlighted shop details or documents before resubmitting.",
            }
          : currentStatus === "NEEDS_INFORMATION"
            ? {
                title: "Continue verification",
                description:
                  "The review team needs more information before it can make a decision.",
              }
            : data.eligibility.eligible
              ? {
                  title: "Apply for verification",
                  description:
                    "Verification helps customers trust your shop. We will review your business profile, address, registration, and identity documents.",
                }
              : {
                  title: "Continue verification",
                  description:
                    "Complete your shop profile and required documents, then submit your application.",
                };

  return (
    <main className="w-full max-w-7xl space-y-6">
      <DashboardPageHeader
        title="Shop Verification"
        description="Build customer confidence by having SmartDuka review your shop information."
        backHref="/vendor/settings"
        trailing={<ShopVerificationStatusBadge status={currentStatus} />}
      />
      {error && (
        <div
          role="alert"
          className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          {error}
          <Button
            variant="outline"
            size="sm"
            className="ml-3"
            onClick={() => void reload()}>
            Try again
          </Button>
        </div>
      )}
      <section className="rounded-2xl border border-border/60 bg-card p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex gap-3">
            <div className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
              <ShieldCheck className="size-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold">{stateCopy.title}</h2>
              <p className="mt-1 max-w-xl text-xs text-muted-foreground">
                {stateCopy.description}
              </p>
              <div className="mt-2">
                <ShopVerificationStatusBadge status={currentStatus} />
              </div>
              {app?.submittedAt && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Submitted{" "}
                  {new Date(app.submittedAt).toLocaleDateString("en-UG", {
                    dateStyle: "medium",
                  })}
                </p>
              )}
              {app?.verifiedAt && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Verified{" "}
                  {new Date(app.verifiedAt).toLocaleDateString("en-UG", {
                    dateStyle: "medium",
                  })}
                </p>
              )}
            </div>
          </div>
          {(!app || currentStatus === "REJECTED") &&
            data.eligibility.eligible && (
              <Button disabled={saving} onClick={() => void submit()}>
                {currentStatus === "REJECTED"
                  ? "Resubmit for verification"
                  : "Apply for verification"}
              </Button>
            )}
          {currentStatus === "VERIFIED" && <ShopVerificationBadge />}
        </div>
        {app?.rejectionReason && (
          <div className="mt-4 rounded-xl border border-destructive/20 bg-destructive/5 p-3">
            <p className="text-xs font-medium text-destructive">
              Reason for rejection
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {app.rejectionReason}
            </p>
          </div>
        )}
        {app?.informationRequest && (
          <p className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 text-sm text-amber-800 dark:text-amber-200">
            {app.informationRequest}
          </p>
        )}
      </section>
      <section className="rounded-2xl border border-border/60 bg-card p-5">
        <div>
          <h2 className="text-sm font-medium">Verification requirements</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Complete the items below before submitting your application.
          </p>
        </div>
        <div className="mt-4 divide-y">
          {Object.entries(requirements).map(([key, requirement]) => {
            const complete = !missing.has(key);
            return (
              <div
                key={key}
                className="flex items-center justify-between gap-4 py-3 text-sm">
                <span className="flex items-center gap-2">
                  <span
                    className={
                      complete ? "text-emerald-600" : "text-muted-foreground"
                    }>
                    {complete ? (
                      <CheckCircle2 className="size-4" />
                    ) : (
                      <Circle className="size-4" />
                    )}
                  </span>
                  {requirement}
                </span>
                <span className="text-xs text-muted-foreground">
                  {complete ? "Complete" : "Required"}
                </span>
              </div>
            );
          })}
        </div>
        {(!app || currentStatus === "REJECTED") &&
          !data.eligibility.eligible && (
            <p className="mt-3 text-xs text-muted-foreground">
              Update your shop settings or verification documents, then return
              here to apply.
            </p>
          )}
      </section>
      <DocumentsTab
        vendorId={data.eligibility.vendorId}
        initialDocuments={data.documents}
        onDocumentsChanged={() => void reload()}
      />
      {app?.status === "NEEDS_INFORMATION" && (
        <section className="rounded-2xl border border-border/60 bg-card p-5">
          <div>
            <h2 className="text-sm font-medium">
              Provide requested information
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Your response will be sent to the review team. Internal review
              notes are not shared.
            </p>
          </div>
          <Textarea
            value={vendorResponse}
            onChange={(event) => setVendorResponse(event.target.value)}
            className="mt-4 min-h-28"
            placeholder="Describe the updated information for the review team."
          />
          <div className="mt-3 flex justify-end">
            <Button
              disabled={saving || vendorResponse.trim().length < 10}
              onClick={() =>
                void submit({
                  action: "provide-information",
                  response: vendorResponse,
                })
              }>
              Send information
            </Button>
          </div>
        </section>
      )}
      {app && (
        <section className="rounded-2xl border border-border/60 bg-card p-5">
          <div className="flex items-center gap-2">
            <Clock3 className="size-4 text-muted-foreground" />
            <h2 className="text-sm font-medium">Verification history</h2>
          </div>
          <ol className="mt-4 space-y-4 border-l border-border pl-4">
            {app.activities.map((activity) => (
              <li
                key={activity.id}
                className="relative text-sm before:absolute before:-left-[21px] before:top-1.5 before:size-2 before:rounded-full before:bg-primary">
                <p className="font-medium">
                  {activityLabels[activity.type] ||
                    verificationLabel(activity.toValue)}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {new Date(activity.createdAt).toLocaleString("en-UG", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </p>
              </li>
            ))}
          </ol>
        </section>
      )}
    </main>
  );
}
