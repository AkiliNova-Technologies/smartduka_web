"use client";

import { useState } from "react";
import { Landmark, Loader2, Plus, ShieldCheck } from "lucide-react";
import { useVendorPayouts } from "@/hooks/use-vendor-payouts";
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
import type { VendorPayoutAccount } from "@/lib/vendor-payouts-client";

const providerLabel = (provider: VendorPayoutAccount["provider"]) =>
  provider === "MTN_MOBILE_MONEY" ? "MTN Mobile Money" : "Airtel Money";

export function PayoutSettingsTab() {
  const { accounts, loading, saving, error, add, setDefault, disable } =
    useVendorPayouts();
  const [showForm, setShowForm] = useState(false);
  const [provider, setProvider] =
    useState<VendorPayoutAccount["provider"]>("MTN_MOBILE_MONEY");
  const [accountHolderName, setAccountHolderName] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const active = accounts.find(
    (account) => account.isDefault && account.status === "ACTIVE",
  );
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (await add({ provider, accountHolderName, mobileNumber })) {
      setShowForm(false);
      setAccountHolderName("");
      setMobileNumber("");
    }
  };
  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-lg font-semibold">Payouts</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Choose where SmartDuka should send your shop&apos;s settlements.
        </p>
      </header>
      {error && (
        <p
          role="alert"
          className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {error}
        </p>
      )}
      {loading ? (
        <div className="h-40 animate-pulse rounded-2xl border bg-muted/40" />
      ) : active ? (
        <section className="rounded-2xl border bg-card p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex gap-3">
              <div className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
                <Landmark className="size-5" />
              </div>
              <div>
                <p className="font-medium">{providerLabel(active.provider)}</p>
                <p className="mt-2 text-sm">{active.accountHolderName}</p>
                <p className="text-sm text-muted-foreground">
                  {active.maskedReference}
                </p>
                <span className="mt-3 inline-flex rounded-full bg-emerald-500/10 px-2 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-300">
                  Active
                </span>
              </div>
            </div>
            <Button
              variant="outline"
              disabled={saving}
              onClick={() => setShowForm(true)}>
              Change payout details
            </Button>
          </div>
        </section>
      ) : (
        <section className="rounded-2xl border bg-card p-6 text-center">
          <Landmark className="mx-auto size-8 text-muted-foreground" />
          <h3 className="mt-3 font-medium">No payout method configured</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Add a payout destination to receive shop settlements.
          </p>
          <Button className="mt-4 rounded-full px-4 dark:text-white" onClick={() => setShowForm(true)} >
            <Plus /> Add payout method
          </Button>
        </section>
      )}
      {accounts.filter((account) => !account.isDefault).length > 0 && (
        <section className="rounded-2xl border bg-card p-5">
          <h3 className="font-medium">Previous payout methods</h3>
          <div className="mt-3 space-y-3">
            {accounts
              .filter((account) => !account.isDefault)
              .map((account) => (
                <div
                  key={account.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3 text-sm">
                  <div>
                    <p className="font-medium">
                      {providerLabel(account.provider)}
                    </p>
                    <p className="text-muted-foreground">
                      {account.accountHolderName} · {account.maskedReference}
                    </p>
                  </div>
                  {account.status !== "DISABLED" && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={saving}
                        onClick={() => void setDefault(account.id)}>
                        Make active
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={saving}
                        onClick={() => void disable(account.id)}>
                        Disable
                      </Button>
                    </div>
                  )}
                </div>
              ))}
          </div>
        </section>
      )}
      {showForm && (
        <section className="rounded-2xl border bg-card p-5">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 size-5 text-primary" />
            <div>
              <h3 className="font-medium">
                {active ? "Change payout details" : "Add payout method"}
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Enter the new destination. The number is stored securely and
                shown only in masked form.
              </p>
            </div>
          </div>
          <form className="mt-5 space-y-4" onSubmit={submit}>
            <div className="space-y-2">
              <Label htmlFor="payout-provider">Provider</Label>
              <Select
                value={provider}
                onValueChange={(value) =>
                  setProvider(value as VendorPayoutAccount["provider"])
                }>
                <SelectTrigger id="payout-provider" className="min-h-10 w-full rounded-full text-sm pl-4">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="p-2">
                  <SelectItem value="MTN_MOBILE_MONEY">
                    MTN Mobile Money
                  </SelectItem>
                  <SelectItem value="AIRTEL_MONEY">Airtel Money</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="payout-holder">Account holder name</Label>
              <Input
                id="payout-holder"
                value={accountHolderName}
                onChange={(event) => setAccountHolderName(event.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="payout-number">Mobile Money number</Label>
              <Input
                id="payout-number"
                inputMode="tel"
                placeholder="077… or +256 77…"
                value={mobileNumber}
                onChange={(event) => setMobileNumber(event.target.value)}
                required
              />
            </div>
            <div className="flex flex-wrap justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                className="rounded-full px-4 h-10"
                disabled={saving}
                onClick={() => setShowForm(false)}>
                Cancel
              </Button>
              <Button disabled={saving} className="rounded-full px-4 h-10">
                {saving && <Loader2 className="animate-spin" />}
                {active ? "Confirm new payout details" : "Save payout method"}
              </Button>
            </div>
          </form>
        </section>
      )}
    </div>
  );
}
