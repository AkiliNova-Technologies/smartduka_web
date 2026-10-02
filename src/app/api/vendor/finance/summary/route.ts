import { PayoutDestinationType } from "@prisma/client";
import { AuthenticationRequiredError } from "@/lib/auth/session";
import { requireVendorContext, VendorAuthorizationError } from "@/lib/auth/vendor-context";
import { successResponse, errorResponse, getErrorMessage } from "@/lib/api-utils";
import { PLATFORM_CURRENCY } from "@/lib/commerce/currency";
import { prisma } from "@/lib/prisma/client";
import { MarketplaceEconomicsService } from "@/services/marketplace-economics";
import { VENDOR_DISBURSEMENTS_ENABLED } from "@/services/disbursement-provider";
import { cacheLife, cacheTag } from "next/cache";
import { cacheProfiles, cacheTags } from "@/lib/cache-policy";

const decimalString = (value: { toFixed: (digits: number) => string }) => value.toFixed(2);

async function getVendorFinanceSummary(vendorId: string) {
  "use cache";
  cacheLife(cacheProfiles.vendorOperational);
  cacheTag(cacheTags.vendorEarnings(vendorId));
  const [balances, vendor] = await Promise.all([
    MarketplaceEconomicsService.vendorBalances(vendorId, PLATFORM_CURRENCY),
    prisma.vendorProfile.findUnique({ where: { id: vendorId }, select: { momoMerchantCode: true, bankName: true, bankAccountNumber: true } }),
  ]);
  const destinations = [] as Array<{ id: PayoutDestinationType; label: string; maskedDestination: string }>;
  if (vendor?.momoMerchantCode) destinations.push({ id: PayoutDestinationType.MOBILE_MONEY, label: "Mobile money", maskedDestination: `Mobile money •••• ${vendor.momoMerchantCode.slice(-4)}` });
  if (vendor?.bankName && vendor.bankAccountNumber) destinations.push({ id: PayoutDestinationType.BANK_ACCOUNT, label: "Bank account", maskedDestination: `${vendor.bankName} •••• ${vendor.bankAccountNumber.slice(-4)}` });
  return { currency: balances.currency, balances: { pending: decimalString(balances.pendingBalance), available: decimalString(balances.availableBalance), reserved: decimalString(balances.reservedBalance), paidOut: decimalString(balances.paidOutTotal) }, hasAvailableBalance: balances.availableBalance.greaterThan(0), destinations, disbursementsEnabled: VENDOR_DISBURSEMENTS_ENABLED };
}

export async function GET() {
  try {
    const context = await requireVendorContext("vendor:request_payout");
    return successResponse(await getVendorFinanceSummary(context.vendorId));
  } catch (error: unknown) {
    return errorResponse(getErrorMessage(error), error instanceof AuthenticationRequiredError ? 401 : error instanceof VendorAuthorizationError ? 403 : 500);
  }
}
