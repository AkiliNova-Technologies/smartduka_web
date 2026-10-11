import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
// Node's type-stripping runner requires the explicit extension; TypeScript's
// project resolver intentionally rejects it without this script-local waiver.
// @ts-expect-error Node runtime import of a TypeScript data module
import { WOMENS_TAXONOMY, WOMENS_TAXONOMY_VERSION, flattenTaxonomy, type TaxonomyNode } from "../src/data/womens-taxonomy.ts";

const apply = process.argv.includes("--apply");
const mappingFlag = process.argv.find((arg) => arg.startsWith("--mapping-file="));
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
export const flatten = (nodes: TaxonomyNode[], parentKey: string | null = null, depth = 1): Array<TaxonomyNode & { parentKey: string | null; depth: number }> => nodes.flatMap((node) => [{ ...node, parentKey, depth }, ...flatten(node.children ?? [], node.key, depth + 1)]);
const plan = flattenTaxonomy().map((node) => node.key);
const entries = flatten(WOMENS_TAXONOMY);
type ExistingCategory = { id: string; name: string; slug: string; taxonomyKey: string | null; parentId: string | null; directProductCount: number };
type ApprovedReparent = { id: string; fromParentId: string | null; toParentKey: string };
type MappingFile = { mappings?: Record<string, string>; approvedReparents?: Record<string, ApprovedReparent> };

function fail(message: string): never { throw new Error(`Women taxonomy import blocked: ${message}`); }

async function loadExistingCategories(): Promise<ExistingCategory[]> {
  try {
    const categories = await prisma.productCategory.findMany({
      select: { id: true, name: true, slug: true, taxonomyKey: true, parentId: true, _count: { select: { products: true, subProducts: true } } },
    });
    return categories.map(({ _count, ...category }) => ({ ...category, directProductCount: _count.products + _count.subProducts }));
  } catch (error) {
    if (!(error && typeof error === "object" && "code" in error && error.code === "P2022")) throw error;
    // Dry runs remain read-only and useful before the schema migration is applied.
    const legacy = await prisma.productCategory.findMany({
      select: { id: true, name: true, slug: true, parentId: true, _count: { select: { products: true, subProducts: true } } },
    });
    return legacy.map(({ _count, ...category }) => ({ ...category, taxonomyKey: null, directProductCount: _count.products + _count.subProducts }));
  }
}

