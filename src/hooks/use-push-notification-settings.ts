"use client";

import * as React from "react";
import { toast } from "sonner";
import { pushClient } from "@/lib/push-client";

const fromBase64Url = (value: string) => {
  const padded = value + "=".repeat((4 - (value.length % 4)) % 4);
  const raw = atob(padded.replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (character) => character.charCodeAt(0));
};

function browserState() {
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return { supported: window.isSecureContext && "Notification" in window && "serviceWorker" in navigator && "PushManager" in window, ios, standalone };
}

async function currentBrowserSubscription() {
  const registration = await navigator.serviceWorker.getRegistration("/");
  return registration?.pushManager.getSubscription() ?? null;
}

export function usePushNotificationSettings() {
  const [state, setState] = React.useState<{ supported: boolean; ios: boolean; standalone: boolean } | null>(null);
  const [permission, setPermission] = React.useState<NotificationPermission | "unsupported">("unsupported");
  const [configured, setConfigured] = React.useState(false);
  const [subscribed, setSubscribed] = React.useState(false);
  const [working, setWorking] = React.useState(false);
  const refresh = React.useCallback(async () => {
    const current = browserState(); setState(current); setPermission(current.supported ? Notification.permission : "unsupported");
    if (!current.supported) return;
    try {
      const localSubscription = await currentBrowserSubscription();
      const config = await pushClient.configuration();
      if (!localSubscription) { setConfigured(config.enabled && !!config.publicKey); setSubscribed(false); return; }
      const status = await pushClient.status(localSubscription.endpoint);
      setConfigured(config.enabled && !!config.publicKey); setSubscribed(status.subscribed);
    } catch { setConfigured(false); setSubscribed(false); }
  }, []);
  React.useEffect(() => { const timer = window.setTimeout(() => void refresh(), 0); return () => window.clearTimeout(timer); }, [refresh]);
  const enable = async () => {
    const current = browserState(); if (!current.supported) return;
    if (current.ios && !current.standalone) { toast.error("On iPhone and iPad, add Mwezora to your Home Screen before enabling notifications."); return; }
    setWorking(true);
    try {
      const config = await pushClient.configuration();
      if (!config.enabled || !config.publicKey) throw new Error("Push notifications are not configured for this environment.");
      const nextPermission = await Notification.requestPermission(); setPermission(nextPermission); if (nextPermission !== "granted") return;
      const registration = (await navigator.serviceWorker.getRegistration("/")) ?? (await navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }));
      const currentSubscription = await registration.pushManager.getSubscription();
      const subscription = currentSubscription ?? (await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: fromBase64Url(config.publicKey) }));
      const serialized = subscription.toJSON();
      if (!serialized.endpoint || !serialized.keys?.p256dh || !serialized.keys.auth) throw new Error("Your browser returned an incomplete push subscription. Please try again.");
      await pushClient.register({ endpoint: serialized.endpoint, expirationTime: serialized.expirationTime ?? null, keys: { p256dh: serialized.keys.p256dh, auth: serialized.keys.auth }, deviceName: navigator.platform || undefined });
      setSubscribed(true); toast.success("Device notifications are enabled.");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Unable to enable notifications."); } finally { setWorking(false); }
  };
  const disable = async () => {
    setWorking(true);
    try { const subscription = await currentBrowserSubscription(); await pushClient.remove(subscription?.endpoint); await subscription?.unsubscribe(); setSubscribed(false); toast.success("Device notifications are disabled."); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Unable to disable notifications."); } finally { setWorking(false); }
  };
  const sendTest = async () => {
    setWorking(true);
    try {
      const subscription = await currentBrowserSubscription();
      if (!subscription) { setSubscribed(false); throw new Error("This device does not have an active notification subscription. Enable notifications and try again."); }
      await pushClient.enqueueTest({ endpoint: subscription.endpoint, requestId: crypto.randomUUID() });
      toast.success("Test notification queued. It should arrive shortly.");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Unable to queue a test notification."); } finally { setWorking(false); }
  };
  const unavailable = !state || !state.supported || !configured;
  const installationRequired = !!state?.ios && !state.standalone;
  const denied = permission === "denied";
  return { subscribed, working, enable, disable, sendTest, unavailable, installationRequired, denied, permission };
}
