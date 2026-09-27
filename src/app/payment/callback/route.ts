import { NextResponse } from "next/server";
import { parsePesapalNotification } from "@/lib/payments/pesapal/notification";
import { PesapalVerificationService } from "@/services/payments/pesapal-verification-service";

export const dynamic = "force-dynamic";

/** Pesapal's browser redirect. It verifies without a SmartDuka session, then exposes no order data. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const notification = parsePesapalNotification(Object.fromEntries(url.searchParams.entries()));
  if (notification.orderTrackingId && notification.notificationType === "CALLBACKURL") {
    try {
      await new PesapalVerificationService().verifyPesapalTransaction({
        orderTrackingId: notification.orderTrackingId,
        claimedMerchantReference: notification.merchantReference,
        source: "CALLBACK",
      });
    } catch {
      // The customer always gets a safe local destination; IPN retries reconciliation.
    }
  }
  return NextResponse.redirect(new URL("/orders", request.url));
}
