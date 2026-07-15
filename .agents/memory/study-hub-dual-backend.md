---
    name: Study Hub dual backend
    description: Study Hub has two parallel API implementations that must stay in sync — required reading before touching any /api/study/* route.
    ---

    The `studyhub` repo (artifact `study-hub` + `api-server`) serves `/api/study/*` from two independent implementations that must be changed together:

    - `artifacts/api-server/src/routes/study.ts` — Express + Postgres (Drizzle), used in the Replit dev/staging environment.
    - `functions/api/study/[[path]].ts` — Cloudflare Pages Function + D1 (raw SQL), used in production (production runs on Cloudflare Pages, not the Replit dev server).

    **Why:** production deploys to Cloudflare Pages, which never runs the Express server — it only executes the Functions catch-all. A route/behavior added only in one place silently doesn't exist (or diverges) in the other environment.

    **How to apply:** any schema or route change (new table, new endpoint, changed delete semantics, etc.) needs: (1) the Drizzle schema in `lib/db/src/schema/study.ts`, (2) a matching table in `schema.sql` (D1, run manually via `wrangler d1 execute <db> --file=schema.sql` — this repo has no automated prod migration step), (3) the Express route, and (4) the mirrored Cloudflare Function route. Also check both backends' `/reset` and `/import` wipe-lists whenever a new table is added.
    