import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
const source = readFileSync(resolve(process.cwd(), "src/components/marketplace/illustrated-empty-state.tsx"), "utf8");
describe("IllustratedEmptyState action contract", () => {
  it("uses a discriminated link-or-callback action and only links href actions", () => {
    expect(source).toContain("type NavigationEmptyStateAction");
    expect(source).toContain("type CallbackEmptyStateAction");
    expect(source).toContain("function isNavigationAction");
    expect(source).toContain('typeof action.href === "string"');
    expect(source).toContain("isNavigationAction(action) ?");
    expect(source).toContain("<Button onClick={action.onClick}");
  });
  it("keeps navigation actions rendered through Next Link", () => expect(source).toContain("<Link href={action.href}"));
});
