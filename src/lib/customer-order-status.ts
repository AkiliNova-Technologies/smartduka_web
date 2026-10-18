export type StatusTone = "success" | "danger" | "warning" | "info" | "neutral";

export function paymentSummary(status: string): { label: string; tone: StatusTone } {
  if (status === "COMPLETED" || status === "SUCCESSFUL") return { label: "Paid", tone: "success" };
  if (status === "PARTIALLY_PAID") return { label: "Partially paid", tone: "warning" };
  if (["FAILED", "REVERSED", "PAYMENT_EXCEPTION"].includes(status)) return { label: "Payment issue", tone: "danger" };
  return { label: "Awaiting payment", tone: "warning" };
}

export function fulfillmentSummary(subOrders: Array<{ status: string }>): { label: string; tone: StatusTone } {
  const states = subOrders.map(({ status }) => status);
  if (!states.length) return { label: "Fulfillment unavailable", tone: "neutral" };
  if (states.every((status) => status === "CANCELLED" || status === "REFUNDED")) return { label: "Cancelled", tone: "danger" };
  if (states.every((status) => status === "DELIVERED")) return { label: "Delivered", tone: "success" };
  if (states.some((status) => status === "DELIVERED") || (states.some((status) => status === "CANCELLED") && states.some((status) => status !== "CANCELLED"))) return { label: "Partially fulfilled", tone: "info" };
  if (states.some((status) => ["PROCESSING", "READY_FOR_PICKUP", "SHIPPED"].includes(status))) return { label: "In progress", tone: "info" };
  return { label: "Awaiting fulfillment", tone: "warning" };
}

export function subOrderFulfillmentLabel(status: string, method: "DELIVERY" | "PICKUP") {
  if (status === "READY_FOR_PICKUP") return "Ready for pickup";
  if (status === "SHIPPED") return "Shipped";
  if (status === "DELIVERED") return method === "PICKUP" ? "Collected" : "Delivered";
  if (status === "PROCESSING") return "Preparing";
  if (status === "CANCELLED" || status === "REFUNDED") return "Cancelled";
  return "Awaiting fulfillment";
}

/** Keeps historical fulfillment fields intact while avoiding repeated display text. */
export function uniqueFulfillmentText(...values: Array<string | null | undefined>) {
  const seen = new Set<string>();
  return values.flatMap((value) => {
    const text = value?.trim();
    if (!text) return [];
    const key = text.replace(/\s+/g, " ").toLocaleLowerCase("en-UG");
    if (seen.has(key)) return [];
    seen.add(key);
    return [text];
  });
}
