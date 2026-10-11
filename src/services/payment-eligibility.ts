import {
  PaymentProvider,
  VendorPaymentAccountStatus,
  VendorStatus,
} from "@prisma/client";
import { prisma } from "@/lib/prisma/client";
import { PaymentProviderRegistry } from "@/lib/payments/payment-provider";

export type PaymentEligibility = {
  eligible: boolean;
  reasons: string[];
  accountId?: string;
  provider?: PaymentProvider;
};
export type PaymentEligibilityOptions = { sandboxQualification?: boolean };

/** Central checkout gate: payment destinations belong to an active vendor, never SmartDuka. */
export class PaymentEligibilityService {
  static async canAcceptPayments(
    vendorId: string,
    provider?: PaymentProvider,
    options: PaymentEligibilityOptions = {},
  ): Promise<PaymentEligibility> {
    const vendor = await prisma.vendorProfile.findUnique({
      where: { id: vendorId },
      select: {
        status: true,
        deletedAt: true,
        paymentAccounts: {
          orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
          select: { id: true, provider: true, status: true, suspendedAt: true },
        },
      },
    });
    if (!vendor || vendor.status !== VendorStatus.ACTIVE || vendor.deletedAt)
      return { eligible: false, reasons: ["SHOP_INACTIVE"] };
    const relevant = vendor.paymentAccounts.filter(
      (account) => !provider || account.provider === provider,
    );
    if (!relevant.length)
      return { eligible: false, reasons: ["NO_PAYMENT_ACCOUNT"] };
    const accounts = relevant.filter(
      (account) =>
        account.status === VendorPaymentAccountStatus.VERIFIED &&
        !account.suspendedAt,
    );
    if (!accounts.length) {
      const status = relevant.some(
        (account) => account.status === VendorPaymentAccountStatus.PENDING,
      )
        ? "PAYMENT_ACCOUNT_PENDING"
        : relevant.some(
              (account) =>
                account.status === VendorPaymentAccountStatus.REJECTED,
            )
          ? "PAYMENT_ACCOUNT_REJECTED"
          : "PAYMENT_ACCOUNT_SUSPENDED";
      return { eligible: false, reasons: [status] };
    }
    const account = accounts.find(
      (candidate) =>
        PaymentProviderRegistry.isEnabled(candidate.provider) ||
        (options.sandboxQualification === true &&
          PaymentProviderRegistry.isSandboxQualificationReady(
            candidate.provider,
          )),
    );
    if (!account)
      return {
        eligible: false,
        reasons: [
          options.sandboxQualification
            ? "SANDBOX_QUALIFICATION_PROVIDER_UNAVAILABLE"
            : "NO_ENABLED_PAYMENT_PROVIDER",
        ],
      };
    return {
      eligible: true,
      reasons: [],
      accountId: account.id,
      provider: account.provider,
    };
  }
}
