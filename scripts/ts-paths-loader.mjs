// Narrow Node loader used only by the sandbox qualification CLI.  It lets the
// CLI execute the same TypeScript services and @/ aliases as the application.
import { existsSync } from "node:fs";
import { dirname, resolve as resolvePath } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export async function resolve(specifier, context, nextResolve) {
  // Node's ESM resolver requires Next's extension while application bundling
  // accepts `next/headers`; qualification CLIs reuse app services directly.
  if (specifier === "next/headers") return nextResolve("next/headers.js", context);
  let base;
  if (specifier.startsWith("@/")) {
    base = resolvePath(process.cwd(), "src", specifier.slice(2));
  } else if (specifier.startsWith(".") && context.parentURL?.startsWith("file:")) {
    base = resolvePath(dirname(fileURLToPath(context.parentURL)), specifier);
  }
  if (base && !/\.[cm]?[jt]sx?$/.test(base)) {
    for (const extension of [".ts", ".tsx", ".js", ".mjs"]) {
      if (existsSync(base + extension)) return { url: pathToFileURL(base + extension).href, shortCircuit: true };
    }
  }
  return nextResolve(specifier, context);
}
