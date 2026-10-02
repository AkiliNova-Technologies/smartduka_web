/* Controlled SmartDuka marketplace fixtures. Never run without explicit flags. */
/* eslint-disable @typescript-eslint/no-require-imports -- Node CLI intentionally uses CommonJS. */
require("dotenv/config");
const { getApps, initializeApp, cert } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const pg = require("pg");

const MARKER = "TEST SmartDuka Marketplace";
const TEST_TAG = "test-marketplace-seed";
const VENDORS = [
  { key: "vendor1", name: "TEST Vendor - Kampala Electronics", slug: "test-vendor-kampala-electronics", emailKey: "TEST_VENDOR_1_EMAIL", passwordKey: "TEST_VENDOR_1_PASSWORD", businessType: "Electronics" },
  { key: "vendor2", name: "TEST Vendor - Home & Lifestyle", slug: "test-vendor-home-lifestyle", emailKey: "TEST_VENDOR_2_EMAIL", passwordKey: "TEST_VENDOR_2_PASSWORD", businessType: "Home / Retail" },
];
const CUSTOMER = { name: "TEST Customer", emailKey: "TEST_CUSTOMER_EMAIL", passwordKey: "TEST_CUSTOMER_PASSWORD" };
const CATEGORIES = ["Electronics", "Home & Living", "Fashion", "Beauty & Personal Care"];
const PRODUCTS = [
  { vendor: "vendor1", name: "TEST USB-C Charging Cable", slug: "test-usb-c-charging-cable", sku: "TEST-USB-C-CABLE", price: "1000.00", stock: 50, category: "Electronics" },
  { vendor: "vendor1", name: "TEST Wireless Earbuds", slug: "test-wireless-earbuds", sku: "TEST-WIRELESS-EARBUDS", price: "25000.00", stock: 20, category: "Electronics" },
  { vendor: "vendor1", name: "TEST Phone Charger", slug: "test-phone-charger", sku: "TEST-PHONE-CHARGER", price: "15000.00", stock: 30, category: "Electronics" },
  { vendor: "vendor1", name: "TEST Smartphone Case", slug: "test-smartphone-case", sku: "TEST-SMARTPHONE-CASE", price: "5000.00", stock: 0, category: "Electronics", variants: [{ name: "Black", sku: "TEST-CASE-BLACK", stock: 10 }, { name: "Blue", sku: "TEST-CASE-BLUE", stock: 8 }, { name: "Clear", sku: "TEST-CASE-CLEAR", stock: 12 }] },
  { vendor: "vendor2", name: "TEST Cotton Bedsheet", slug: "test-cotton-bedsheet", sku: "TEST-COTTON-BEDSHEET", price: "20000.00", stock: 20, category: "Home & Living" },
  { vendor: "vendor2", name: "TEST Pillow Pair", slug: "test-pillow-pair", sku: "TEST-PILLOW-PAIR", price: "10000.00", stock: 25, category: "Home & Living" },
  { vendor: "vendor2", name: "TEST Storage Basket", slug: "test-storage-basket", sku: "TEST-STORAGE-BASKET", price: "8000.00", stock: 15, category: "Home & Living" },
];

function requireSeedFlags() {
  if (process.env.ALLOW_TEST_MARKETPLACE_SEED !== "true") throw new Error("REFUSE TO RUN: set ALLOW_TEST_MARKETPLACE_SEED=true.");
  if (process.env.PESAPAL_ENV === "production" && process.env.ALLOW_PRODUCTION_TEST_SEED !== "true") throw new Error("REFUSE TO RUN: production requires ALLOW_PRODUCTION_TEST_SEED=true.");
}

function requiredCredential(key) {
  const value = process.env[key]?.trim();
  if (!value) throw new Error(`REFUSE TO RUN: ${key} must be configured for real Firebase test login identities.`);
  return value;
}

function database() {
  return new PrismaClient({ adapter: new PrismaPg(new pg.Pool({ connectionString: process.env.DATABASE_URL })) });
}

function firebaseAuth() {
  if (!getApps().length) {
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n").replace(/"/g, "").trim();
    if (!projectId || !clientEmail || !privateKey) throw new Error("REFUSE TO RUN: Firebase Admin credentials are required to create real login identities.");
    initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
  }
  return getAuth();
}

