import { resolveAuthenticatedUser } from "@/lib/auth/session";
import { PaymentReconciliationService } from "@/services/payment-reconciliation";
export async function POST(request: Request) { const actor = await resolveAuthenticatedUser(request); if (actor?.email !== "cron@platform.infrastructure") return Response.json({ error: "Unauthorized" }, { status: 401 }); return Response.json({ data: await PaymentReconciliationService.scheduleDue() }); }
