import { NextResponse } from "next/server";
import { PaymentGateway, WebhookProcessStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma/client";
import { parsePesapalNotification, readPesapalPost, sanitizePesapalNotification } from "@/lib/payments/pesapal/notification";
import { isTransientPesapalError, PesapalVerificationService } from "@/services/payments/pesapal-verification-service";

function acknowledgement(notification: { orderTrackingId?: string; merchantReference?: string; notificationType?: string }, status: 200 | 500) {
  return NextResponse.json({
    orderNotificationType: notification.notificationType ?? "IPNCHANGE",
    orderTrackingId: notification.orderTrackingId ?? "",
    orderMerchantReference: notification.merchantReference ?? "",
    status,
  }, { status: status === 200 ? 200 : 503 });
}

/**
 * Pesapal API 3.0 POST IPN. The status field acknowledges processing (200) or asks
 * Pesapal to retry after a transient verification failure (500); request fields are
 * never payment authority.
 */
export async function POST(request: Request) {
  const payload = await readPesapalPost(request);
  const notification = parsePesapalNotification(payload ?? {});
  const audit = await prisma.paymentGatewayWebhookLog.create({
    data: {
      gateway: PaymentGateway.PESAPAL,
      trackingId: notification.orderTrackingId ?? "unknown",
      reference: notification.merchantReference ?? "unknown",
      eventType: notification.notificationType,
      payload: sanitizePesapalNotification(payload ?? {}),
      status: WebhookProcessStatus.UNPROCESSED,
    },
  });

  if (!notification.orderTrackingId || notification.notificationType !== "IPNCHANGE") {
    await prisma.paymentGatewayWebhookLog.update({ where: { id: audit.id }, data: { status: WebhookProcessStatus.FAILED, errorMessage: "Malformed or unsupported Pesapal IPN." } });
    return acknowledgement(notification, 200);
  }

  try {
    const result = await new PesapalVerificationService().verifyPesapalTransaction({
      orderTrackingId: notification.orderTrackingId,
      claimedMerchantReference: notification.merchantReference,
      source: "IPN",
    });
    await prisma.paymentGatewayWebhookLog.update({ where: { id: audit.id }, data: { status: WebhookProcessStatus.PROCESSED, errorMessage: result.outcome } });
    return acknowledgement(notification, 200);
  } catch (error) {
    const transient = isTransientPesapalError(error);
    await prisma.paymentGatewayWebhookLog.update({ where: { id: audit.id }, data: { status: WebhookProcessStatus.FAILED, errorMessage: transient ? "Transient provider verification failure." : "Provider verification rejected." } });
    return acknowledgement(notification, transient ? 500 : 200);
  }
}