async function upsertFirebaseIdentity(auth, email, password, displayName) {
  try {
    return await auth.getUserByEmail(email);
  } catch (error) {
    if (error.code !== "auth/user-not-found") throw error;
    return auth.createUser({ email, password, displayName, emailVerified: true });
  }
}

async function upsertUser(db, identity, name, role) {
  return db.user.upsert({
    where: { email: identity.email },
    update: { name, status: "ACTIVE", platformRole: role, emailVerifiedAt: new Date() },
    create: { id: identity.uid, name, email: identity.email, status: "ACTIVE", platformRole: role, emailVerifiedAt: new Date() },
  });
}

async function resolveCategory(db, label) {
  const slug = label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  const existing = await db.productCategory.findFirst({ where: { OR: [{ slug }, { name: { equals: label, mode: "insensitive" } }] } });
  return existing ?? db.productCategory.create({ data: { name: `TEST ${label}`, slug: `test-${slug}`, description: `${MARKER}: ${label}` } });
}

async function upsertVendor(db, definition, identity) {
  const user = await upsertUser(db, identity, definition.name, "VENDOR");
  const profile = await db.vendorProfile.upsert({
    where: { ownerId: user.id },
    update: { storeName: definition.name, slug: definition.slug, status: "ACTIVE", isVerified: true, email: identity.email, address: `${MARKER} fixture`, city: "Kampala", country: "Uganda", currency: "UGX" },
    create: { ownerId: user.id, storeName: definition.name, slug: definition.slug, status: "ACTIVE", isVerified: true, email: identity.email, phone: "0700000000", address: `${MARKER} fixture`, city: "Kampala", country: "Uganda", currency: "UGX" },
  });
  await db.user.update({ where: { id: user.id }, data: { vendorId: profile.id, vendorRole: "OWNER", platformRole: "VENDOR" } });
  await db.vendorApplication.upsert({
    where: { userId: user.id },
    update: { storeName: definition.name, storeSlug: definition.slug, businessType: definition.businessType, businessEmail: identity.email, businessPhone: "0700000000", streetAddress: `${MARKER} fixture`, city: "Kampala", country: "Uganda", status: "APPROVED", vendorProfileId: profile.id },
    create: { userId: user.id, storeName: definition.name, storeSlug: definition.slug, businessType: definition.businessType, businessEmail: identity.email, businessPhone: "0700000000", streetAddress: `${MARKER} fixture`, city: "Kampala", country: "Uganda", status: "APPROVED", vendorProfileId: profile.id },
  });
  const plan = await db.subscriptionPlan.findFirst({ where: { isActive: true }, orderBy: { createdAt: "asc" } });
  if (plan) {
    const subscription = await db.vendorSubscription.findFirst({ where: { vendorId: profile.id, planId: plan.id } });
    if (subscription) await db.vendorSubscription.update({ where: { id: subscription.id }, data: { status: "ACTIVE" } });
    else await db.vendorSubscription.create({ data: { vendorId: profile.id, planId: plan.id, status: "ACTIVE" } });
  }
  return { profile, commissionRate: plan ? String(plan.commissionRate) : "canonical default" };
}

async function upsertProduct(db, definition, vendorId, categoryId) {
  const product = await db.product.upsert({
    where: { vendorId_slug: { vendorId, slug: definition.slug } },
    update: { name: definition.name, description: `${MARKER}: ${definition.name}`, basePrice: definition.price, inventoryCount: definition.stock, status: "ACTIVE", sku: definition.sku, categoryId, tags: [TEST_TAG] },
    create: { vendorId, name: definition.name, slug: definition.slug, description: `${MARKER}: ${definition.name}`, basePrice: definition.price, inventoryCount: definition.stock, status: "ACTIVE", sku: definition.sku, categoryId, tags: [TEST_TAG] },
  });
  for (const variant of definition.variants ?? []) {
    const existing = await db.productVariant.findUnique({ where: { sku: variant.sku } });
    if (existing && existing.productId !== product.id) throw new Error(`REFUSE TO RUN: variant SKU ${variant.sku} belongs to an unexpected product.`);
    if (existing) await db.productVariant.update({ where: { id: existing.id }, data: { name: variant.name, price: definition.price, inventoryCount: variant.stock, options: { color: variant.name } } });
    else await db.productVariant.create({ data: { productId: product.id, sku: variant.sku, name: variant.name, price: definition.price, inventoryCount: variant.stock, options: { color: variant.name } } });
  }
  return product;
}

