"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  CheckCircle2,
  Download,
  Eye,
  FileText,
  Loader2,
  ShieldCheck,
  TriangleAlert,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { DashboardPageHeader } from "@/components/dashboard-page-header";
import {
  ShopVerificationStatusBadge,
  verificationLabel,
} from "@/components/marketplace/shop-verification-status-badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  adminShopVerificationClient,
  type AdminOption,
  type VerificationApplication,
} from "@/lib/admin-shop-verification-client";
import { VerificationDetailSkeleton } from "./loading";

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
  INTERNAL_NOTE_ADDED: "Internal note added",
  ASSIGNED: "Reviewer assigned",
  REASSIGNED: "Reviewer reassigned",
};
const requirementLabels: Record<string, string> = {
  ACTIVE_SHOP: "Shop must be active",
  SHOP_NAME: "Shop name is required",
  BUSINESS_CONTACT: "Business email and phone are required",
  SHOP_DESCRIPTION: "Shop description is required",
  BUSINESS_ADDRESS: "Business address is required",
  KYC_APPROVAL: "Vendor onboarding must be approved",
  BUSINESS_REGISTRATION: "Business registration document is required",
  IDENTITY_DOCUMENT: "Identity document is required",
  SHOP_NOT_FOUND: "Shop record is unavailable",
};
const date = (value?: string | null) =>
  value
    ? new Date(value).toLocaleString("en-UG", {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "Not recorded";
const humanize = (value?: string | null) =>
  value
    ? value
        .replaceAll("_", " ")
        .toLowerCase()
        .replace(/^./, (letter) => letter.toUpperCase())
    : "Not recorded";

type ConfirmedAction =
  | "VERIFIED"
  | "REJECTED"
  | "NEEDS_INFORMATION"
  | "SUSPENDED"
  | "REVOKED";

function DecisionDialog({
  action,
  app,
  saving,
  onClose,
  onConfirm,
}: {
  action: ConfirmedAction | null;
  app: VerificationApplication;
  saving: boolean;
  onClose: () => void;
  onConfirm: (reason?: string) => Promise<void>;
}) {
  const [reason, setReason] = useState("");
  const rejecting = action === "REJECTED";
  const needsReason = action !== "VERIFIED";
  const title =
    action === "VERIFIED"
      ? "Approve verification for this shop?"
      : action === "REJECTED"
        ? "Reject verification application?"
        : `${verificationLabel(action)}?`;
  const description =
    action === "VERIFIED"
      ? "This confirms that the submitted verification information has been reviewed and accepted."
      : action === "REJECTED"
        ? "Provide a clear explanation so the vendor understands what needs to be corrected."
        : "Provide a clear reason. The decision will be recorded in the verification audit history.";
  return (
    <Dialog
      open={!!action}
      onOpenChange={(open) => !open && !saving && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="rounded-lg bg-muted/50 p-3 text-sm">
          <p className="font-medium">{app.vendor.storeName}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Application {app.publicId}
          </p>
        </div>
        {needsReason && (
          <div className="space-y-2">
            <label htmlFor="decision-reason" className="text-sm font-medium">
              Reason
            </label>
            <Textarea
              id="decision-reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Explain this action"
              className="min-h-28"
              aria-describedby="decision-help"
            />
            <p id="decision-help" className="text-xs text-muted-foreground">
              At least 3 characters are required.
            </p>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            variant={
              rejecting || action === "REVOKED" ? "destructive" : "default"
            }
            disabled={saving || (needsReason && reason.trim().length < 3)}
            onClick={() => void onConfirm(needsReason ? reason : undefined)}>
            {saving && <Loader2 className="animate-spin" />}
            {action === "VERIFIED"
              ? "Approve verification"
              : action === "REJECTED"
                ? "Reject verification"
                : `Confirm ${verificationLabel(action).toLowerCase()}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function AdminVerificationDetailClient({
  reportId,
}: {
  reportId: string;
}) {
  const [app, setApp] = useState<VerificationApplication>();
  const [admins, setAdmins] = useState<AdminOption[]>([]);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [decision, setDecision] = useState<ConfirmedAction | null>(null);
  const load = useCallback(
    async (signal?: AbortSignal) => {
      try {
        const value = await adminShopVerificationClient.detail(
          reportId,
          signal,
        );
        setApp(value.application);
        setError("");
      } catch (caught) {
        if (!signal?.aborted)
          setError(
            caught instanceof Error
              ? caught.message
              : "Unable to load verification case.",
          );
      }
    },
    [reportId],
  );
  useEffect(() => {
    const controller = new AbortController();
    const task = window.setTimeout(
      () =>
        void Promise.all([
          load(controller.signal),
          adminShopVerificationClient
            .admins(controller.signal)
            .then((value) => setAdmins(value.admins))
            .catch(() => undefined),
        ]),
      0,
    );
    return () => {
      window.clearTimeout(task);
      controller.abort();
    };
  }, [load]);
  const update = async (body: object, successMessage: string) => {
    setSaving(true);
    setError("");
    try {
      await adminShopVerificationClient.update(reportId, body);
      await load();
      toast.success(successMessage);
      setNote("");
      return true;
    } catch (caught) {
      const message =
        caught instanceof Error ? caught.message : "Update failed.";
      setError(message);
      toast.error(message);
      return false;
    } finally {
      setSaving(false);
    }
  };
  if (!app && !error) return <VerificationDetailSkeleton />;
  if (!app)
    return (
      <div
        role="alert"
        className="rounded-xl border border-destructive/30 bg-destructive/5 p-5 text-sm">
        <p className="font-medium text-destructive">
          Unable to load verification details
        </p>
        <p className="mt-1 text-muted-foreground">{error}</p>
        <Button
          variant="outline"
          size="sm"
          className="mt-4"
          onClick={() => void load()}>
          Try again
        </Button>
      </div>
    );
  const snapshot = app.snapshot;
  const canDecide = app.status === "UNDER_REVIEW";
  const finalDecision = ["VERIFIED", "REJECTED", "REVOKED"].includes(
    app.status,
  );

  return (
    <main className="w-full space-y-6">
      <DashboardPageHeader
        title="Verification review"
        description={
          <>
            {app.publicId} · {app.vendor.storeName} · submitted{" "}
            {date(app.submittedAt)}
          </>
        }
        backHref="/admin/verifications"
        trailing={
          <>
            {app.vendorApplicationId && (
              <Button asChild variant="default" size="lg" className="rounded-full px-4">
                <Link
                  href={`/admin/vendors?applicationId=${app.vendorApplicationId}`}>
                  Open Vendor details
                </Link>
              </Button>
            )}
          </>
        }
      />
      {error && (
        <div
          role="alert"
          className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          {error}
        </div>
      )}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Application overview</CardTitle>
            <CardDescription>
              Information captured when the shop submitted this application.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <dl className="grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-xs text-muted-foreground">Shop name</dt>
                <dd className="mt-1 font-medium">
                  {snapshot.shopName || app.vendor.storeName}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Legal name</dt>
                <dd className="mt-1">{snapshot.legalName || "Not recorded"}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">
                  Business contact
                </dt>
                <dd className="mt-1 break-words">
                  {snapshot.contact?.email || "No email"}
                  <br />
                  {snapshot.contact?.phone || "No phone"}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Address</dt>
                <dd className="mt-1">{snapshot.address || "Not recorded"}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">
                  Onboarding status
                </dt>
                <dd className="mt-1">
                  {verificationLabel(snapshot.kycStatus)}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">
                  Assigned reviewer
                </dt>
                <dd className="mt-1">
                  {app.assignedAdmin?.name || "Unassigned"}
                </dd>
              </div>
            </dl>
            <Separator />
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg bg-muted/50 p-3">
                <p className="font-medium">Marketplace reports</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {app.context.openReports} open · {app.context.severeReports}{" "}
                  high or critical
                </p>
              </div>
              <div className="rounded-lg bg-muted/50 p-3">
                <p className="font-medium">Risk flags</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {app.context.openRiskFlags} open flags
                </p>
              </div>
            </div>
            
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="size-4" />
              Verification decision
            </CardTitle>
            <CardDescription>
              Eligibility and available case actions.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm text-muted-foreground">
                Current status
              </span>
              <ShopVerificationStatusBadge status={app.status} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Assign reviewer</label>
              <Select
                value={app.assignedAdminId || undefined}
                disabled={saving}
                onValueChange={(value) =>
                  void update({ assignedAdminId: value }, "Reviewer assigned.")
                }>
                <SelectTrigger className="w-full rounded-full mt-2">
                  <SelectValue placeholder="Choose a reviewer" />
                </SelectTrigger>
                <SelectContent className="p-2">
                  {admins.map((admin) => (
                    <SelectItem key={admin.id} value={admin.id}>
                      {admin.name} · {admin.platformRole}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="rounded-lg bg-muted/50 p-3">
              <div className="flex items-center gap-2">
                {app.eligibility.eligible ? (
                  <CheckCircle2 className="size-4 text-emerald-600" />
                ) : (
                  <TriangleAlert className="size-4 text-amber-600" />
                )}
                <p className="font-medium">
                  {app.eligibility.eligible
                    ? "Eligible for approval"
                    : "Requirements outstanding"}
                </p>
              </div>
              {app.eligibility.missing.length > 0 && (
                <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-muted-foreground">
                  {app.eligibility.missing.map((item) => (
                    <li key={item}>
                      {requirementLabels[item] || humanize(item)}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            {app.status === "PENDING" && (
              <>
                <p className="text-xs text-muted-foreground">
                  Start the review before making a decision. This records that
                  an administrator has begun assessing the application.
                </p>
                <Button
                  className="w-full rounded-full"
                  disabled={saving}
                  onClick={() =>
                    void update(
                      { status: "UNDER_REVIEW" },
                      "Verification review started.",
                    )
                  }>
                  {saving && <Loader2 className="animate-spin" />}Start review
                </Button>
              </>
            )}
            {canDecide && (
              <div className="grid gap-2">
                <Button
                  disabled={saving || !app.eligibility.eligible}
                  onClick={() => setDecision("VERIFIED")}
                  className="rounded-full">
                  <CheckCircle2 />
                  Approve verification
                </Button>
                <Button
                  variant="outline"
                  disabled={saving}
                  onClick={() => setDecision("REJECTED")}
                  className="rounded-full">
                  <XCircle />
                  Reject verification
                </Button>
                {!app.eligibility.eligible && (
                  <p className="text-xs text-muted-foreground">
                    Approval becomes available after all requirements are
                    satisfied.
                  </p>
                )}
              </div>
            )}
            {canDecide && (
              <Button
                variant="ghost"
                className="w-full rounded-full"
                disabled={saving}
                onClick={() => setDecision("NEEDS_INFORMATION")}>
                Request more information
              </Button>
            )}
            {app.status === "NEEDS_INFORMATION" && (
              <Button
                className="w-full"
                disabled={saving}
                onClick={() =>
                  void update(
                    { status: "UNDER_REVIEW" },
                    "Verification returned to review.",
                  )
                }>
                Resume review
              </Button>
            )}
            {finalDecision && (
              <div className="space-y-2 rounded-lg border border-border/60 p-3">
                <p className="font-medium">
                  Verification {verificationLabel(app.status)}
                </p>
                {app.rejectionReason && (
                  <p className="text-sm">
                    <span className="text-muted-foreground">Reason:</span>{" "}
                    {app.rejectionReason}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  Reviewed by {app.decisionBy?.name || "Administrator"}
                  <br />
                  {date(app.decidedAt)}
                </p>
              </div>
            )}
            {!["PENDING", "UNDER_REVIEW", "NEEDS_INFORMATION"].includes(
              app.status,
            ) &&
              !finalDecision && (
                <p className="text-xs text-muted-foreground">
                  No decision actions are currently available for this status.
                </p>
              )}
            {app.status === "VERIFIED" && (
              <div className="grid gap-2">
                <Button
                  variant="outline"
                  disabled={saving}
                  onClick={() => setDecision("SUSPENDED")}>
                  Suspend verification
                </Button>
                <Button
                  variant="destructive"
                  disabled={saving}
                  onClick={() => setDecision("REVOKED")}>
                  Revoke verification
                </Button>
              </div>
            )}
            {app.status === "SUSPENDED" && (
              <div className="grid gap-2">
                <Button
                  disabled={saving || !app.eligibility.eligible}
                  onClick={() => setDecision("VERIFIED")}>
                  Restore verification
                </Button>
                <Button
                  variant="destructive"
                  disabled={saving}
                  onClick={() => setDecision("REVOKED")}>
                  Revoke verification
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="size-4" />
            Submitted documents
          </CardTitle>
          <CardDescription>
            Authenticated copies attached to this application. Private storage
            paths are never displayed.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2">
            {app.documents.length ? (
              app.documents.map((document) => (
                <article
                  key={`${document.source}-${document.id}`}
                  className="rounded-lg border border-border/60 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="break-words font-medium">{document.name}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {humanize(document.type)} · {humanize(document.status)}
                      </p>
                      <p className="mt-2 text-xs text-muted-foreground">
                        Uploaded {date(document.uploadedAt)}
                        <br />
                        Submitted {date(document.submittedAt)}
                      </p>
                    </div>
                    <TooltipProvider>
                      <div className="flex shrink-0 gap-1">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button asChild variant="ghost" size="icon-sm">
                              <a
                                href={document.viewUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-label={`Preview ${document.name}`}>
                                <Eye />
                              </a>
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Preview document</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button asChild variant="ghost" size="icon-sm">
                              <a
                                href={document.downloadUrl}
                                aria-label={`Download ${document.name}`}>
                                <Download />
                              </a>
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Download document</TooltipContent>
                        </Tooltip>
                      </div>
                    </TooltipProvider>
                  </div>
                </article>
              ))
            ) : (
              <div className="col-span-full rounded-lg border border-dashed p-6 text-center">
                <FileText className="mx-auto size-5 text-muted-foreground" />
                <p className="mt-2 font-medium">No submitted documents</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  This application has no linked document records.
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Internal notes</CardTitle>
            <CardDescription>
              Visible only to authorized administrators.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {app.notes.length ? (
                app.notes.map((item) => (
                  <article key={item.id} className="rounded-lg bg-muted/50 p-3">
                    <p>{item.body}</p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {item.admin.name} · {date(item.createdAt)}
                    </p>
                  </article>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">
                  No internal notes yet.
                </p>
              )}
            </div>
            <label
              htmlFor="internal-note"
              className="mt-4 block text-sm font-medium">
              Add a note
            </label>
            <Textarea
              id="internal-note"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              className="mt-2 min-h-20"
              placeholder="Add internal context"
            />
            <Button
              size="sm"
              className="mt-2"
              disabled={saving || note.trim().length < 2}
              onClick={() => void update({ note }, "Internal note added.")}>
              Add note
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Review history</CardTitle>
            <CardDescription>
              Recorded verification activity and decisions.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {app.activities.length ? (
              <ol className="space-y-4 border-l border-border pl-4">
                {app.activities.map((activity) => (
                  <li
                    key={activity.id}
                    className="relative before:absolute before:-left-[21px] before:top-1.5 before:size-2 before:rounded-full before:bg-primary">
                    <p className="font-medium">
                      {activityLabels[activity.type] ||
                        verificationLabel(activity.toValue)}
                    </p>
                    {activity.metadata?.reason && (
                      <p className="mt-1 text-sm">{activity.metadata.reason}</p>
                    )}
                    <p className="mt-1 text-xs text-muted-foreground">
                      {activity.actor?.name || "System"} ·{" "}
                      {date(activity.createdAt)}
                    </p>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-sm text-muted-foreground">
                No review activity has been recorded.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
      <DecisionDialog
        action={decision}
        app={app}
        saving={saving}
        onClose={() => setDecision(null)}
        onConfirm={async (reason) => {
          if (!decision) return;
          const succeeded = await update(
            { status: decision, reason },
            `Verification ${verificationLabel(decision).toLowerCase()}.`,
          );
          if (succeeded) setDecision(null);
        }}
      />
    </main>
  );
}
