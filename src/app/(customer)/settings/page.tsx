"use client";

import React, { useState } from "react";
import {
  Settings,
  Shield,
  Bell,
  User,
  Globe,
  Loader2,
  LogOut,
} from "lucide-react";
import { useUserData } from "@/providers/UserDataProvider";
import { useAuth } from "@/hooks/use-auth";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

type TabID = "profile" | "notifications" | "regional" | "security";

const CURRENCIES = [
  { value: "UGX", label: "UGX (Shilling)" },
  { value: "USD", label: "USD (Dollar)" },
  { value: "KES", label: "KES (Shilling)" },
];

const LANGUAGES = [
  { value: "en", label: "English (UG)" },
  { value: "sw", label: "Kiswahili" },
];

const MOMO_NETWORKS = [
  { value: "MTN", label: "MTN Mobile Money" },
  { value: "Airtel", label: "Airtel Money" },
];

const DELIVERY_DISTRICTS = [
  "Nakawa",
  "Central",
  "Makindye",
  "Rubaga",
  "Kawempe",
];

interface SettingsFormContentProps {
  settings: NonNullable<ReturnType<typeof useUserData>["settings"]>;
  user: ReturnType<typeof useAuth>["user"];
  saving: boolean;
  updateSettings: ReturnType<typeof useUserData>["updateSettings"];
  logout: () => void;
  actionLoading: boolean;
  router: ReturnType<typeof useRouter>;
}

