export type PaymentHealth =
  | "HEALTHY"
  | "RETRYING"
  | "CONFIRMATION_DELAYED"
  | "STUCK"
  | "NEEDS_REVIEW";

// Pending is never converted to failed solely because time has passed.
export const PAYMENT_HEALTH_THRESHOLDS = {
  delayedMinutes: 10,
  stuckHours: 24,
  reviewAttempts: 12,
} as const;

export function paymentHealth(
  input: {
    status: string;
    createdAt: Date;
    reconcileAttempts: number;
    lastReconcileError?: string | null;
  },
  now = new Date(),
): PaymentHealth | null {
  // A reversal is terminal but operationally unhealthy: it is never a
  // customer retry state and always belongs in the review queue.
  if (input.status === "REVERSED") return "NEEDS_REVIEW";
  if (input.status !== "PENDING") return null;
  if (input.reconcileAttempts >= PAYMENT_HEALTH_THRESHOLDS.reviewAttempts)
    return "NEEDS_REVIEW";
  const age = now.getTime() - input.createdAt.getTime();
  if (age >= PAYMENT_HEALTH_THRESHOLDS.stuckHours * 3_600_000) return "STUCK";
  if (age >= PAYMENT_HEALTH_THRESHOLDS.delayedMinutes * 60_000)
    return "CONFIRMATION_DELAYED";
  return input.reconcileAttempts > 0 || input.lastReconcileError
    ? "RETRYING"
    : "HEALTHY";
}
