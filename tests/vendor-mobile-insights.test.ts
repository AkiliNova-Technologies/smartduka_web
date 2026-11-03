import { describe, expect, it } from "vitest";
import { analyticsWindows, summarizeAnalytics } from "@/services/vendor-mobile-insights";

const item = (productId: string, quantity: number) => ({
  productId, quantity, productNameSnapshot: productId, product: { images: [] },
});
const sale = (subOrderId: string, confirmedAt: string, amount: number, items = [item("p1", 1)]) => ({
  subOrderId, confirmedAt: new Date(confirmedAt), amount, subOrder: { items },
});
const refund = (subOrderId: string, completedAt: string, amount: number) => ({
  subOrderId, completedAt: new Date(completedAt), amount,
});

describe("vendor mobile analytics accounting", () => {
  const from = new Date("2026-10-01T00:00:00.000Z");
  const to = new Date("2026-11-01T00:00:00.000Z");

  it("returns zero metrics without sales", () => {
    expect(summarizeAnalytics([], [], from, to)).toMatchObject({ revenue: 0, orders: 0, unitsSold: 0, averageOrderValue: 0 });
  });

  it("counts multiple products and calculates net average order value", () => {
    const result = summarizeAnalytics([
      sale("s1", "2026-10-02T00:00:00Z", 100, [item("p1", 2), item("p2", 1)]),
      sale("s2", "2026-10-03T00:00:00Z", 50, [item("p1", 1)]),
    ], [refund("s1", "2026-10-10T00:00:00Z", 30)], from, to);
    expect(result).toMatchObject({ grossRevenue: 150, refundedRevenue: 30, revenue: 120, orders: 2, unitsSold: 4, averageOrderValue: 60 });
  });

  it("deduplicates successful attempts for one vendor suborder", () => {
    const result = summarizeAnalytics([
      sale("s1", "2026-10-02T00:00:00Z", 100),
      sale("s1", "2026-10-02T00:01:00Z", 100),
    ], [], from, to);
    expect(result).toMatchObject({ revenue: 100, orders: 1, unitsSold: 1 });
  });

  it("recognizes partial and full refunds in their completion period only", () => {
    const result = summarizeAnalytics(
      [sale("s1", "2026-09-20T00:00:00Z", 100)],
      [refund("s1", "2026-10-03T00:00:00Z", 25), refund("s1", "2026-11-01T00:00:00Z", 75)],
      from, to,
    );
    expect(result).toMatchObject({ grossRevenue: 0, refundedRevenue: 25, revenue: -25, orders: 0 });
  });

  it("uses inclusive starts and exclusive ends", () => {
    const result = summarizeAnalytics([
      sale("start", "2026-10-01T00:00:00Z", 10),
      sale("end", "2026-11-01T00:00:00Z", 20),
    ], [], from, to);
    expect(result).toMatchObject({ revenue: 10, orders: 1 });
  });
});

describe("Africa/Kampala reporting windows", () => {
  const now = new Date("2026-11-03T12:34:56.000Z");

  it.each([
    ["TODAY", 1, "2026-11-02T21:00:00.000Z"],
    ["7D", 7, "2026-10-27T21:00:00.000Z"],
    ["30D", 30, "2026-10-04T21:00:00.000Z"],
    ["90D", 90, "2026-08-05T21:00:00.000Z"],
  ] as const)("builds the %s window", (period, days, expected) => {
    const window = analyticsWindows(period, now);
    expect(window.days).toBe(days);
    expect(window.currentStart.toISOString()).toBe(expected);
    expect(window.currentEnd).toEqual(now);
  });
});
