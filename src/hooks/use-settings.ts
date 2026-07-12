"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

interface UserSettings {
  id: string;
  userId: string;
  fullName: string | null;
  phoneNumber: string | null;
  avatarUrl: string | null;
  currency: string;
  primaryLanguage: string;
  deliveryDistrict: string | null;
  momoNetwork: string | null;
  momoNumber: string | null;
  orderAlertsEmail: boolean;
  orderAlertsPush: boolean;
  securityAlertsSMS: boolean;
  marketingNewsletter: boolean;
  twoFactorEnabled: boolean;
  buyerProtectionEnabled: boolean;
}

const defaultSettings: UserSettings = {
  id: "",
  userId: "",
  fullName: null,
  phoneNumber: null,
  avatarUrl: null,
  currency: "UGX",
  primaryLanguage: "en",
  deliveryDistrict: null,
  momoNetwork: null,
  momoNumber: null,
  orderAlertsEmail: true,
  orderAlertsPush: true,
  securityAlertsSMS: true,
  marketingNewsletter: false,
  twoFactorEnabled: false,
  buyerProtectionEnabled: true,
};

export function useSettings() {
  const { uid, isAuthenticated, loading: authLoading } = useAuth();
  const [settings, setSettings] = useState<UserSettings>(defaultSettings);
  const [saving, setSaving] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);

  // Derived loading: true while auth is loading, or authenticated but first fetch hasn't completed
  const loading = authLoading || (isAuthenticated && !hasFetched);

  // Manual refetch (used by updateSettings revert and exposed as refetch)
  const fetchSettings = useCallback(async () => {
    if (!uid) return;
    try {
      const response = await fetch("/api/settings", {
        headers: { "x-marketplace-user-id": uid },
      });
      if (response.ok) {
        const data = await response.json();
        setSettings(data);
      }
    } catch (error) {
      console.error("Failed to fetch settings:", error);
    }
  }, [uid]);

  // Effect: fetch on mount / auth change – no setState called synchronously
  useEffect(() => {
    if (!authLoading && isAuthenticated && uid && !hasFetched) {
      // Async IIFE guarantees all setState calls are inside async callbacks
      (async () => {
        try {
          const response = await fetch("/api/settings", {
            headers: { "x-marketplace-user-id": uid },
          });
          if (response.ok) {
            const data = await response.json();
            setSettings(data);
          }
        } catch (error) {
          console.error("Failed to fetch settings:", error);
        } finally {
          setHasFetched(true);
        }
      })();
    }
  }, [authLoading, isAuthenticated, uid, hasFetched]);

  const updateSettings = async (updates: Partial<UserSettings>) => {
    if (!uid) return;

    setSaving(true);
    // Optimistic update
    setSettings((prev) => ({ ...prev, ...updates }));

    try {
      const response = await fetch("/api/settings", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-marketplace-user-id": uid,
        },
        body: JSON.stringify(updates),
      });

      if (response.ok) {
        const data = await response.json();
        setSettings(data);
        toast.success("Settings saved successfully.");
      } else {
        throw new Error("Failed to save");
      }
    } catch {
      toast.error("Failed to save settings. Please try again.");
      // Revert optimistic update
      fetchSettings();
    } finally {
      setSaving(false);
    }
  };

  return {
    settings,
    loading,
    saving,
    updateSettings,
    refetch: fetchSettings,
  };
}