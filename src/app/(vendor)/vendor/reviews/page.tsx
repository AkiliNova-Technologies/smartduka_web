"use client";

import * as React from "react";
import { type ColumnDef } from "@tanstack/react-table";
import { Eye, Flag, MessageSquare, MessageSquareReply, Star, Store } from "lucide-react";
import { toast } from "sonner";
import { DataTable } from "@/components/data-table";
import { DashboardMetricCard } from "@/components/dashboard-metric-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MediaImage } from "@/components/marketplace/media-image";
import { PRODUCT_IMAGE_FALLBACK } from "@/lib/media";
import { authHeaders, fetchApi } from "@/lib/providers/useProviderFetch";

type ReviewKind = "product" | "shop";
type Review = {
  id: string;
  rating: number;
  title?: string | null;
  comment: string | null;
  imageUrls?: string[];
  status: string;
  createdAt: string;
  user: { name: string | null };
  product?: { name: string; images?: { url: string }[] };
  vendorReplies: { body: string; createdAt: string }[];
};
type ReviewResponse = { productReviews: Review[]; shopReviews: Review[] };
type ReplyFilter = "all" | "replied" | "awaiting";

function date(value: string) {
  return new Intl.DateTimeFormat("en-UG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}
function statusLabel(value: string) {
  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/^./, (letter) => letter.toUpperCase());
}
function replyFor(review: Review) {
  return review.vendorReplies[0];
}

function Rating({ value, label = false }: { value: number; label?: boolean }) {
  return (
    <span
      className="inline-flex items-center gap-0.5 whitespace-nowrap text-amber-500"
      aria-label={`${value} out of 5 stars`}>
      {Array.from({ length: 5 }, (_, index) => (
        <Star
          key={index}
          className={`size-3.5 ${index < value ? "fill-current" : "text-muted-foreground/35"}`}
        />
      ))}
      {label && (
        <span className="ml-1 text-xs font-medium text-foreground">
          {value.toFixed(1)}
        </span>
      )}
    </span>
  );
}

function MetricCard({
  label,
  value,
  detail,
  icon,
  tone,
}: {
  label: string;
  value: string | number;
  detail: string;
  icon: typeof Star;
  tone?: "default" | "warning";
}) {
  return <DashboardMetricCard label={label} value={value} description={detail} icon={icon} tone={tone} />;
}

function ReviewsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-2 border-b border-border/40 pb-6">
        <Skeleton className="h-7 w-32" />
        <Skeleton className="h-4 w-72" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-28 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-80 rounded-xl" />
    </div>
  );
}

