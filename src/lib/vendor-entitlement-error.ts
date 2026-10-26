export function isVendorEntitlementError(message?: string) {
  return Boolean(message && /(?:plan limit|choose a mwezora plan|upgrade your plan|subscription required|additional capacity)/i.test(message));
}
