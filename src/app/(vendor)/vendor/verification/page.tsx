import { redirect } from "next/navigation";

// This legacy URL only redirects to the canonical verification page, so it has
// no segment UI for Next.js to validate as an instant navigation target.
export const instant = false;

export default function VendorVerificationAliasPage() {
  redirect("/vendor/settings/verification");
}