export default function VendorReviewsPage() {
  const [tab, setTab] = React.useState<ReviewKind>("product");
  const [data, setData] = React.useState<ReviewResponse>({
    productReviews: [],
    shopReviews: [],
  });
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [rating, setRating] = React.useState("all");
  const [replyFilter, setReplyFilter] = React.useState<ReplyFilter>("all");
  const [status, setStatus] = React.useState("all");
  const [selected, setSelected] = React.useState<Review | null>(null);
  const requestRef = React.useRef<Promise<void> | null>(null);

  const load = React.useCallback(async () => {
    if (requestRef.current) return requestRef.current;
    const request = (async () => { setLoading(true); setError(null); try { setData(
        await fetchApi<ReviewResponse>("/api/vendor/reviews", {
          headers: authHeaders(),
        }),
      );
    } catch { setError("We couldn’t load your reviews. Please try again."); } finally { setLoading(false); } })();
    requestRef.current = request;
    try { await request; } finally { requestRef.current = null; }
  }, []);

  React.useEffect(() => {
    queueMicrotask(() => {
      void load();
    });
  }, [load]);

  const reviews = tab === "product" ? data.productReviews : data.shopReviews;
  const publishedProductReviews = React.useMemo(
    () => data.productReviews.filter((review) => review.status === "PUBLISHED"),
    [data.productReviews],
  );
  const publishedShopReviews = React.useMemo(
    () => data.shopReviews.filter((review) => review.status === "PUBLISHED"),
    [data.shopReviews],
  );
  const average = (items: Review[]) =>
    items.length
      ? (
          items.reduce((total, review) => total + review.rating, 0) /
          items.length
        ).toFixed(1)
      : "—";
  const awaitingReply = React.useMemo(
    () =>
      [...publishedProductReviews, ...publishedShopReviews].filter(
        (review) => !replyFor(review),
      ).length,
    [publishedProductReviews, publishedShopReviews],
  );
  const filteredReviews = React.useMemo(
    () =>
      reviews.filter(
        (review) =>
          (rating === "all" || review.rating === Number(rating)) &&
          (replyFilter === "all" ||
            (replyFilter === "replied"
              ? Boolean(replyFor(review))
              : !replyFor(review))) &&
          (status === "all" || review.status === status),
      ),
    [rating, replyFilter, reviews, status],
  );

  const columns = React.useMemo<ColumnDef<Review>[]>(() => {
    const common: ColumnDef<Review>[] = [
      {
        accessorKey: "user.name",
        header: "Customer",
        cell: ({ row }) => (
          <span className="max-w-36 truncate text-sm font-medium">
            {row.original.user.name || "Customer"}
          </span>
        ),
      },
      {
        accessorKey: "rating",
        header: "Rating",
        cell: ({ row }) => <Rating value={row.original.rating} label />,
      },
      {
        accessorKey: "comment",
        header: "Review",
        cell: ({ row }) => (
          <p className="max-w-64 truncate text-sm text-muted-foreground">
            {row.original.title ||
              row.original.comment ||
              "No written feedback"}
          </p>
        ),
      },
      {
        accessorKey: "createdAt",
        header: "Date",
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-xs text-muted-foreground">
            {date(row.original.createdAt)}
          </span>
        ),
      },
      {
        id: "reply",
        header: "Reply",
        cell: ({ row }) =>
          replyFor(row.original) ? (
            <span className="inline-flex rounded-full border border-emerald-500/20 bg-emerald-500/5 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-400">
              Replied
            </span>
          ) : (
            <span className="inline-flex rounded-full border border-amber-500/20 bg-amber-500/5 px-2 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-400">
              Awaiting reply
            </span>
          ),
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1"
            onClick={() => setSelected(row.original)}>
            <Eye className="size-4" />
            <span className="hidden sm:inline">View</span>
          </Button>
        ),
      },
    ];
    return tab === "product"
      ? [
          {
            id: "product",
            header: "Product",
            cell: ({ row }) => (
              <div className="flex min-w-40 items-center gap-2">
                <span className="relative size-8 shrink-0 overflow-hidden rounded bg-muted">
                  {row.original.product?.images?.[0]?.url ? (
                    <MediaImage
                      src={row.original.product.images[0].url}
                      fallback={PRODUCT_IMAGE_FALLBACK}
                      alt=""
                      fill
                      sizes="32px"
                      className="object-cover"
                    />
                  ) : null}
                </span>
                <span className="truncate text-sm font-medium">
                  {row.original.product?.name || "Product"}
                </span>
              </div>
            ),
          },
          ...common,
        ]
      : common;
  }, [tab]);

  const filtersActive =
    rating !== "all" || replyFilter !== "all" || status !== "all";
  const clearFilters = () => {
    setRating("all");
    setReplyFilter("all");
    setStatus("all");
  };
  const toolbar = (
    <div className="flex flex-wrap items-center gap-2">
      <Select value={rating} onValueChange={setRating}>
        <SelectTrigger className="h-9 w-28 rounded-lg text-xs">
          <SelectValue placeholder="Rating" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All ratings</SelectItem>
          {[5, 4, 3, 2, 1].map((value) => (
            <SelectItem key={value} value={String(value)}>
              {value} stars
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={replyFilter}
        onValueChange={(value) => setReplyFilter(value as ReplyFilter)}>
        <SelectTrigger className="h-9 w-32 rounded-lg text-xs">
          <SelectValue placeholder="Reply" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All replies</SelectItem>
          <SelectItem value="awaiting">Awaiting reply</SelectItem>
          <SelectItem value="replied">Replied</SelectItem>
        </SelectContent>
      </Select>
      <Select value={status} onValueChange={setStatus}>
        <SelectTrigger className="h-9 w-32 rounded-lg text-xs">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All statuses</SelectItem>
          <SelectItem value="PUBLISHED">Published</SelectItem>
          <SelectItem value="HIDDEN">Hidden</SelectItem>
          <SelectItem value="REMOVED">Removed</SelectItem>
        </SelectContent>
      </Select>
      {filtersActive && (
        <Button
          variant="ghost"
          size="sm"
          className="h-9 text-xs"
          onClick={clearFilters}>
          Reset
        </Button>
      )}
    </div>
  );

  if (loading) return <ReviewsSkeleton />;
  return (
    <div className="space-y-8">
      <header className="border-b border-border/40 pb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Reviews</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Read verified customer feedback and respond on behalf of your shop.
        </p>
      </header>
      {error ? (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-500/20 bg-rose-500/5 p-4 text-sm text-rose-700 dark:text-rose-400">
          <span>{error}</span>
          <Button variant="outline" size="sm" onClick={() => void load()}>
            Try again
          </Button>
        </div>
      ) : (
        <>
          <section
            aria-label="Review performance"
            className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="Average product rating"
              value={average(publishedProductReviews)}
              detail={
                publishedProductReviews.length
                  ? `${publishedProductReviews.length} published reviews`
                  : "No published reviews"
              }
              icon={Star}
            />
            <MetricCard
              label="Average shop rating"
              value={average(publishedShopReviews)}
              detail={
                publishedShopReviews.length
                  ? `${publishedShopReviews.length} published reviews`
                  : "No published reviews"
              }
              icon={Store}
            />
            <MetricCard
              label="Published reviews"
              value={
                publishedProductReviews.length + publishedShopReviews.length
              }
              detail="Visible customer feedback"
              icon={MessageSquare}
            />
            <MetricCard
              label="Awaiting your reply"
              value={awaitingReply}
              detail="Published reviews without a reply"
              icon={MessageSquareReply}
              tone="warning"
            />
          </section>
          <Tabs
            value={tab}
            onValueChange={(value) => {
              setTab(value as ReviewKind);
              clearFilters();
            }}>
            <TabsList aria-label="Review type">
              <TabsTrigger value="product">
                Product reviews{" "}
                <span className="text-muted-foreground">
                  {data.productReviews.length}
                </span>
              </TabsTrigger>
              <TabsTrigger value="shop">
                Shop reviews{" "}
                <span className="text-muted-foreground">
                  {data.shopReviews.length}
                </span>
              </TabsTrigger>
            </TabsList>
            <TabsContent value="product" className="mt-5">
              <ReviewsTable
                kind="product"
                columns={columns}
                reviews={filteredReviews}
                loading={loading}
                toolbar={toolbar}
              />
            </TabsContent>
            <TabsContent value="shop" className="mt-5">
              <ReviewsTable
                kind="shop"
                columns={columns}
                reviews={filteredReviews}
                loading={loading}
                toolbar={toolbar}
              />
            </TabsContent>
          </Tabs>
        </>
      )}
      <ReviewDetailsSheet
        key={selected?.id || "no-review"}
        kind={tab}
        review={selected}
        onOpenChange={(open) => !open && setSelected(null)}
        onUpdated={load}
      />
    </div>
  );
}

function ReviewsTable({
  kind,
  columns,
  reviews,
  loading,
  toolbar,
}: {
  kind: ReviewKind;
  columns: ColumnDef<Review>[];
  reviews: Review[];
  loading: boolean;
  toolbar: React.ReactNode;
}) {
  return (
    <DataTable
      columns={columns}
      data={reviews}
      getRowId={(review) => review.id}
      isLoading={loading}
      searchPlaceholder="Search reviews"
      searchColumn="comment"
      defaultPageSize={10}
      toolbarContent={toolbar}
      features={{
        search: true,
        sorting: true,
        pagination: true,
        columnVisibility: false,
        filtering: true,
        rowSelection: false,
        toolbar: true,
        footer: true,
      }}
      emptyStateContent={
        <span>
          {kind === "product"
            ? "No product reviews match these filters."
            : "No shop reviews match these filters."}
        </span>
      }
      className="rounded-xl"
      containerClassName="gap-0"
    />
  );
}

function ReviewDetailsSheet({
  kind,
  review,
  onOpenChange,
  onUpdated,
}: {
  kind: ReviewKind;
  review: Review | null;
  onOpenChange: (open: boolean) => void;
  onUpdated: () => Promise<void>;
}) {
  const [reply, setReply] = React.useState(() =>
    review ? replyFor(review)?.body || "" : "",
  );
  const [reportReason, setReportReason] = React.useState("");
  const [showReport, setShowReport] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const existingReply = review ? replyFor(review) : undefined;

  const saveReply = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!review || !reply.trim()) return;
    setSaving(true);
    try {
      await fetchApi(`/api/vendor/reviews/${kind}/${review.id}/reply`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ body: reply }),
      });
      toast.success(existingReply ? "Reply updated." : "Reply posted.");
      await onUpdated();
      onOpenChange(false);
    } catch {
      toast.error("We couldn’t save your reply.");
    } finally {
      setSaving(false);
    }
  };
  const reportReview = async () => {
    if (!review || !reportReason.trim()) return;
    setSaving(true);
    try {
      await fetchApi(`/api/reviews/${kind}/${review.id}/report`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ reason: reportReason }),
      });
      toast.success("Review reported for moderation.");
      setShowReport(false);
      setReportReason("");
    } catch {
      toast.error(
        "We couldn’t report this review. It may already be reported.",
      );
    } finally {
      setSaving(false);
    }
  };
  const handleOpenChange = (open: boolean) => {
    if (open) {
      setShowReport(false);
      setReportReason("");
    }
    onOpenChange(open);
  };

  return (
    <Sheet open={Boolean(review)} onOpenChange={handleOpenChange}>
      {review && (
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>
              {kind === "product"
                ? review.product?.name || "Product review"
                : "Shop review"}
            </SheetTitle>
            <SheetDescription>
              {review.user.name || "Customer"} · Submitted{" "}
              {date(review.createdAt)} · {statusLabel(review.status)}
            </SheetDescription>
          </SheetHeader>
          <div className="space-y-5 px-4 pb-4">
            <Rating value={review.rating} label />
            {review.title && <p className="font-medium">{review.title}</p>}
            <p className="whitespace-pre-wrap text-sm leading-6 text-foreground">
              {review.comment || "No written feedback."}
            </p>
            {review.imageUrls?.length ? (
              <div>
                <p className="mb-2 text-sm font-medium">Customer photos</p>
                <div className="grid grid-cols-2 gap-2">
                  {review.imageUrls.map((url) => (
                    <div
                      key={url}
                      className="relative aspect-square overflow-hidden rounded-lg bg-muted">
                      <MediaImage
                        src={url}
                        fallback={PRODUCT_IMAGE_FALLBACK}
                        alt="Customer review photo"
                        fill
                        sizes="(max-width: 640px) 45vw, 220px"
                        className="object-cover"
                      />
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
            {existingReply && (
              <div className="rounded-xl border border-border/60 bg-muted/40 p-3">
                <p className="text-xs font-medium text-muted-foreground">
                  Your official reply
                </p>
                <p className="mt-1 whitespace-pre-wrap text-sm">
                  {existingReply.body}
                </p>
              </div>
            )}
            <form onSubmit={saveReply} className="space-y-2">
              <Label htmlFor="vendor-review-reply">
                {existingReply ? "Edit your reply" : "Reply to this review"}
              </Label>
              <textarea
                id="vendor-review-reply"
                value={reply}
                onChange={(event) => setReply(event.target.value)}
                maxLength={2000}
                required
                className="min-h-28 w-full rounded-xl border border-input bg-background p-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                placeholder="Write an official reply"
              />
              <Button
                type="submit"
                disabled={saving || !reply.trim()}
                className="rounded-xl">
                <MessageSquareReply className="size-4" />
                {saving
                  ? "Saving…"
                  : existingReply
                    ? "Update reply"
                    : "Post reply"}
              </Button>
            </form>
            <div className="border-t border-border/60 pt-4">
              {showReport ? (
                <div className="space-y-2">
                  <Label htmlFor="review-report-reason">
                    Why should this review be reviewed?
                  </Label>
                  <Input
                    id="review-report-reason"
                    value={reportReason}
                    onChange={(event) => setReportReason(event.target.value)}
                    maxLength={1000}
                    placeholder="Describe the issue"
                  />
                  <div className="flex gap-2">
                    <Button
                      variant="destructive"
                      size="sm"
                      disabled={saving || !reportReason.trim()}
                      onClick={() => void reportReview()}>
                      Submit report
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowReport(false)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-xl"
                  onClick={() => setShowReport(true)}>
                  <Flag className="size-4" />
                  Report review
                </Button>
              )}
            </div>
          </div>
          <SheetFooter className="border-t border-border/60">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </SheetFooter>
        </SheetContent>
      )}
    </Sheet>
  );
}
