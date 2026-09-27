import { describe, expect, it } from "vitest";
import { Decimal } from "@prisma/client/runtime/client";
import {
  calculatePartialRefundEconomics,
  refundableProportion,
} from "@/services/returns-refunds";
describe("Phase 3K refund economics", () => {
  it("uses historical Decimal snapshots and final remainder without rounding drift", () => {
    const original = {
      originalGross: new Decimal("10000"),
      originalCommission: new Decimal("999.99"),
      originalVendorNet: new Decimal("9000.01"),
    };
    const first = calculatePartialRefundEconomics({
      ...original,
      previouslyRefundedGross: new Decimal(0),
      previouslyReversedCommission: new Decimal(0),
      previouslyReversedVendorNet: new Decimal(0),
      requestedGross: new Decimal("3333"),
    });
    const final = calculatePartialRefundEconomics({
      ...original,
      previouslyRefundedGross: new Decimal("3333"),
      previouslyReversedCommission: first.commission,
      previouslyReversedVendorNet: first.vendorNet,
      requestedGross: new Decimal("6667"),
    });
    expect(first.gross.plus(final.gross)).toEqual(original.originalGross);
    expect(first.commission.plus(final.commission)).toEqual(
      original.originalCommission,
    );
    expect(first.vendorNet.plus(final.vendorNet)).toEqual(
      original.originalVendorNet,
    );
  });
  it("rejects over-capacity gross", () =>
    expect(() =>
      refundableProportion(
        new Decimal("10"),
        new Decimal("6"),
        new Decimal("5"),
      ),
    ).toThrow());
});
