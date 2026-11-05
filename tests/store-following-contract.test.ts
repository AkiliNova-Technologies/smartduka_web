import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
const read = (path: string) => readFileSync(path, "utf8");
describe("store following contract", () => {
  it("uses an additive isolated relationship with unique and query indexes", () => { const schema = read("prisma/schema.prisma"); expect(schema).toContain("model StoreFollow"); expect(schema).toContain("@@unique([customerId, vendorId])"); expect(schema).toContain("@@index([customerId, createdAt, id])"); expect(schema).toContain("@@index([vendorId, createdAt])"); });
  it("requires authenticated identity, rate limits mutations, and disables private caching", () => { const mutation = read("src/app/api/v1/shops/[idOrSlug]/follow/route.ts"), list = read("src/app/api/v1/following/route.ts"); expect(mutation).toContain("requireActiveUserId"); expect(mutation).toContain("checkRateLimit"); expect(mutation).toContain("private, no-store"); expect(list).toContain("requireActiveUserId"); expect(list).toContain("private, no-store"); expect(mutation).not.toContain("request.json"); });
  it("keeps activity scoped to current follows and eligible content", () => { const service = read("src/services/store-following.ts"); expect(service).toContain("followers: { some: { customerId } }"); expect(service).toContain('status: { in: ["ACTIVE", "PUBLISHED"]'); expect(service).toContain("deletedAt: null"); expect(service).not.toContain("notification.create"); });
});