function SettingsFormContent({
  settings,
  user,
  saving,
  updateSettings,
  logout,
  actionLoading,
  router,
}: SettingsFormContentProps) {
  const [activeTab, setActiveTab] = useState<TabID>("profile");

  // Local form state – initialised once from the received settings
  const [fullName, setFullName] = useState(
    settings.fullName || user?.displayName || ""
  );
  const [phoneNumber, setPhoneNumber] = useState(
    settings.phoneNumber || user?.phoneNumber || ""
  );
  const [currency, setCurrency] = useState(settings.currency || "UGX");
  const [language, setLanguage] = useState(settings.primaryLanguage || "en");
  const [deliveryDistrict, setDeliveryDistrict] = useState(
    settings.deliveryDistrict || ""
  );
  const [momoNumber, setMomoNumber] = useState(settings.momoNumber || "");
  const [momoNetwork, setMomoNetwork] = useState(settings.momoNetwork || "");

  const handleSaveProfile = () => {
    updateSettings({ fullName, phoneNumber });
  };

  const handleSaveRegional = () => {
    updateSettings({
      currency,
      primaryLanguage: language,
      deliveryDistrict,
      momoNetwork: momoNetwork || null,
      momoNumber: momoNumber || null,
    });
  };

  const handleToggleNotification = (key: string, value: boolean) => {
    updateSettings({ [key]: value });
  };

  const userEmail = user?.email || "";

  return (
    <div className="max-w-8xl mx-auto px-4 py-10 space-y-10 text-foreground antialiased selection:bg-emerald-500/10 selection:text-emerald-700">
      {/* Header Section */}
      <div className="border-b border-border/60 pb-6">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-muted rounded-full border border-border/40">
            <Settings className="w-5 h-5 text-zinc-800 dark:text-zinc-200" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
              Account Settings
            </h1>
            <p className="text-xs font-semibold text-zinc-400 dark:text-zinc-500 mt-0.5">
              Manage your profile, payment channels, notifications, and security
              preferences.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Left Navigation */}
        <div className="space-y-1 md:col-span-1 flex flex-col h-full">
          <p className="text-[10px] font-bold tracking-wider text-zinc-400 dark:text-zinc-500 uppercase px-3 mb-2">
            Configurations
          </p>

          {(
            [
              { id: "profile", label: "Account Profile", icon: User },
              { id: "notifications", label: "Notifications", icon: Bell },
              { id: "regional", label: "Regional Setup", icon: Globe },
              { id: "security", label: "Login & Security", icon: Shield },
            ] as const
          ).map((tab) => (
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

          {/* Spacer */}
          <div className="flex-1" />

          {/* Separator */}
          <div className="h-px bg-border/60 my-2" />

          {/* Logout button */}
          <button
            onClick={() => {
              logout();
              router.push("/");
              toast.success("You've been logged out successfully.");
            }}
            disabled={actionLoading}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-bold rounded-full transition-all text-left cursor-pointer text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 hover:text-rose-700 dark:hover:text-rose-300 disabled:opacity-50"
          >
            {actionLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <LogOut className="w-4 h-4" />
            )}
            {actionLoading ? "Signing out..." : "Sign Out"}
          </button>
        </div>

        {/* Right Content Cards */}
        <div className="md:col-span-2 space-y-6">
          {/* PROFILE CARD */}
          {activeTab === "profile" && (
            <div className="bg-card text-card-foreground border border-border/60 rounded-2xl shadow-[0_16px_40px_-12px_rgba(0,0,0,0.03)] dark:shadow-none overflow-hidden animate-in fade-in-50 duration-200">
              <div className="p-6 border-b border-border/60 bg-muted/30">
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-50">
                  Identity Profile Settings
                </h3>
                <p className="text-xs text-zinc-400 dark:text-zinc-500">
                  Update your avatar, name, and contact information.
                </p>
              </div>

              <div className="p-6 space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 tracking-tight block">
                      Full Name
                    </label>
                    <Input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full text-xs font-semibold rounded-full h-10 px-4"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 tracking-tight block">
                      Email Address
                    </label>
                    <Input
                      type="email"
                      value={userEmail}
                      disabled
                      className="w-full text-xs font-semibold rounded-full h-10 px-4 bg-muted/50 cursor-not-allowed opacity-60"
                    />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 tracking-tight block">
                      Phone Contact
                    </label>
                    <Input
                      type="text"
                      value={phoneNumber}
                      placeholder="+256 xxxxxxxxx"
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      className="w-full text-xs font-semibold rounded-full h-10 px-4"
                    />
                  </div>
                </div>
              </div>

              <div className="p-4 bg-muted/20 border-t border-border/60 flex justify-end gap-3">
                <button
                  onClick={handleSaveProfile}
                  disabled={saving}
                  className="px-5 h-9 bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900 hover:bg-primary dark:hover:bg-primary dark:hover:text-white text-xs font-bold rounded-full active:scale-95 transition-all cursor-pointer shadow-xs disabled:opacity-50"
                >
                  {saving ? (
                    <span className="flex items-center gap-1.5">
                      <Loader2 className="w-3 h-3 animate-spin" /> Saving...
                    </span>
                  ) : (
                    "Save Profile Changes"
                  )}
                </button>
              </div>
            </div>
          )}

          {/* REGIONAL CARD */}
          {activeTab === "regional" && (
            <div className="bg-card text-card-foreground border border-border/60 rounded-2xl shadow-[0_16px_40px_-12px_rgba(0,0,0,0.03)] dark:shadow-none overflow-hidden animate-in fade-in-50 duration-200">
              <div className="p-6 border-b border-border/60 bg-muted/30">
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-50">
                  Regional Setup & Preferences
                </h3>
                <p className="text-xs text-zinc-400 dark:text-zinc-500">
                  Configure currency, language, and delivery defaults.
                </p>
              </div>

              <div className="p-6 space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 tracking-tight block">
                      Primary Currency
                    </Label>
                    <Select value={currency} onValueChange={setCurrency}>
                      <SelectTrigger className="w-full text-xs font-semibold rounded-full px-4 h-10">
                        <SelectValue placeholder="Select currency" />
                      </SelectTrigger>
                      <SelectContent>
                        {CURRENCIES.map((curr) => (
                          <SelectItem
                            key={curr.value}
                            value={curr.value}
                            className="text-xs font-semibold"
                          >
                            {curr.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 tracking-tight block">
                      System Language
                    </Label>
                    <Select value={language} onValueChange={setLanguage}>
                      <SelectTrigger className="w-full text-xs font-semibold rounded-full px-4 h-10">
                        <SelectValue placeholder="Select language" />
                      </SelectTrigger>
                      <SelectContent>
                        {LANGUAGES.map((lang) => (
                          <SelectItem
                            key={lang.value}
                            value={lang.value}
                            className="text-xs font-semibold"
                          >
                            {lang.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 tracking-tight block">
                      Delivery District
                    </Label>
                    <Select
                      value={deliveryDistrict}
                      onValueChange={setDeliveryDistrict}
                    >
                      <SelectTrigger className="w-full text-xs font-semibold rounded-full px-4 h-10">
                        <SelectValue placeholder="Select district" />
                      </SelectTrigger>
                      <SelectContent>
                        {DELIVERY_DISTRICTS.map((district) => (
                          <SelectItem
                            key={district}
                            value={district}
                            className="text-xs font-semibold"
                          >
                            {district === "Central"
                              ? "Kampala Central"
                              : district}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="border-t border-border/60 pt-5 space-y-3">
                  <p className="text-[10px] font-bold tracking-wider text-zinc-400 dark:text-zinc-500 uppercase">
                    Mobile Money Payout Channel
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 tracking-tight block">
                        Mobile Money Network
                      </Label>
                      <Select
                        value={momoNetwork}
                        onValueChange={setMomoNetwork}
                      >
                        <SelectTrigger className="w-full text-xs font-semibold rounded-full px-4 h-10">
                          <SelectValue placeholder="Select network" />
                        </SelectTrigger>
                        <SelectContent>
                          {MOMO_NETWORKS.map((net) => (
                            <SelectItem
                              key={net.value}
                              value={net.value}
                              className="text-xs font-semibold"
                            >
                              {net.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 tracking-tight block">
                        MoMo Payment Number
                      </Label>
                      <Input
                        type="text"
                        value={momoNumber}
                        onChange={(e) => setMomoNumber(e.target.value)}
                        className="w-full text-xs font-semibold rounded-full h-10 px-4"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-muted/20 border-t border-border/60 flex justify-end gap-3">
                <button
                  onClick={handleSaveRegional}
                  disabled={saving}
                  className="px-5 h-9 bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900 hover:bg-primary dark:hover:bg-primary dark:hover:text-white text-xs font-bold rounded-full active:scale-95 transition-all cursor-pointer shadow-xs disabled:opacity-50"
                >
                  {saving ? (
                    <span className="flex items-center gap-1.5">
                      <Loader2 className="w-3 h-3 animate-spin" /> Saving...
                    </span>
                  ) : (
                    "Save Regional Rules"
                  )}
                </button>
              </div>
            </div>
          )}

          {/* NOTIFICATIONS CARD */}
          {activeTab === "notifications" && (
            <div className="bg-card text-card-foreground border border-border/60 rounded-2xl shadow-[0_16px_40px_-12px_rgba(0,0,0,0.03)] dark:shadow-none overflow-hidden animate-in fade-in-50 duration-200">
              <div className="p-6 border-b border-border/60 bg-muted/30">
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-50">
                  Alert Channels & Tracking
                </h3>
                <p className="text-xs text-zinc-400 dark:text-zinc-500">
                  Control real-time updates for orders, security, and
                  promotions.
                </p>
              </div>

              <div className="p-6 divide-y divide-border/60 space-y-4">
                {(
                  [
                    {
                      key: "orderAlertsEmail",
                      label: "Email Dispatch Routing",
                      desc: "Receive order summaries and automated receipts.",
                      value: settings.orderAlertsEmail,
                    },
                    {
                      key: "securityAlertsSMS",
                      label: "SMS Security Alerts",
                      desc: "Get text alerts for sensitive account changes.",
                      value: settings.securityAlertsSMS,
                    },
                    {
                      key: "marketingNewsletter",
                      label: "Campaign Flash Sales",
                      desc: "Notify me when price cuts or promotions activate.",
                      value: settings.marketingNewsletter,
                    },
                  ] as const
                ).map((item) => (
                  <div
                    key={item.key}
                    className="flex items-center justify-between py-4"
                  >
                    <div className="space-y-0.5 flex-1 pr-4">
                      <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                        {item.label}
                      </p>
                      <p className="text-[11px] text-zinc-400 dark:text-zinc-500">
                        {item.desc}
                      </p>
                    </div>
                    <button
                      onClick={() =>
                        handleToggleNotification(item.key, !item.value)
                      }
                      disabled={saving}
                      className={`w-10 h-5 rounded-full p-0.5 transition-all duration-200 ease-in-out cursor-pointer ${
                        item.value
                          ? "bg-primary flex justify-end"
                          : "bg-muted border border-border/60 flex justify-start"
                      }`}
                    >
                      <span className="w-4 h-4 rounded-full bg-white dark:bg-zinc-950 shadow-xs block" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SECURITY CARD */}
          {activeTab === "security" && (
            <div className="bg-card text-card-foreground border border-border/60 rounded-2xl shadow-[0_16px_40px_-12px_rgba(0,0,0,0.03)] dark:shadow-none overflow-hidden animate-in fade-in-50 duration-200">
              <div className="p-6 border-b border-border/60 bg-muted/30">
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-50">
                  Security & Credentials
                </h3>
                <p className="text-xs text-zinc-400 dark:text-zinc-500">
                  Manage authentication and account protection settings.
                </p>
              </div>

              <div className="p-6 space-y-4">
                <div className="flex items-center justify-between text-xs pb-4 border-b border-border/60">
                  <div className="flex-1 pr-4">
                    <p className="font-bold text-zinc-800 dark:text-zinc-200">
                      Two-Factor Authentication (2FA)
                    </p>
                    <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-0.5">
                      Secure your account with an additional verification step.
                    </p>
                  </div>
                  <span
                    className={`px-2.5 py-0.5 text-[10px] font-bold rounded-md border ${
                      settings.twoFactorEnabled
                        ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/60"
                        : "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border-amber-200 dark:border-amber-900/60"
                    }`}
                  >
                    {settings.twoFactorEnabled ? "Active" : "Inactive"}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs pt-2">
                  <div className="flex-1 pr-4">
                    <p className="font-bold text-zinc-800 dark:text-zinc-200">
                      Buyer Protection Protocol
                    </p>
                    <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-0.5">
                      Enforce safe delivery escrow across all orders.
                    </p>
                  </div>
                  <button
                    onClick={() =>
                      updateSettings({
                        buyerProtectionEnabled:
                          !settings.buyerProtectionEnabled,
                      })
                    }
                    disabled={saving}
                    className={`w-10 h-5 rounded-full p-0.5 transition-all duration-200 ease-in-out cursor-pointer ${
                      settings.buyerProtectionEnabled
                        ? "bg-primary flex justify-end"
                        : "bg-muted border border-border/60 flex justify-start"
                    }`}
                  >
                    <span className="w-4 h-4 rounded-full bg-white dark:bg-zinc-950 shadow-xs block" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Page component ───
export default function SettingsPage() {
  const { user, logout, actionLoading } = useAuth();
  const { settings, settingsLoading, settingsSaving, updateSettings } = useUserData();
  const router = useRouter();

  if (settingsLoading || !settings) {
    return (
      <div className="max-w-8xl mx-auto px-4 py-10 space-y-10">
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

  return (
    <SettingsFormContent
      key={JSON.stringify(settings)}
      settings={settings}
      user={user}
      saving={settingsSaving}
      updateSettings={updateSettings}
      logout={logout}
      actionLoading={actionLoading}
      router={router}
    />
  );
}