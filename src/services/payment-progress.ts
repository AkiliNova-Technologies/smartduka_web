/** Derived customer-facing parent progress; individual PaymentIntents remain authoritative. */
export function deriveParentPaymentProgress(
  subOrders: Array<{ paymentIntents: Array<{ status: string }> }>,
  fallback = "PENDING",
) {
  // This is deliberately derived from seller-scoped intents. A single
  // reversal is a parent operational exception even if every other seller
  // was paid successfully; it must never be presented as cleanly paid.
  if (
    subOrders.some((subOrder) =>
      subOrder.paymentIntents.some((intent) => intent.status === "REVERSED"),
    )
  )
    return "PAYMENT_EXCEPTION";
  const successful = subOrders.filter((subOrder) =>
    subOrder.paymentIntents.some((intent) => intent.status === "SUCCESSFUL"),
  ).length;
  if (subOrders.length > 0 && successful === subOrders.length)
    return "COMPLETED";
  if (successful > 0) return "PARTIALLY_PAID";
  return fallback;
}
