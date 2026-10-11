import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  context: vi.fn(),
  create: vi.fn(),
  findFirst: vi.fn(),
  removeRecord: vi.fn(),
  storageInfo: vi.fn(),
  storageRemove: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/auth/vendor-context", () => ({ requireVendorContext: mocks.context }));
vi.mock("@/lib/prisma/client", () => ({
  prisma: {
    document: {
      create: mocks.create,
      findFirst: mocks.findFirst,
      delete: mocks.removeRecord,
    },
  },
}));
vi.mock("@/lib/private-document-storage", () => ({
  parsePrivateDocumentReference: () => ({ bucket: "kyc-documents", path: "kyc/shop-1/doc.pdf" }),
}));
vi.mock("@/lib/supabase/server", () => ({
  getSupabaseServerClient: () => ({
    storage: {
      from: () => ({ info: mocks.storageInfo, remove: mocks.storageRemove }),
    },
  }),
}));
vi.mock("next/cache", () => ({
  revalidatePath: mocks.revalidatePath,
  updateTag: vi.fn(),
}));

import {
  deleteVendorDocument,
  uploadVerificationDocument,
} from "@/actions/vendor-settings";

describe("vendor document admin count invalidation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.context.mockResolvedValue({ vendorId: "shop-1", vendor: { slug: "shop-one" }, user: { id: "owner-1" } });
    mocks.storageInfo.mockResolvedValue({ data: { contentType: "application/pdf", size: 100 }, error: null });
    mocks.create.mockResolvedValue({ id: "profile-doc" });
    mocks.storageRemove.mockResolvedValue({ data: [], error: null });
  });

  it("revalidates the admin vendor table after upload", async () => {
    await uploadVerificationDocument(
      "BUSINESS_REGISTRATION",
      "registration.pdf",
      "storage://kyc-documents/kyc/shop-1/doc.pdf",
      "application/pdf",
      100,
    );

    expect(mocks.revalidatePath).toHaveBeenCalledWith("/admin/vendors");
  });

  it("revalidates the admin vendor table after an eligible deletion", async () => {
    mocks.findFirst.mockResolvedValue({
      id: "profile-doc",
      url: "storage://kyc-documents/kyc/shop-1/doc.pdf",
      _count: { verificationSubmissions: 0 },
    });

    await deleteVendorDocument("profile-doc");

    expect(mocks.removeRecord).toHaveBeenCalledWith({ where: { id: "profile-doc" } });
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/admin/vendors");
  });

  it("retains submitted historical documents and leaves counts unchanged", async () => {
    mocks.findFirst.mockResolvedValue({
      id: "profile-doc",
      url: "storage://kyc-documents/kyc/shop-1/doc.pdf",
      _count: { verificationSubmissions: 1 },
    });

    await expect(deleteVendorDocument("profile-doc")).resolves.toMatchObject({ success: false });
    expect(mocks.removeRecord).not.toHaveBeenCalled();
    expect(mocks.revalidatePath).not.toHaveBeenCalledWith("/admin/vendors");
  });
});
