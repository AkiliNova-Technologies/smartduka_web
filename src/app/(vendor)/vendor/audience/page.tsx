"use client";
import * as React from "react";
import { toast } from "sonner";
import { Users, Megaphone, CalendarClock, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useStorePublications } from "@/hooks/use-store-publications";
import type {
  StorePublicationDraft,
  StorePublicationKind,
} from "@/lib/store-publications-client";

const empty: StorePublicationDraft = {
  kind: "ANNOUNCEMENT",
  notificationTopic: "ANNOUNCEMENT",
  title: "",
  body: "",
  destination: "STOREFRONT",
  imageUrl: null,
  scheduledAt: null,
  expiresAt: null,
  productIds: [],
};
const date = (value: string | null) =>
  value
    ? new Intl.DateTimeFormat("en-UG", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(value))
    : "—";

export default function VendorAudiencePage() {
  const audience = useStorePublications(),
    [draft, setDraft] = React.useState<StorePublicationDraft>(empty),
    [saving, setSaving] = React.useState(false),
    [showForm, setShowForm] = React.useState(false),
    [productQuery, setProductQuery] = React.useState("");
  const save = async () => {
    setSaving(true);
    try {
      await audience.create(draft);
      setDraft(empty);
      setShowForm(false);
      toast.success("Draft saved.");
    } catch (cause) {
      toast.error(
        cause instanceof Error ? cause.message : "Unable to save draft.",
      );
    } finally {
      setSaving(false);
    }
  };
  const action = async (label: string, operation: () => Promise<void>) => {
    try {
      await operation();
      toast.success(label);
    } catch (cause) {
      toast.error(
        cause instanceof Error
          ? cause.message
          : "Unable to update publication.",
      );
    }
  };
  const cards = [
    {
      label: "Total followers",
      value: audience.metrics?.totalFollowers ?? 0,
      icon: Users,
    },
    {
      label: "New in 7 days",
      value: audience.metrics?.newFollowers7Days ?? 0,
      icon: TrendingUp,
    },
    {
      label: "Published announcements",
      value: audience.metrics?.publishedAnnouncements ?? 0,
      icon: Megaphone,
    },
    {
      label: "Active campaigns",
      value: audience.metrics?.activeCampaigns ?? 0,
      icon: CalendarClock,
    },
  ];
  return (
    <div className="space-y-6 p-4 md:p-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Audience</h1>
          <p className="text-sm text-muted-foreground">
            Understand follower growth and publish reviewed store updates.
          </p>
        </div>
        <Button
          className="rounded-full"
          onClick={() => setShowForm((value) => !value)}
        >
          {showForm ? "Close" : "Create publication"}
        </Button>
      </div>
      {audience.error && (
        <div
          role="alert"
          className="rounded-xl border border-destructive/30 p-4 text-sm"
        >
          {audience.error}{" "}
          <Button variant="link" onClick={() => audience.refresh()}>
            Try again
          </Button>
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((item) => (
          <Card key={item.label}>
            <CardContent className="flex items-center justify-between p-5">
              <div>
                <p className="text-sm text-muted-foreground">{item.label}</p>
                <p className="mt-1 text-2xl font-semibold">
                  {audience.loading ? "—" : item.value.toLocaleString()}
                </p>
              </div>
              <item.icon className="size-5 text-muted-foreground" />
            </CardContent>
          </Card>
        ))}
      </div>
      {audience.metrics?.totalFollowers === 0 && (
        <Card>
          <CardContent className="p-6">
            <p className="font-medium">
              Your audience starts with the first follower.
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Customers who follow your public storefront will appear in these
              aggregate totals. Their identities and contact details are never
              exposed.
            </p>
          </CardContent>
        </Card>
      )}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>New follower publication</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="kind">Type</Label>
              <select
                id="kind"
                className="h-10 rounded-md border bg-background px-3"
                value={draft.kind}
                onChange={(event) => {
                  const kind = event.target.value as StorePublicationKind;
                  setDraft({ ...draft, kind, notificationTopic: kind === "ANNOUNCEMENT" ? "ANNOUNCEMENT" : "CAMPAIGN", productIds: [] });
                }}
              >
                <option value="ANNOUNCEMENT">Announcement</option>
                <option value="FOLLOWER_CAMPAIGN">Follower campaign</option>
              </select>
            </div>
            {draft.kind === "FOLLOWER_CAMPAIGN" && (
              <div className="grid gap-2">
                <Label htmlFor="notificationTopic">Notification topic</Label>
                <select id="notificationTopic" className="h-10 rounded-md border bg-background px-3" value={draft.notificationTopic} onChange={(event) => setDraft({ ...draft, notificationTopic: event.target.value as "CAMPAIGN" | "NEW_ARRIVALS" })}>
                  <option value="CAMPAIGN">Follower campaign</option>
                  <option value="NEW_ARRIVALS">Explicit new-arrivals collection</option>
                </select>
              </div>
            )}
            <div className="grid gap-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                maxLength={160}
                value={draft.title}
                onChange={(event) =>
                  setDraft({ ...draft, title: event.target.value })
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="body">Description</Label>
              <Textarea
                id="body"
                maxLength={2000}
                rows={5}
                value={draft.body}
                onChange={(event) =>
                  setDraft({ ...draft, body: event.target.value })
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="image">Optional image URL</Label>
              <Input
                id="image"
                type="url"
                value={draft.imageUrl ?? ""}
                onChange={(event) =>
                  setDraft({ ...draft, imageUrl: event.target.value || null })
                }
              />
            </div>
            {draft.kind === "FOLLOWER_CAMPAIGN" && (
              <div className="grid gap-2">
                <Label htmlFor="products">Selected products</Label>
                <div className="flex gap-2">
                  <Input
                    id="products"
                    placeholder="Search your active products"
                    value={productQuery}
                    onChange={(event) => setProductQuery(event.target.value)}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    disabled={audience.productLoading}
                    onClick={() => audience.searchProducts(productQuery)}
                  >
                    Search
                  </Button>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {audience.products.map((product) => {
                    const selected =
                      draft.productIds?.includes(product.id) ?? false;
                    return (
                      <label
                        key={product.id}
                        className="flex items-center gap-3 rounded-lg border p-3 text-sm"
                      >
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() =>
                            setDraft({
                              ...draft,
                              productIds: selected
                                ? draft.productIds?.filter(
                                    (id) => id !== product.id,
                                  )
                                : [...(draft.productIds ?? []), product.id],
                            })
                          }
                        />
                        <span>{product.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="publishAt">Publication time</Label>
                <Input
                  id="publishAt"
                  type="datetime-local"
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      scheduledAt: event.target.value
                        ? new Date(event.target.value).toISOString()
                        : null,
                    })
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="expiresAt">Expiration time</Label>
                <Input
                  id="expiresAt"
                  type="datetime-local"
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      expiresAt: event.target.value
                        ? new Date(event.target.value).toISOString()
                        : null,
                    })
                  }
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Follower preview</Label>
              <div className="rounded-xl border bg-background p-4">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">
                    {draft.kind === "ANNOUNCEMENT"
                      ? "Store update"
                      : "Follower campaign"}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    Store followers
                  </span>
                </div>
                <p className="mt-3 font-semibold">
                  {draft.title || "Publication title"}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {draft.body || "Your description will appear here."}
                </p>
              </div>
            </div>
            <div className="rounded-xl bg-muted p-4 text-sm text-muted-foreground">
              <p>Target audience: eligible current followers with explicit marketing and topic consent.</p>
              <p className="mt-1">Available channels: in-app notification center{audience.metrics?.notifications.pushEnabled ? " and configured push devices" : "; external push is currently disabled"}.</p>
              <p className="mt-1">Saving creates a draft. Owner/admin review remains required, and each publication event can be processed only once.</p>
            </div>
            <Button
              className="w-fit rounded-full"
              disabled={saving || !draft.title.trim() || !draft.body.trim()}
              onClick={save}
            >
              {saving ? "Saving…" : "Save draft"}
            </Button>
          </CardContent>
        </Card>
      )}
      <Card>
        <CardHeader>
          <CardTitle>Publications</CardTitle>
        </CardHeader>
        <CardContent>
          {!audience.loading && audience.items.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No announcements or campaigns yet.
            </p>
          ) : (
            <div className="divide-y">
              {audience.items.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-wrap items-start justify-between gap-4 py-4"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">{item.title}</p>
                      <Badge variant="secondary">
                        {item.kind === "ANNOUNCEMENT"
                          ? "Announcement"
                          : "Follower campaign"}
                      </Badge>
                      <Badge variant="outline">
                        {item.status.replaceAll("_", " ")}
                      </Badge>
                    </div>
                    <p className="mt-1 max-w-2xl text-sm text-muted-foreground line-clamp-2">
                      {item.body}
                    </p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      Publish {date(item.scheduledAt ?? item.publishedAt)} ·
                      Expires {date(item.expiresAt)}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {item.status === "DRAFT" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-full"
                        onClick={() =>
                          action("Submitted for review.", () =>
                            audience.submit(item.id),
                          )
                        }
                      >
                        Submit
                      </Button>
                    )}
                    {item.status === "IN_REVIEW" && (
                      <Button
                        size="sm"
                        className="rounded-full"
                        onClick={() =>
                          action("Publication approved.", () =>
                            audience.publish(item.id),
                          )
                        }
                      >
                        Review & publish
                      </Button>
                    )}
                    {["IN_REVIEW", "SCHEDULED", "PUBLISHED"].includes(
                      item.status,
                    ) && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          action("Publication archived.", () =>
                            audience.archive(item.id),
                          )
                        }
                      >
                        Archive
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      <p className="text-xs text-muted-foreground">
        Follower engagement is not shown because Mezora does not currently track
        verified publication views or conversions.
      </p>
    </div>
  );
}
