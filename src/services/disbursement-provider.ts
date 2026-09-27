export type DisbursementSubmission = { payoutId: string; merchantReference: string; amount: string; currency: string; destination: string };
export interface DisbursementProvider { submitPayout(input: DisbursementSubmission): Promise<never>; getPayoutStatus(merchantReference: string): Promise<never>; }
// Transport implementations are deliberately deferred until official provider documentation is available.
export const VENDOR_DISBURSEMENTS_ENABLED = false;
