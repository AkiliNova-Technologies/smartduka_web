import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
const plans = [
  { code: "STARTER", name: "Starter", slug: "starter", description: "Everything you need to run your shop on SmartDuka.", price: 25000, staffSeats: 2, sortOrder: 10, features: ["PRODUCT_MANAGEMENT", "ORDER_MANAGEMENT", "INVENTORY_MANAGEMENT", "MARKETING", "BASIC_ANALYTICS", "STAFF_SEATS"] },
  { code: "BUSINESS", name: "Business", slug: "business", description: "More insights and tools for growing shops.", price: 60000, staffSeats: 10, sortOrder: 20, features: ["PRODUCT_MANAGEMENT", "ORDER_MANAGEMENT", "INVENTORY_MANAGEMENT", "MARKETING", "BASIC_ANALYTICS", "ADVANCED_ANALYTICS", "REPORT_EXPORT", "PRIORITY_SUPPORT", "ADVANCED_PROMOTION_ANALYTICS", "STAFF_SEATS"] },
];
try { for (const plan of plans) await prisma.subscriptionPlan.upsert({ where: { code: plan.code }, update: { ...plan, billingCycle: "MONTHLY", currency: "UGX", commissionRate: 0, isActive: true }, create: { ...plan, billingCycle: "MONTHLY", currency: "UGX", commissionRate: 0, isActive: true } }); console.log("Subscription plans seeded: STARTER (UGX 25,000), BUSINESS (UGX 60,000)."); } finally { await prisma.$disconnect(); await pool.end(); }
