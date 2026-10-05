import { redirect } from "next/navigation";

/** Legacy moderation route; marketplace reports are the canonical case queue. */
export default function LegacyComplaintsPage() {
  redirect("/admin/reports");
}