async function main() {
  if (new Set(plan).size !== plan.length) fail("duplicate taxonomy keys");
  if (entries.some((entry) => entry.depth > 3)) fail("taxonomy exceeds the three-level category limit");
  if (new Set(entries.map((entry) => entry.slug)).size !== entries.length) fail("duplicate taxonomy slugs");
  const existing = await loadExistingCategories();
  const mappingFile: MappingFile = mappingFlag ? JSON.parse(await readFile(mappingFlag.slice("--mapping-file=".length), "utf8") as string) : {};
  const mappings = mappingFile.mappings ?? {};
  const approvedReparents = mappingFile.approvedReparents ?? {};
  if (mappingFlag && Object.values(mappings).some((id, index, ids) => ids.indexOf(id) !== index)) fail("a legacy category can map to only one canonical key");
  const byKey = new Map(existing.filter((category) => category.taxonomyKey).map((category) => [category.taxonomyKey!, category]));
  const bySlug = new Map(existing.map((category) => [category.slug, category]));
  const byId = new Map(existing.map((category) => [category.id, category]));
  const childrenOf = (id: string) => existing.filter((category) => category.parentId === id);
  const pathOf = (category: ExistingCategory): string[] => {
    const parent = category.parentId ? byId.get(category.parentId) : undefined;
    return parent ? [...pathOf(parent), category.name] : [category.name];
  };
  const subtreeProductCount = (category: ExistingCategory): number => category.directProductCount + childrenOf(category.id).reduce((count, child) => count + subtreeProductCount(child), 0);
  const subtreeHeight = (category: ExistingCategory): number => {
    const children = childrenOf(category.id);
    return children.length ? 1 + Math.max(...children.map(subtreeHeight)) : 1;
  };
  const canonicalByKey = new Map(entries.map((entry) => [entry.key, entry]));
  const canonicalPath = (entry: (typeof entries)[number]): string[] => entry.parentKey ? [...canonicalPath(canonicalByKey.get(entry.parentKey)!), entry.name] : [entry.name];
  const report = {
    version: WOMENS_TAXONOMY_VERSION,
    mode: apply ? "apply" : "dry-run",
    create: [] as string[], reuse: [] as string[], pendingHierarchyChanges: [] as string[], unchanged: [] as string[], slugConflicts: [] as string[], parentConflicts: [] as string[], proposedLegacyMappings: [] as string[], ambiguousMappings: [] as string[],
    legacyMappings: [] as Array<{ key: string; proposedCanonicalPath: string[]; existing: { path: string[]; id: string; slug: string; directProductCount: number; descendantProductCount: number; children: Array<{ id: string; name: string; slug: string }> }; proposedParent: string | null; requiresReparent: boolean; subtreeFitsThreeLevels: boolean }>,
  };
  const expectedParent = new Map(entries.map((entry) => [entry.key, entry.parentKey]));
  for (const entry of entries) {
    const keyed = byKey.get(entry.key);
    const mapped = mappings[entry.key] ? existing.find((category) => category.id === mappings[entry.key]) : undefined;
    const slugged = bySlug.get(entry.slug);
    if (keyed) {
      const actualParentKey = keyed.parentId ? existing.find((category) => category.id === keyed.parentId)?.taxonomyKey ?? null : null;
      if (actualParentKey !== expectedParent.get(entry.key)) report.parentConflicts.push(`${entry.key}: existing taxonomy key has a different parent`);
      else report.unchanged.push(entry.key);
    } else if (mapped) {
      const expectedParentId = entry.parentKey ? mappings[entry.parentKey] ?? byKey.get(entry.parentKey)?.id : null;
      const requiresReparent = mapped.parentId !== expectedParentId;
      const fitsThreeLevels = entry.depth + subtreeHeight(mapped) - 1 <= 3;
      report.legacyMappings.push({
        key: entry.key,
        proposedCanonicalPath: canonicalPath(entry),
        existing: { path: pathOf(mapped), id: mapped.id, slug: mapped.slug, directProductCount: mapped.directProductCount, descendantProductCount: subtreeProductCount(mapped), children: childrenOf(mapped.id).map(({ id, name, slug }) => ({ id, name, slug })) },
        proposedParent: entry.parentKey,
        requiresReparent,
        subtreeFitsThreeLevels: fitsThreeLevels,
      });
      const approval = approvedReparents[entry.key];
      const approved = approval?.id === mapped.id && approval.fromParentId === mapped.parentId && approval.toParentKey === entry.parentKey;
      if (!fitsThreeLevels) report.pendingHierarchyChanges.push(`${entry.key}: mapped subtree would exceed the three-level limit after reparenting`);
      else if (requiresReparent && !approved) report.pendingHierarchyChanges.push(`${entry.key}: ${mapped.id} (${mapped.slug}) parent ${mapped.parentId ?? "root"} -> ${expectedParentId ?? `new ${entry.parentKey ?? "root"}`} requires an exact approvedReparents entry`);
      else report.reuse.push(entry.key);
    } else if (slugged) {
      report.slugConflicts.push(`${entry.key}: slug ${entry.slug} belongs to legacy category ${slugged.id}`);
    } else {
      const sameName = existing.filter((category) => category.name.localeCompare(entry.name, undefined, { sensitivity: "accent" }) === 0);
      if (sameName.length === 1) report.proposedLegacyMappings.push(`${entry.key} -> ${sameName[0].id} (${sameName[0].slug})`);
      if (sameName.length > 1) report.ambiguousMappings.push(`${entry.key}: ${sameName.map((category) => category.id).join(", ")}`);
      report.create.push(entry.key);
    }
  }
  console.log(JSON.stringify(report, null, 2));
  if (!apply) return;
  if (report.slugConflicts.length || report.parentConflicts.length || report.ambiguousMappings.length || report.pendingHierarchyChanges.length) fail("review the dry-run conflict report before applying");
  if (report.proposedLegacyMappings.length) fail("review legacy mappings; parallel categories are never created automatically");
  const reusableKeys = new Set(report.reuse);
  const newEntries = entries.filter((entry) => !byKey.has(entry.key) && !reusableKeys.has(entry.key));
  const generatedIds = new Map(newEntries.map((entry) => [entry.key, randomUUID()]));
  await prisma.$transaction(async (tx) => {
    // Revalidate under the write transaction so a concurrent importer cannot
    // slip a key or slug between report generation and insertion.
    const conflicts = await tx.productCategory.findMany({ where: { OR: [{ taxonomyKey: { in: newEntries.map((entry) => entry.key) } }, { slug: { in: newEntries.map((entry) => entry.slug) } }] }, select: { id: true, taxonomyKey: true, slug: true, parentId: true } });
    if (conflicts.length) fail("taxonomy changed after dry run; run dry-run again");
    const existingIds = new Map(existing.filter((category) => category.taxonomyKey).map((category) => [category.taxonomyKey!, category.id]));
    // A reviewed legacy category may itself be a canonical parent (Watches).
    // Its stable ID is safe to reference before the final guarded reparent/key update.
    for (const entry of entries.filter((candidate) => reusableKeys.has(candidate.key))) existingIds.set(entry.key, mappings[entry.key]);
    for (const depth of [1, 2, 3]) {
      const batch = newEntries.filter((entry) => entry.depth === depth);
      if (!batch.length) continue;
      await tx.productCategory.createMany({ data: batch.map((entry) => ({ id: generatedIds.get(entry.key)!, name: entry.name, slug: entry.slug, taxonomyKey: entry.key, parentId: entry.parentKey ? generatedIds.get(entry.parentKey) ?? existingIds.get(entry.parentKey) ?? fail(`parent ${entry.parentKey} was not resolved`) : null, sortOrder: entries.indexOf(entry) })) });
    }
    const transactionCategories = await tx.productCategory.findMany({ select: { id: true, parentId: true, taxonomyKey: true } });
    const transactionChildren = (id: string) => transactionCategories.filter((category) => category.parentId === id);
    const transactionHeight = (id: string): number => {
      const children = transactionChildren(id);
      return children.length ? 1 + Math.max(...children.map((child) => transactionHeight(child.id))) : 1;
    };
    for (const entry of entries.filter((candidate) => reusableKeys.has(candidate.key))) {
      const mappedId = mappings[entry.key];
      const approval = approvedReparents[entry.key];
      const targetParentId = entry.parentKey ? generatedIds.get(entry.parentKey) ?? existingIds.get(entry.parentKey) : null;
      if (entry.parentKey && !targetParentId) fail(`approved parent ${entry.parentKey} was not resolved`);
      const current = transactionCategories.find((category) => category.id === mappedId);
      if (!current || current.taxonomyKey) fail(`mapped category for ${entry.key} changed after dry run; run dry-run again`);
      if (current.parentId !== approval?.fromParentId || approval.id !== mappedId || approval.toParentKey !== entry.parentKey) fail(`approved reparent for ${entry.key} no longer matches database state`);
      if (entry.depth + transactionHeight(mappedId) - 1 > 3) fail(`approved reparent for ${entry.key} would exceed the three-level limit`);
      const result = await tx.productCategory.updateMany({ where: { id: mappedId, parentId: approval.fromParentId, taxonomyKey: null }, data: { parentId: targetParentId, taxonomyKey: entry.key } });
      if (result.count !== 1) fail(`mapped category for ${entry.key} changed during apply; transaction rolled back`);
      existingIds.set(entry.key, mappedId);
    }
  }, { maxWait: 5_000, timeout: 30_000 });
}

if (process.argv[1]?.endsWith("import-womens-taxonomy.mts")) main().finally(async () => { await prisma.$disconnect(); await pool.end(); });
