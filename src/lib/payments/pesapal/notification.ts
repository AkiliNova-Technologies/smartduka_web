export type PesapalNotification = {
  orderTrackingId?: string;
  merchantReference?: string;
  notificationType?: string;
};

function asText(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, 191) : undefined;
}

export function parsePesapalNotification(value: Record<string, unknown>): PesapalNotification {
  return {
    orderTrackingId: asText(value.OrderTrackingId),
    merchantReference: asText(value.OrderMerchantReference),
    notificationType: asText(value.OrderNotificationType)?.toUpperCase(),
  };
}

export function sanitizePesapalNotification(value: Record<string, unknown>) {
  const notification = parsePesapalNotification(value);
  return {
    ...(notification.orderTrackingId ? { OrderTrackingId: notification.orderTrackingId } : {}),
    ...(notification.merchantReference ? { OrderMerchantReference: notification.merchantReference } : {}),
    ...(notification.notificationType ? { OrderNotificationType: notification.notificationType } : {}),
  };
}

export async function readPesapalPost(request: Request): Promise<Record<string, unknown> | null> {
  const contentType = request.headers.get("content-type")?.toLowerCase() ?? "";
  try {
    if (contentType.includes("application/json")) {
      const body: unknown = await request.json();
      return body && typeof body === "object" && !Array.isArray(body) ? body as Record<string, unknown> : null;
    }
    const form = await request.formData();
    return Object.fromEntries(form.entries().map(([key, value]) => [key, typeof value === "string" ? value : undefined]));
  } catch {
    return null;
  }
}