async function seed() {
  requireSeedFlags();
  const auth = firebaseAuth();
  const db = database();
  try {
    const customerIdentity = await upsertFirebaseIdentity(auth, requiredCredential(CUSTOMER.emailKey), requiredCredential(CUSTOMER.passwordKey), CUSTOMER.name);
    const customer = await upsertUser(db, customerIdentity, CUSTOMER.name, "CUSTOMER");
    const categories = Object.fromEntries(await Promise.all(CATEGORIES.map(async (label) => [label, await resolveCategory(db, label)])));
    const vendors = {};
    for (const definition of VENDORS) {
      const identity = await upsertFirebaseIdentity(auth, requiredCredential(definition.emailKey), requiredCredential(definition.passwordKey), definition.name);
      vendors[definition.key] = await upsertVendor(db, definition, identity);
    }
    const products = [];
    for (const definition of PRODUCTS) products.push(await upsertProduct(db, definition, vendors[definition.vendor].profile.id, categories[definition.category].id));
    console.log(JSON.stringify({ marker: MARKER, customer: { id: customer.id, email: customer.email }, vendors: Object.fromEntries(Object.entries(vendors).map(([key, value]) => [key, { id: value.profile.id, email: value.profile.email, commissionRate: value.commissionRate }])), products: products.map((product) => ({ id: product.id, name: product.name, price: String(product.basePrice), stock: product.inventoryCount })) }, null, 2));
  } finally {
    await db.$disconnect();
  }
}

async function cleanup() {
  requireSeedFlags();
  const auth = firebaseAuth();
  const db = database();
  try {
    const emails = [requiredCredential(CUSTOMER.emailKey), ...VENDORS.map((vendor) => requiredCredential(vendor.emailKey))];
    const users = await db.user.findMany({ where: { email: { in: emails } }, select: { id: true, email: true, vendorId: true } });
    const vendorIds = users.flatMap((user) => user.vendorId ? [user.vendorId] : []);
    const products = await db.product.findMany({ where: { vendorId: { in: vendorIds }, slug: { in: PRODUCTS.map((product) => product.slug) } }, select: { id: true } });
    const [orders, orderItems, ledger] = await Promise.all([
      db.order.count({ where: { customerId: { in: users.map((user) => user.id) } } }),
      db.orderItem.count({ where: { productId: { in: products.map((product) => product.id) } } }),
      db.financialLedger.count({ where: { vendorId: { in: vendorIds } } }),
    ]);
    if (orders || orderItems || ledger) throw new Error("REFUSE TO CLEAN: known seed records have order or financial dependencies.");
    await db.$transaction(async (tx) => {
      await tx.product.deleteMany({ where: { id: { in: products.map((product) => product.id) } } });
      await tx.vendorApplication.deleteMany({ where: { userId: { in: users.map((user) => user.id) } } });
      await tx.vendorSubscription.deleteMany({ where: { vendorId: { in: vendorIds } } });
      await tx.vendorProfile.deleteMany({ where: { id: { in: vendorIds } } });
      await tx.user.deleteMany({ where: { id: { in: users.map((user) => user.id) } } });
      for (const label of CATEGORIES) {
        const slug = `test-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}`;
        const category = await tx.productCategory.findUnique({ where: { slug }, select: { id: true, description: true, _count: { select: { products: true } } } });
        if (category?.description === `${MARKER}: ${label}` && category._count.products === 0) await tx.productCategory.delete({ where: { id: category.id } });
      }
    });
    for (const email of emails) {
      try { await auth.deleteUser((await auth.getUserByEmail(email)).uid); } catch (error) { if (error.code !== "auth/user-not-found") throw error; }
    }
    console.log("Controlled TEST marketplace seed cleanup completed.");
  } finally {
    await db.$disconnect();
  }
}

(process.argv.includes("--cleanup") ? cleanup() : seed()).catch((error) => {
  console.error(error instanceof Error ? error.message : "Controlled test marketplace seed failed.");
  process.exitCode = 1;
});
