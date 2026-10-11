import { describe, expect, it } from "vitest";
import {
  aggregateVendorDocuments,
  countVendorDocuments,
} from "@/lib/vendor-document-aggregation";

describe("vendor document aggregation", () => {
  it("counts zero, onboarding-only, profile-only, and mixed document sources", () => {
    expect(countVendorDocuments({ onboarding: 0, profile: 0 })).toBe(0);
    expect(countVendorDocuments({ onboarding: 1, profile: 0 })).toBe(1);
    expect(countVendorDocuments({ onboarding: 0, profile: 3 })).toBe(3);
    expect(countVendorDocuments({ onboarding: 2, profile: 3 })).toBe(5);
  });

  it("deduplicates repeated references without merging distinct source records", () => {
    const documents = aggregateVendorDocuments({
      profile: [{ id: "profile-1" }, { id: "profile-1" }],
      onboarding: [{ id: "onboarding-1" }, { id: "onboarding-1" }],
    });

    expect(documents).toEqual([
      { source: "profile", document: { id: "profile-1" } },
      { source: "onboarding", document: { id: "onboarding-1" } },
    ]);
  });

  it("does not count historical verification references separately", () => {
    const currentDocuments = aggregateVendorDocuments({
      profile: [{ id: "profile-1" }],
      onboarding: [{ id: "onboarding-1" }],
    });
    const historicalReferences = [
      { documentId: "profile-1", vendorDocumentId: null },
      { documentId: "profile-1", vendorDocumentId: null },
      { documentId: null, vendorDocumentId: "onboarding-1" },
    ];

    expect(historicalReferences).toHaveLength(3);
    expect(currentDocuments).toHaveLength(2);
  });
});
