import { PaymentGateway, PaymentIntentStatus } from "@prisma/client";

/**
 * The seller may only begin or continue fulfilment for a direct MTN purchase
 * once the payment recorded for that seller's suborder is successful.  This is
 * deliberately based on the suborder's intents rather than parent payment
 * progress: another seller's payment must neither unlock nor block it.
 */
export function canFulfillSubOrder(input: {
  paymentGateway: PaymentGateway;
  paymentIntentStatuses: PaymentIntentStatus[];
}): boolean {
  // Cash-on-delivery has its own settlement lifecycle.  MTN is the only
  // electronic direct-payment rail enabled in this qualification phase.
  if (input.paymentGateway !== PaymentGateway.MTN_MOMO) return true;

  return input.paymentIntentStatuses.includes(PaymentIntentStatus.SUCCESSFUL);
}
