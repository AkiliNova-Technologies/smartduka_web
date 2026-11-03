import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

// Catalog sync for development/staging. Never rewrite historical plan versions.
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL must be configured");
if (process.env.NODE_ENV === "production" && process.env.ALLOW_PRODUCTION_PLAN_SEED !== "true") {
  throw new Error("Production catalog sync requires explicit ALLOW_PRODUCTION_PLAN_SEED=true");
}
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
const common = ["BASIC_ANALYTICS", "STANDARD_INVENTORY", "PRODUCT_MANAGEMENT", "BRANCH_MANAGEMENT", "TEAM_MANAGEMENT", "ADVERTISING_ACCESS"];
const advanced = [...common, "ADVANCED_ANALYTICS", "CSV_EXPORTS"];
const premium = [...advanced, "PREMIUM_INSIGHTS", "ADVANCED_INVENTORY"];
const plans = [
  { code: "STARTER", name: "Starter", description: "Essential tools for running a Mezora shop.", monthly: 25000, yearly: 280000, version: 2, products: 100, ceiling: null, branches: 1, seats: 2, sort: 10, capabilities: common },
  { code: "GROWTH", name: "Growth", description: "Advanced tools for growing shops.", monthly: 60000, yearly: 700000, version: 2, products: 1000, ceiling: null, branches: 5, seats: 5, sort: 20, capabilities: advanced },
  { code: "PREMIUM", name: "Premium", description: "Premium insights and multi-branch operations.", monthly: 120000, yearly: 1400000, version: 2, products: null, ceiling: 10000, branches: 20, seats: 10, sort: 30, capabilities: premium },
  { code: "ENTERPRISE", name: "Enterprise", description: "Premium tools with capacity for larger teams.", monthly: 500000, yearly: 5000000, version: 1, products: null, ceiling: 10000, branches: 20, seats: 25, sort: 40, capabilities: premium },
];
try {
  for (const plan of plans) {
    const saved = await prisma.subscriptionPlan.upsert({
      where: { code: plan.code },
      create: { code: plan.code, name: plan.name, slug: plan.code.toLowerCase(), description: plan.description,
        price: plan.monthly, maxProducts: plan.products, staffSeats: plan.seats,
        sortOrder: plan.sort, features: plan.capabilities, billingCycle: "MONTHLY",
        currency: "UGX", commissionRate: 0, isActive: true },
      update: { name: plan.name, description: plan.description, price: plan.monthly,
        maxProducts: plan.products, staffSeats: plan.seats, sortOrder: plan.sort,
        features: plan.capabilities, isActive: true },
    });
    const version = await prisma.subscriptionPlanVersion.findUnique({
      where: { planCode_version: { planCode: plan.code, version: plan.version } },
      select: { id: true, publicationStatus: true },
    });
    if (!version) {
      await prisma.subscriptionPlanVersion.create({
        data: { planId: saved.id, planCode: plan.code, version: plan.version,
          policyVersion: "MEZORA_REVENUE_V2", monthlyPriceUgx: plan.monthly,
          yearlyPriceUgx: plan.yearly, billingCycle: "MONTHLY",
          activeProductLimit: plan.products, productSafetyCeiling: plan.ceiling,
          branchLimit: plan.branches, staffLimit: plan.seats,
          capabilities: plan.capabilities, effectiveAt: new Date(),
          publicationStatus: "PUBLISHED", publishedAt: new Date() },
      });
    } else if (version.publicationStatus !== "PUBLISHED") {
      throw new Error(`Plan ${plan.code} version ${plan.version} already exists but is not published; review it manually.`);
    }
    console.log(`${plan.code}: catalog synchronized, approved version ${plan.version} ${version ? "preserved" : "created"}`);
  }
} finally {
  await prisma.$disconnect();
  await pool.end();
}
