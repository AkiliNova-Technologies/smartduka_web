"use client";

import { BellOff, BellRing, Send, ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { usePushNotificationSettings } from "@/hooks/use-push-notification-settings";

export function PushNotificationSettings() {
  const { subscribed, working, enable, disable, sendTest, unavailable, installationRequired, denied, permission } = usePushNotificationSettings();
  const status = denied ? "Blocked" : installationRequired ? "Installation required" : unavailable ? "Unavailable" : subscribed ? "Enabled" : "Disabled";
  const description = installationRequired
    ? "On iPhone and iPad, install Mwezora from Safari’s Share menu before enabling notifications."
    : denied
      ? "Notifications are blocked in this browser. Open your browser or site settings, allow notifications for Mwezora, then return here."
      : unavailable
        ? "This browser or deployment cannot use secure web push notifications."
        : subscribed
          ? "This browser can receive account updates when Mwezora is closed."
          : "Enable supported browser notifications for important account updates when Mwezora is closed.";

  return (
    <Card className="mt-4">
      <CardHeader>
        <div className="flex gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 p-2 text-primary">
            {subscribed ? <BellRing className="size-5" /> : <BellOff className="size-5" />}
          </div>
          <div className="min-w-0 flex-1">
            <CardTitle>Device notifications</CardTitle>
            <CardDescription className="mt-1">{description}</CardDescription>
          </div>
          <Badge variant={denied ? "destructive" : subscribed ? "default" : "secondary"}>{status}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          {subscribed && !unavailable && !installationRequired && !denied && (
            <Button type="button" variant="outline" className="rounded-full px-4" disabled={working} onClick={() => void sendTest()}>
              <Send className="mr-2 size-4" />
              {working ? "Queuing…" : "Send test notification"}
            </Button>
          )}
          <Button type="button" variant={subscribed ? "ghost" : "default"} className="rounded-full px-4" disabled={working || unavailable || installationRequired || denied} onClick={() => void (subscribed ? disable() : enable())}>
            {working ? "Updating…" : subscribed ? "Disable notifications" : "Enable notifications"}
          </Button>
          {!subscribed && !denied && !unavailable && <span className="text-xs text-muted-foreground">Permission: {permission === "default" ? "Not requested" : permission}</span>}
        </div>
        {denied && (
          <div className="mt-4 flex gap-2 rounded-lg bg-muted p-3 text-xs text-muted-foreground">
            <ShieldAlert className="size-4 shrink-0" />
            Mwezora cannot reopen the browser permission prompt after it is denied.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
