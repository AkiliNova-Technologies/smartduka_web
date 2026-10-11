import { PaymentProviderRegistry } from "@/lib/payments/payment-provider";
/** Fail closed until Airtel publishes the contracted callback authentication scheme. */
export async function POST() { if (!PaymentProviderRegistry.isEnabled("AIRTEL_MONEY")) return Response.json({ error: "Provider disabled." }, { status: 404 }); return Response.json({ error: "Airtel callback authentication is not configured." }, { status: 501 }); }
