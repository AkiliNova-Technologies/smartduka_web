import { redirect } from "next/navigation";

export default function VendorPayoutSettingsRedirect() {
  redirect("/vendor/settings?tab=payouts");
}
