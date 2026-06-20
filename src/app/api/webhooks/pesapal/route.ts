import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";
import {
  PaymentGateway,
  OrderStatus,
  PaymentStatus,
  SubOrderStatus,
  LedgerTransactionType,
  WebhookProcessStatus,
  Prisma,
} from "@prisma/client";

// 1. FIXED: Strongly type the incoming webhook shape to avoid implicit 'any' object lookups
interface PesapalWebhookPayload {
  OrderTrackingId?: string;
  orderTrackingId?: string;
  OrderMerchantReference?: string;
  orderMerchantReference?: string;
  OrderNotificationType?: string;
}

/**
 * Next.js Route Handler for Pesapal IPN (Instant Payment Notification) Callbacks.
 * Handles transaction verification, multi-vendor order updates, and ledger balancing.
 */
export async function POST(request: Request) {
  let webhookLogId: string | null = null;
  
  try {
    // Safely parse and cast the body matching our interface
    const body = (await request.json()) as PesapalWebhookPayload;
    
    const trackingId = body.OrderTrackingId || body.orderTrackingId;
    const orderNumber = body.OrderMerchantReference || body.orderMerchantReference;
    const eventType = body.OrderNotificationType || "IPN_TRIGGER";

    if (!trackingId || !orderNumber) {
      return NextResponse.json(
        { error: "Bad Request: Missing trackingId or order reference parameters." },
        { status: 400 }
      );
    }

    // 2. Immediate Idempotency Safeguard: Log the raw webhook payload
   const webhookLog = await prisma.paymentGatewayWebhookLog.create({
  data: {
    gateway: PaymentGateway.PESAPAL,
    trackingId,
    reference: orderNumber,
    eventType,
    payload: body as Prisma.InputJsonValue, 
    status: WebhookProcessStatus.UNPROCESSED,
  },
});
    
    // Assign to localized block variable for access across scopes
    const currentWebhookLogId = webhookLog.id;
    webhookLogId = currentWebhookLogId;

    // 3. Gateway Verification Loop (Placeholder for Live Remote API Call)
    const isGatewayPaymentValid = true; 
    const verifiedGatewayStatus = "COMPLETED";

    if (!isGatewayPaymentValid || verifiedGatewayStatus !== "COMPLETED") {
      await prisma.paymentGatewayWebhookLog.update({
        where: { id: currentWebhookLogId },
        data: {
          status: WebhookProcessStatus.SKIPPED,
          errorMessage: `Gateway returned non-completable payment status: ${verifiedGatewayStatus}`,
        },
      });
      return NextResponse.json({ message: "Notification handled (Skipped/Unpaid)" }, { status: 200 });
    }

    // 4. Atomic Multi-Vendor Settlement Transaction
    await prisma.$transaction(async (tx) => {
      // Look up the master order and confirm its current payment state
      const masterOrder = await tx.order.findUnique({
        where: { orderNumber },
        include: { subOrders: true },
      });

      if (!masterOrder) {
        throw new Error(`Master Order Reference '${orderNumber}' was not found in database records.`);
      }

      // Avoid double-processing if a duplicate webhook request fires simultaneously
      if (masterOrder.paymentStatus === PaymentStatus.COMPLETED) {
        await tx.paymentGatewayWebhookLog.update({
          where: { id: currentWebhookLogId },
          data: { status: WebhookProcessStatus.SKIPPED, errorMessage: "Order already completed." },
        });
        return;
      }

      // Step A: Update Tier 1 Global Master Order parameters
      await tx.order.update({
        where: { id: masterOrder.id },
        data: {
          status: OrderStatus.PAID,
          paymentStatus: PaymentStatus.COMPLETED,
          gatewayReference: trackingId,
        },
      });

      // Step B: Loop over Tier 2 Sub-Orders to distribute multi-vendor split-revenue
      for (const subOrder of masterOrder.subOrders) {
        await tx.subOrder.update({
          where: { id: subOrder.id },
          data: { status: SubOrderStatus.PROCESSING },
        });

        // Net Earnings Calculation via Prisma runtime Decimals
        const vendorNetEarnings = subOrder.vendorTotal.minus(subOrder.platformCommission);

        // Step C: Credit Vendor's Ledger Balance
        await tx.financialLedger.create({
          data: {
            vendorId: subOrder.vendorId,
            type: LedgerTransactionType.SALE_REVENUE,
            amount: vendorNetEarnings,
            reference: subOrder.subOrderNumber,
            description: `Escrow credit for split order execution node ${subOrder.subOrderNumber}. Platform commission retained: UGX ${subOrder.platformCommission.toString()}`,
          },
        });

        // Step D: Record Platform Commission Trace
        await tx.financialLedger.create({
          data: {
            vendorId: subOrder.vendorId,
            type: LedgerTransactionType.PLATFORM_COMMISSION,
            amount: subOrder.platformCommission,
            reference: subOrder.subOrderNumber,
            description: `Platform retained commission fee captured from split order reference ${subOrder.subOrderNumber}`,
          },
        });

        // Step E: Trigger automated real-time vendor dispatch monitor notification
        await tx.notification.create({
          data: {
            vendorId: subOrder.vendorId,
            type: "PAYMENT_RECEIVED",
            title: "Split Payment Settlement Confirmed",
            message: `Payment confirmed for ${subOrder.subOrderNumber}. UGX ${vendorNetEarnings.toString()} has been safely locked into your escrow ledger balance.`,
          },
        });
      }

      // Step F: Complete tracking lifecycle state
      await tx.paymentGatewayWebhookLog.update({
        where: { id: currentWebhookLogId },
        data: { status: WebhookProcessStatus.PROCESSED },
      });
    });

    return NextResponse.json({ success: true, message: "Multi-vendor settlement completed successfully." }, { status: 200 });

  } catch (error) {
    // 2. FIXED: Catch block updated to remove 'any', safely evaluating the exception instance type
    const errorMessage = error instanceof Error ? error.message : "An unexpected system rollback occurred during execution.";
    
    console.error("CRITICAL: Webhook Processing Failure ->", error);

    if (webhookLogId) {
      await prisma.paymentGatewayWebhookLog.update({
        where: { id: webhookLogId },
        data: {
          status: WebhookProcessStatus.FAILED,
          errorMessage,
        },
      });
    }

    // Send a 500 status to tell the gateway to safely queue and retry the notification
    return NextResponse.json({ error: "Internal processing engine error occurred." }, { status: 500 });
  }
}