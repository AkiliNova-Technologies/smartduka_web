<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Client/server data boundaries

- Page and UI components must not contain endpoint strings, `fetch`/axios calls, or HTTP response parsing.
- Client features consume hooks. Hooks own loading, error, cancellation, mutations, and cache invalidation; typed API clients in `src/lib/*-client.ts` own endpoint paths and transport details.
- Server Components call server-only services/repositories directly. Route handlers stay thin: authentication, validation, and service invocation only.
- Business rules and database access belong in services/repositories. Prefer existing clients, hooks, and cache conventions over new abstraction layers.
