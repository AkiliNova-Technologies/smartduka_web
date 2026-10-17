import { describe, expect, it } from "vitest";
import {
  MarketingNotificationQueryError,
  parseMarketingCampaignListQuery,
  parseMarketingDestinationQuery,
  parseMarketingEstimateQuery,
} from "@/lib/marketing-notification-query";

describe("marketing notification admin query parsing", () => {
  it("uses a safe default list query and accepts bounded filters", () => {
    expect(parseMarketingCampaignListQuery(new URLSearchParams())).toEqual({ page: 1, pageSize: 25, search: undefined, status: undefined });
    expect(parseMarketingCampaignListQuery(new URLSearchParams("status=DRAFT&page=2&pageSize=50&search=welcome"))).toEqual({ status: "DRAFT", page: 2, pageSize: 50, search: "welcome" });
  });

  it("rejects malformed, repeated, and unsupported list arguments", () => {
    for (const query of ["status=NOPE", "page=0", "pageSize=101", "page=1&page=2", "unexpected=true"]) {
      expect(() => parseMarketingCampaignListQuery(new URLSearchParams(query))).toThrow(MarketingNotificationQueryError);
    }
  });

  it("validates the dedicated estimate and bounded destination search modes", () => {
    expect(parseMarketingEstimateQuery(new URLSearchParams("estimate=PROMOTIONAL_OPT_IN"))).toBe("PROMOTIONAL_OPT_IN");
    expect(parseMarketingDestinationQuery(new URLSearchParams("destinations=1&type=PRODUCT&query=coffee"))).toEqual({ type: "PRODUCT", query: "coffee" });
    expect(() => parseMarketingEstimateQuery(new URLSearchParams("estimate=ALL"))).toThrow(MarketingNotificationQueryError);
    expect(() => parseMarketingDestinationQuery(new URLSearchParams("destinations=0"))).toThrow(MarketingNotificationQueryError);
  });
});
