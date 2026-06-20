import "dotenv/config"; 
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import { VendorContext } from "../vendor/vendor-context";

// Configure high-performance database connection pooling
const pool = new pg.Pool({ 
  connectionString: process.env.DATABASE_URL!,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});
const adapter = new PrismaPg(pool);

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

const basePrisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = basePrisma;
}

/**
 * Fortified, production-grade Prisma Client instance.
 * Automatically intercepts query execution trees to enforce strict 
 * multi-vendor sandbox boundaries across your Virtual Mall infrastructure models.
 */
export const prisma = basePrisma.$extends({
  query: {
    $allModels: {
      async $allOperations({ model, operation, args, query }) {
        const activeVendorId = VendorContext.getVendorId();

        // Safe Escape: CLI migrations, seeds, or customer storefront paths 
        // won't have a vendor context, so we bypass and execute the query globally.
        if (!activeVendorId) {
          return query(args);
        }

        // Models requiring tenant isolation by 'vendorId' field
        const vendorIsolatedModels = [
          "User", // Vendor-hired employees (Managers, Staff, Accountants)
          "Product",
          "SubOrder", // Per-vendor order bucket partitions
          "FinancialLedger", // Escrow accounts and platform transaction balances
          "VendorPayout",
          "VendorSubscription",
          "Notification",
          "Document",
          "AuditLog"
        ];

        const queryArgs = (args as Record<string, unknown>) || {};

        // CASE 1: Standard Tenant Models (Filters using 'vendorId')
        if (vendorIsolatedModels.includes(model)) {
          queryArgs.where = (queryArgs.where as Record<string, unknown>) || {};

          if (
            [
              "findFirst", "findMany", "findUnique", "findUniqueOrThrow",
              "update", "updateMany", "delete", "deleteMany", 
              "count", "aggregate", "groupBy"
            ].includes(operation)
          ) {
            (queryArgs.where as Record<string, unknown>).vendorId = activeVendorId;
          } else if (operation === "create") {
            queryArgs.data = (queryArgs.data as Record<string, unknown>) || {};
            (queryArgs.data as Record<string, unknown>).vendorId = activeVendorId;
          } else if (operation === "createMany" || operation === "createManyAndReturn") {
            queryArgs.data = queryArgs.data || [];
            if (Array.isArray(queryArgs.data)) {
              queryArgs.data = queryArgs.data.map((item: Record<string, unknown>) => ({
                ...item,
                vendorId: activeVendorId,
              }));
            }
          }
        }

        // CASE 2: The Core Tenant Model Wrapper (Filters using primary key 'id')
        // Prevents a Vendor from reading/updating another Vendor's core business settings
        if (model === "VendorProfile") {
          queryArgs.where = (queryArgs.where as Record<string, unknown>) || {};
          
          if (
            [
              "findFirst", "findMany", "findUnique", "findUniqueOrThrow",
              "update", "updateMany", "delete", "deleteMany", "count"
            ].includes(operation)
          ) {
            (queryArgs.where as Record<string, unknown>).id = activeVendorId;
          }
        }

        return query(args);
      },
    },
  },
});