import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ findMany: vi.fn() }));

vi.mock("@/lib/prisma/client", () => ({
  prisma: {
    vendorApplication: { findMany: mocks.findMany },
  },
}));

import { AdminService } from "@/services/admin";

const application = (input: {
  id: string;
  onboarding: number;
  profile?: number;
}) => ({
  id: input.id,
  documents: [],
  _count: { documents: input.onboarding },
  vendorProfile: input.profile === undefined
    ? null
    : { id: `vendor-${input.id}`, _count: { documents: input.profile } },
});

describe("admin vendor document counts", () => {
  beforeEach(() => vi.clearAllMocks());

  it("combines database relation counts per shop without N+1 queries", async () => {
    mocks.findMany.mockResolvedValue([
      application({ id: "none", onboarding: 0 }),
      application({ id: "onboarding", onboarding: 1, profile: 0 }),
      application({ id: "profile", onboarding: 0, profile: 3 }),
      application({ id: "mixed", onboarding: 2, profile: 3 }),
    ]);

    const result = await AdminService.getAllVendorApplications();

    expect(result.map(({ id, documentCount }) => ({ id, documentCount }))).toEqual([
      { id: "none", documentCount: 0 },
      { id: "onboarding", documentCount: 1 },
      { id: "profile", documentCount: 3 },
      { id: "mixed", documentCount: 5 },
    ]);
    expect(mocks.findMany).toHaveBeenCalledTimes(1);
    expect(mocks.findMany).toHaveBeenCalledWith(expect.objectContaining({
      include: expect.objectContaining({
        _count: { select: { documents: { where: {} } } },
        vendorProfile: { select: expect.objectContaining({ _count: { select: { documents: { where: {} } } } }) },
      }),
    }));
  });

  it("applies search and status filters without changing count aggregation", async () => {
    mocks.findMany.mockResolvedValue([application({ id: "wati", onboarding: 0, profile: 3 })]);

    const result = await AdminService.getAllVendorApplications({ status: "APPROVED", search: "Wati" });

    expect(result[0].documentCount).toBe(3);
    expect(mocks.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        status: "APPROVED",
        OR: expect.arrayContaining([
          { storeName: { contains: "Wati", mode: "insensitive" } },
        ]),
      },
    }));
  });
});
