import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import { VendorContext } from "../vendor/vendor-context";

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL!,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
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

export const prisma = basePrisma.$extends({
  query: {
    $allModels: {
      async $allOperations({ model, operation, args, query }) {
        const activeVendorId = VendorContext.getVendorId();

        if (!activeVendorId) {
          return query(args);
        }

        const vendorIsolatedModels = [
          "User",
          "Product",
          "SubOrder",
          "FinancialLedger",
          "VendorPayout",
          "VendorSubscription",
          "Notification",
          "Document",
          "AuditLog"
        ];

        const queryArgs = (args as Record<string, unknown>) || {};

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