import { PaymentGateway, PaymentIntentStatus } from "@prisma/client";

/**
 * The seller may only begin or continue fulfilment for a direct payment
 * once the payment recorded for that seller's suborder is successful.  This is
 * deliberately based on the suborder's intents rather than parent payment
 * progress: another seller's payment must neither unlock nor block it.
 */
export function canFulfillSubOrder(input: {
  paymentGateway: PaymentGateway;
  paymentIntentStatuses: PaymentIntentStatus[];
}): boolean {
  // Cash-on-delivery has its own settlement lifecycle. Pesapal is settled at
  // parent-order level by its legacy gateway integration. Every direct-to-
  // vendor rail is protected by the seller suborder's successful intent.
  if (
    input.paymentGateway !== PaymentGateway.MTN_MOMO &&
    input.paymentGateway !== PaymentGateway.AIRTEL_MONEY
  )
    return true;

  return input.paymentIntentStatuses.includes(PaymentIntentStatus.SUCCESSFUL);
}
