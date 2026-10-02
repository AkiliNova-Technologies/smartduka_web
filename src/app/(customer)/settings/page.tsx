"use client";
import { Bell, LogOut, Settings, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useUserData } from "@/providers/UserDataProvider";
import { PageContainer } from "@/components/marketplace/page-container";
import { PageHeader } from "@/components/marketplace/page-header";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useTheme } from "@/hooks/use-theme";

export default function SettingsPage() {
  const { settings, settingsLoading, settingsSaving, updateSettings } =
    useUserData();
  const { user, logout, actionLoading } = useAuth();
  const router = useRouter();
  const { theme, setTheme, mounted } = useTheme();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [errors, setErrors] = useState<{ fullName?: string; phone?: string }>(
    {},
  );
  if (settingsLoading)
    return (
      <PageContainer className="py-8">
        <Skeleton className="h-20" />
        <Skeleton className="mt-6 h-72" />
      </PageContainer>
    );
  const name = fullName || settings.fullName || user?.displayName || "";
  const phoneValue = phone || settings.phoneNumber || user?.phoneNumber || "";
  const save = () => {
    const next: { fullName?: string; phone?: string } = {};
    if (!name.trim()) next.fullName = "Enter your name.";
    if (next.fullName) {
      setErrors(next);
      return;
    }
    setErrors({});
    updateSettings({
      fullName: name.trim(),
      phoneNumber: phoneValue.trim() || null,
    });
  };
  return (
    <PageContainer className="max-w-5xl py-6 pb-24 sm:py-8">
      <PageHeader
        title="Settings"
        description="Choose how SmartDuka works for you."
      />
      <div className="mt-7 space-y-8">
        <section>
          <SectionTitle
            icon={UserRound}
            title="Profile"
            description="Your contact details are used for order and delivery updates."
          />
          <div className="mt-4 grid gap-4 rounded-xl border bg-card p-5 sm:grid-cols-2">
            <Field
              label="Full name"
              value={name}
              placeholder="e.g. Albert Watbin"
              error={errors.fullName}
              onChange={(v) => {
                setFullName(v);
                setErrors((e) => ({ ...e, fullName: undefined }));
              }}
            />
            <div>
              <Label>Email</Label>
              <Input value={user?.email || ""} disabled className="mt-2" />
              <p className="mt-1 text-xs text-muted-foreground">
                Used for sign-in and account communication.
              </p>
            </div>
            <Field
              label="Phone number"
              value={phoneValue}
              placeholder="e.g. 0772 123 456"
              error={errors.phone}
              onChange={(v) => {
                setPhone(v);
                setErrors((e) => ({ ...e, phone: undefined }));
              }}
            />
            <div className="flex items-end">
              <button
                onClick={save}
                disabled={settingsSaving}
                className="h-11 rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-50 dark:text-white">
                {settingsSaving ? "Saving…" : "Save changes"}
              </button>
            </div>
          </div>
        </section>
        <section>
          <SectionTitle
            icon={Bell}
            title="Notifications"
            description="Choose the updates you want to receive."
          />
          <div className="mt-4 divide-y rounded-xl border bg-card">
            {[
              [
                "orderAlertsEmail",
                "Order updates",
                "Receive order summaries and receipts.",
              ],
              [
                "securityAlertsSMS",
                "Security alerts",
                "Get alerts for sensitive account changes.",
              ],
              [
                "marketingNewsletter",
                "Offers and updates",
                "Hear about marketplace promotions.",
              ],
            ].map(([key, label, desc]) => {
              const value = settings[key as keyof typeof settings] as boolean;
              return (
                <label
                  key={key}
                  className="flex min-h-16 items-center justify-between gap-4 px-5">
                  <span>
                    <span className="block text-sm font-medium">{label}</span>
                    <span className="text-xs text-muted-foreground">
                      {desc}
                    </span>
                  </span>
                  <Checkbox
                    aria-label={label}
                    checked={value}
                    onCheckedChange={(checked) =>
                      updateSettings({ [key]: checked === true })
                    }
                  />
                </label>
              );
            })}
          </div>
        </section>
        <section>
          <SectionTitle
            icon={Settings}
            title="Preferences"
            description="Your saved defaults for the marketplace."
          />
          <div className="mt-4 rounded-xl border bg-card p-5 text-sm">
            <p className="font-medium">Delivery district</p>
            <p className="mt-1 text-muted-foreground">
              {settings.deliveryDistrict || "No delivery district saved."}
            </p>
            <p className="mt-4 text-xs text-muted-foreground">
              Currency and language preferences are kept with your account.
              Payment and payout settings are managed separately and are not
              customer settings.
            </p>
          </div>
        </section>
        <section>
          <SectionTitle
            icon={Settings}
            title="Appearance"
            description="Choose how SmartDuka looks on this device."
          />
          <div className="mt-4 inline-grid grid-cols-2 rounded-full border bg-card p-1">
            <button
              aria-pressed={mounted && theme === "light"}
              onClick={() => setTheme("light")}
              className={`h-10 rounded-full px-5 text-sm font-medium ${mounted && theme === "light" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>
              Light
            </button>
            <button
              aria-pressed={mounted && theme === "dark"}
              onClick={() => setTheme("dark")}
              className={`h-10 rounded-full px-5 text-sm font-medium ${mounted && theme === "dark" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>
              Dark
            </button>
          </div>
        </section>
        <section className="border-t pt-6">
          <button
            onClick={async () => {
              await logout();
              router.replace("/");
            }}
            disabled={actionLoading}
            className="inline-flex h-11 items-center gap-2 rounded-lg px-3 text-sm font-medium text-muted-foreground hover:bg-muted">
            <LogOut className="size-4" />
            {actionLoading ? "Signing out…" : "Sign out"}
          </button>
        </section>
      </div>
    </PageContainer>
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
  label,
  value,
  placeholder,
  error,
  onChange,
}: {
  label: string;
  value: string;
  placeholder: string;
  error?: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <Label>{label}</Label>
      <Input
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="mt-2"
        aria-invalid={Boolean(error)}
      />
      {error ? (
        <p className="mt-1 text-xs text-destructive">{error}</p>
      ) : (
        <p className="mt-1 text-xs text-muted-foreground">
          Used for order and delivery updates.
        </p>
      )}
    </div>
  );
}
