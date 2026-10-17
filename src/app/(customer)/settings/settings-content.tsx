"use client";
import {
  Bell,
  LogOut,
  MapPin,
  Palette,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useUserData } from "@/providers/UserDataProvider";
import { PageContainer } from "@/components/marketplace/page-container";
import { PageHeader } from "@/components/marketplace/page-header";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { AppearanceSettings } from "@/components/settings/AppearanceSettings";
import Link from "next/link";
import { PushNotificationSettings } from "@/components/settings/PushNotificationSettings";

type SettingsTab = "profile" | "appearance" | "notifications";
const SETTINGS_TABS: { id: SettingsTab; label: string; icon: LucideIcon }[] = [
  { id: "profile", label: "Profile", icon: UserRound },
  { id: "appearance", label: "Appearance", icon: Palette },
  { id: "notifications", label: "Notifications", icon: Bell },
];

export default function SettingsContent() {
  const { settings, settingsLoading, settingsSaving, updateSettings } =
    useUserData();
  const { user, logout, actionLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedTab = searchParams.get("tab");
  const activeTab: SettingsTab = SETTINGS_TABS.some(
    (tab) => tab.id === requestedTab,
  )
    ? (requestedTab as SettingsTab)
    : "profile";
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [deliveryDistrict, setDeliveryDistrict] = useState("");
  const [savedProfile, setSavedProfile] = useState({ fullName: "", phone: "" });
  const [savedDistrict, setSavedDistrict] = useState("");
  const profileIdentity = useRef<string | null>(null);
  const [errors, setErrors] = useState<{ fullName?: string; phone?: string }>(
    {},
  );
  useEffect(() => {
    if (requestedTab && !SETTINGS_TABS.some((tab) => tab.id === requestedTab)) {
      router.replace("/settings", { scroll: false });
    }
  }, [requestedTab, router]);
  useEffect(() => {
    if (!settings.id || profileIdentity.current === settings.userId) return;
    const nextName = settings.fullName || user?.displayName || "";
    const nextPhone = settings.phoneNumber || user?.phoneNumber || "";
    const nextDistrict = settings.deliveryDistrict || "";
    setFullName(nextName);
    setPhone(nextPhone);
    setDeliveryDistrict(nextDistrict);
    setSavedProfile({ fullName: nextName, phone: nextPhone });
    setSavedDistrict(nextDistrict);
    setErrors({});
    profileIdentity.current = settings.userId;
  }, [
    settings.deliveryDistrict,
    settings.fullName,
    settings.id,
    settings.phoneNumber,
    settings.userId,
    user?.displayName,
    user?.phoneNumber,
  ]);
  if (settingsLoading)
    return (
      <PageContainer className="py-8">
        <Skeleton className="h-20" />
        <Skeleton className="mt-6 h-72" />
      </PageContainer>
    );
  const normalizedProfile = { fullName: fullName.trim(), phone: phone.trim() };
  const profileDirty =
    normalizedProfile.fullName !== savedProfile.fullName ||
    normalizedProfile.phone !== savedProfile.phone;
  const districtDirty = deliveryDistrict.trim() !== savedDistrict;
  const save = async () => {
    const next: { fullName?: string; phone?: string } = {};
    if (!normalizedProfile.fullName) next.fullName = "Enter your name.";
    if (
      normalizedProfile.phone &&
      !/^(?:07\d{8}|\+2567\d{8}|2567\d{8})$/.test(
        normalizedProfile.phone.replace(/[\s()-]/g, ""),
      )
    ) {
      next.phone = "Enter a valid Ugandan phone number.";
    }
    if (Object.keys(next).length) {
      setErrors(next);
      return;
    }
    setErrors({});
    const saved = await updateSettings({
      fullName: normalizedProfile.fullName,
      phoneNumber: normalizedProfile.phone || null,
    });
    if (saved) {
      setFullName(normalizedProfile.fullName);
      setPhone(normalizedProfile.phone);
      setSavedProfile(normalizedProfile);
    }
  };
  const saveDistrict = async () => {
    const district = deliveryDistrict.trim();
    const saved = await updateSettings({ deliveryDistrict: district || null });
    if (saved) {
      setDeliveryDistrict(district);
      setSavedDistrict(district);
    }
  };
  const displayName =
    savedProfile.fullName ||
    user?.displayName ||
    user?.email?.split("@")[0] ||
    "Customer";
  const initials = displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
  return (
    <PageContainer className="max-w-7xl w-full py-8 pb-24 sm:py-10">
      <PageHeader
        title="Settings"
        description="Manage your account, notifications, and personal appearance."
      />
      <div className="mt-8 grid gap-8 md:grid-cols-3">
        <nav className="min-w-0 md:col-span-1" aria-label="Customer settings">
          <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Configurations
          </p>
          <div
            className="flex gap-1 overflow-x-auto pb-1 md:block md:space-y-1"
            role="tablist"
            aria-orientation="vertical">
            {SETTINGS_TABS.map((tab) => {
              const Icon = tab.icon;
              const selected = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  id={`settings-tab-${tab.id}`}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  aria-controls={`settings-panel-${tab.id}`}
                  onClick={() =>
                    router.push(
                      tab.id === "profile"
                        ? "/settings"
                        : `/settings?tab=${tab.id}`,
                      { scroll: false },
                    )
                  }
                  className={`flex shrink-0 items-center gap-3 rounded-full px-4 py-2.5 text-left text-xs font-bold transition-all md:w-full ${selected ? "bg-primary text-primary-foreground shadow-xs" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}>
                  <Icon className="size-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </nav>
        <div className="min-w-0 md:col-span-2">
          {activeTab === "profile" && (
            <section
              id="settings-panel-profile"
              role="tabpanel"
              aria-labelledby="settings-tab-profile">
              <SectionTitle
                icon={UserRound}
                title="Profile"
                description="Your contact details are used for order and delivery updates."
              />
              <Card className="mt-4 overflow-hidden">
                <CardContent className="flex items-center gap-4">
                  <Avatar
                    className="size-14"
                    aria-label={`${displayName}'s avatar`}>
                    {settings.avatarUrl && (
                      <AvatarImage src={settings.avatarUrl} alt="" />
                    )}
                    <AvatarFallback className="bg-primary/10 font-semibold text-primary">
                      {initials || "CU"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-primary">
                      Customer account
                    </p>
                    <p className="mt-0.5 truncate text-base font-semibold">
                      {displayName}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Manage the contact details used across your Mwezora
                      account.
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="mt-4">
                <CardHeader>
                  <CardTitle>Personal information</CardTitle>
                  <CardDescription>
                    Keep your contact details up to date.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-5 sm:grid-cols-2">
                    <Field
                      id="full-name"
                      label="Full name"
                      value={fullName}
                      autoComplete="name"
                      placeholder="e.g. Albert Watbin"
                      error={errors.fullName}
                      description="Used on orders and delivery updates."
                      onChange={(v) => {
                        setFullName(v);
                        setErrors((e) => ({ ...e, fullName: undefined }));
                      }}
                    />
                    <div>
                      <Label htmlFor="email-address">Email address</Label>
                      <Input
                        id="email-address"
                        type="email"
                        value={user?.email || ""}
                        readOnly
                        aria-readonly="true"
                        className="mt-2 h-11 pl-4 bg-muted/50 rounded-full"
                      />
                      <p className="mt-1.5 text-xs text-muted-foreground">
                        Used for sign-in and verified account communication.
                      </p>
                    </div>
                    <Field
                      id="phone-number"
                      className="sm:col-span-2"
                      label="Phone number"
                      value={phone}
                      type="tel"
                      autoComplete="tel"
                      placeholder="e.g. 0772 123 456"
                      error={errors.phone}
                      description="Use a Ugandan number such as 0772 123 456."
                      onChange={(v) => {
                        setPhone(v);
                        setErrors((e) => ({ ...e, phone: undefined }));
                      }}
                    />
                  </div>
                </CardContent>
                <div className="flex justify-end border-t bg-muted/20 px-5 pt-4 sm:px-6">
                  <Button
                    type="button"
                    className="h-10 w-full rounded-full sm:w-auto"
                    onClick={() => void save()}
                    disabled={!profileDirty || settingsSaving}>
                    {settingsSaving ? "Saving…" : "Save changes"}
                  </Button>
                </div>
              </Card>
              <section className="mt-8">
                <SectionTitle
                  icon={MapPin}
                  title="Delivery preferences"
                  description="Manage your saved delivery location."
                />
                <Card className="mt-4">
                  <CardContent>
                    <Label htmlFor="delivery-district">Delivery district</Label>
                    <Input
                      id="delivery-district"
                      value={deliveryDistrict}
                      onChange={(event) =>
                        setDeliveryDistrict(event.target.value)
                      }
                      placeholder="e.g. Kampala"
                      className="mt-3 h-11 rounded-full"
                    />
                    <p className="mt-1.5 text-xs text-muted-foreground">
                      Saved as the default district when delivery is available.
                    </p>
                    <div className="mt-4 flex justify-end">
                      <Button
                        type="button"
                        variant="outline"
                        className="h-10 w-full rounded-full sm:w-auto"
                        onClick={() => void saveDistrict()}
                        disabled={!districtDirty || settingsSaving}>
                        {settingsSaving ? "Saving…" : "Save delivery location"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </section>
              <section className="mt-8">
                <SectionTitle
                  icon={LogOut}
                  title="Account actions"
                  description="Manage your current account session."
                />
                <Card className="mt-4">
                  <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-medium">Sign out of Mwezora</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        You’ll need to sign in again to access your account.
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      className="h-10 w-full rounded-full sm:w-auto px-6"
                      onClick={async () => {
                        await logout();
                        router.replace("/");
                      }}
                      disabled={actionLoading}>
                      <LogOut className="size-4" />
                      {actionLoading ? "Signing out…" : "Sign out"}
                    </Button>
                  </CardContent>
                </Card>
              </section>
              <section className="mt-8 border-t pt-5" aria-label="Legal links">
                <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground">
                  <Link
                    href="/terms"
                    className="hover:text-foreground hover:underline">
                    Terms & Conditions
                  </Link>
                  <Link
                    href="/privacy-policy"
                    className="hover:text-foreground hover:underline">
                    Privacy Policy
                  </Link>
                  <Link
                    href="/cookie-policy"
                    className="hover:text-foreground hover:underline">
                    Cookie Policy
                  </Link>
                </div>
              </section>
            </section>
          )}
          {activeTab === "notifications" && (
            <section
              id="settings-panel-notifications"
              role="tabpanel"
              aria-labelledby="settings-tab-notifications">
              <SectionTitle
                icon={Bell}
                title="Notifications"
                description="Choose the updates you want to receive."
              />
              <Card className="mt-4">
                <CardHeader>
                  <CardTitle>Notification preferences</CardTitle>
                  <CardDescription>
                    Choose which optional updates appear in your Mwezora
                    notification center.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Essential notifications
                    </p>
                    <div className="mt-3 space-y-3">
                      <EssentialPreference
                        icon={ShoppingBag}
                        title="Orders and payments"
                        description="Important updates about purchases, payments, delivery, and returns."
                      />
                      <EssentialPreference
                        icon={ShieldCheck}
                        title="Account and platform updates"
                        description="Important account, service, and operational announcements for your account."
                      />
                    </div>
                  </div>
                  <Separator />
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Optional notifications
                    </p>
                    <div className="mt-3 space-y-1">
                      <OptionalPreference
                        id="promotional-notifications"
                        icon={Sparkles}
                        title="Offers and promotions"
                        description="Discover marketplace offers and campaigns in Mwezora."
                        checked={settings.promotionalInAppNotifications}
                        disabled={settingsSaving}
                        onCheckedChange={(promotionalInAppNotifications) =>
                          void updateSettings({ promotionalInAppNotifications })
                        }
                      />
                      <OptionalPreference
                        id="shopping-recommendations"
                        icon={Sparkles}
                        title="Shopping recommendations"
                        description={
                          settings.promotionalInAppNotifications
                            ? "Receive eligible product and shop discovery campaigns in Mwezora."
                            : "Enable offers and promotions first. Recommendations remain off until then."
                        }
                        checked={settings.shoppingRecommendations}
                        disabled={
                          settingsSaving ||
                          !settings.promotionalInAppNotifications
                        }
                        onCheckedChange={(shoppingRecommendations) =>
                          void updateSettings({ shoppingRecommendations })
                        }
                      />
                    </div>
                    {settingsSaving && (
                      <p
                        className="mt-3 text-xs text-muted-foreground"
                        role="status">
                        Saving notification preferences…
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
              <PushNotificationSettings />
            </section>
          )}
          {activeTab === "appearance" && (
            <section
              id="settings-panel-appearance"
              role="tabpanel"
              aria-labelledby="settings-tab-appearance">
              <SectionTitle
                icon={Palette}
                title="Appearance"
                description="Choose how Mwezora looks. Your choices follow you when you sign in."
              />
              <AppearanceSettings />
            </section>
          )}
        </div>
      </div>
    </PageContainer>
  );
}
function EssentialPreference({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-lg bg-muted/45 p-3">
      <Icon className="mt-0.5 size-4 shrink-0 text-primary" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{title}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
      </div>
      <Badge variant="secondary">Always on</Badge>
    </div>
  );
}
function OptionalPreference({
  id,
  icon: Icon,
  title,
  description,
  checked,
  disabled,
  onCheckedChange,
}: {
  id: string;
  icon: LucideIcon;
  title: string;
  description: string;
  checked: boolean;
  disabled: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex min-h-18 items-center gap-3 rounded-lg p-3 hover:bg-muted/40">
      <Icon className="size-4 shrink-0 text-primary" />
      <label htmlFor={id} className="min-w-0 flex-1 cursor-pointer">
        <span className="block text-sm font-medium">{title}</span>
        <span className="mt-0.5 block text-xs text-muted-foreground">
          {description}
        </span>
      </label>
      <Switch
        id={id}
        aria-label={title}
        checked={checked}
        disabled={disabled}
        onCheckedChange={onCheckedChange}
      />
    </div>
  );
}
function SectionTitle({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof UserRound;
  title: string;
  description: string;
}) {
  return (
    <div className="flex gap-3">
      <Icon className="mt-0.5 size-5 text-primary" />
      <div>
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}
function Field({
  id,
  label,
  value,
  placeholder,
  error,
  description,
  className,
  type = "text",
  autoComplete,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  placeholder: string;
  error?: string;
  description: string;
  className?: string;
  type?: "text" | "tel";
  autoComplete?: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className={className}>
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type={type}
        autoComplete={autoComplete}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="mt-2 h-11 rounded-full pl-4"
        aria-invalid={Boolean(error)}
        aria-describedby={`${id}-${error ? "error" : "description"}`}
      />
      {error ? (
        <p
          id={`${id}-error`}
          role="alert"
          className="mt-1.5 text-xs text-destructive">
          {error}
        </p>
      ) : (
        <p
          id={`${id}-description`}
          className="mt-1.5 text-xs text-muted-foreground">
          {description}
        </p>
      )}
    </div>
  );
}
