import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { transactionalPushContent } from "@/services/notifications";

const read = (file: string) => fs.readFileSync(path.join(process.cwd(), file), "utf8");

describe("P3B transactional web push", () => {
  it("uses concise lock-screen-safe copy without changing in-app notification text", () => {
    expect(transactionalPushContent("ORDER_RECEIVED", "Order SO-123 requires fulfilment.", "Customer address: private")).toEqual({
      title: "New order received",
      message: "You have a new order waiting for your review.",
    });
    expect(transactionalPushContent("ORDER_DISPATCHED", "Order dispatched", "Order SO-123 is on the way.")).toEqual({
      title: "Your order is on its way",
      message: "Your order has been dispatched.",
    });
    expect(transactionalPushContent("VERIFICATION_APPROVED", "Approved", "Documents accepted")).toEqual({
      title: "Your verification is approved",
      message: "Your shop verification has been approved.",
    });
    expect(transactionalPushContent("PAYMENT_FAILED", "Payment failed", "Provider detail")).toBeNull();
  });

  it("enqueues the existing notification idempotently within its transaction", () => {
    const service = read("src/services/notifications.ts");
    const outbox = read("src/services/push-delivery-outbox.ts");
    expect(service).toContain("prisma.$transaction((tx) => this.create(input, tx))");
    expect(service).toContain("db.notification.upsert");
    expect(service).toContain("PushDeliveryOutboxService.enqueueTransactional");
    expect(outbox).toContain("where: { notificationId: input.notificationId }");
    expect(outbox).toContain("kind: PushDeliveryKind.TRANSACTIONAL");
  });

  it("reuses authoritative order, vendor-team, and verification producers", () => {
    const orders = read("src/services/order.ts");
    const refunds = read("src/services/returns-refunds.ts");
    const verification = read("src/services/shop-verifications.ts");
    const notifications = read("src/services/notifications.ts");
    expect(orders).toContain('event: "ORDER_RECEIVED"');
    expect(orders).toContain("NotificationService.createForVendorOrder");
    expect(orders).toContain("SUB_ORDER_ALLOWED_TRANSITIONS");
    expect(refunds).toContain('event: "ORDER_CANCELLED"');
    expect(verification).toContain('event: "VERIFICATION_SUBMITTED"');
    expect(verification).toContain('event: eventFor(target, application.status)');
    expect(notifications).toContain('hasPermission({ vendorRole: user.vendorRole }, "vendor:view_orders")');
  });

  it("queues payment confirmation only after the authoritative successful transition", () => {
    const payment = read("src/services/payment-reconciliation.ts");
    const successful = payment.slice(payment.indexOf('if (event.status === "SUCCESSFUL")'), payment.indexOf('if (event.status === "REVERSED")'));
    expect(successful).toContain("NotificationService.create");
    expect(successful).toContain('event: "PAYMENT_CONFIRMED"');
    expect(successful).not.toContain("tx.notification.createMany");
    expect(payment).toContain('if (event.status === "SUCCESSFUL")');
  });

  it("uses stable opaque tags and preserves internal destination validation", () => {
    const outbox = read("src/services/push-delivery-outbox.ts");
    const worker = read("public/sw.js");
    expect(outbox).toContain("createHash(\"sha256\").update(job.notificationId)");
    expect(outbox).toContain("mwezora:transactional:");
    expect(outbox).toContain("status === 404 || status === 410");
    expect(worker).toContain("mwezora:transactional:[a-f0-9]{24}");
    expect(worker).toContain("safeInternalPath");
  });
});
