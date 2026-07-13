---
name: Cloudflare D1 schema migrations don't auto-apply
description: Why a D1-backed feature can work in dev (Postgres mirror) but silently fail in production until the schema is manually applied.
---

Cloudflare Pages deploys only ship code (including `functions/api/**`). They never run
`schema.sql` / migrations against the bound D1 database. If a new table (e.g. an archive/
soft-delete table) is added to `schema.sql` after the D1 database was first created, production
keeps running against the old schema until someone explicitly applies the new SQL.

**Symptom pattern to recognize:** a feature that depends on a new table works perfectly against
the local dev mirror (Postgres/Express) but silently no-ops or reverts in production — e.g.
deletes "work" (optimistic UI update) but reappear on reload, and a dependent feature (like an
archive view) stays permanently empty. That combination points at a missing table/column in the
live D1 database, not an app-code bug.

**How to apply the fix without CLI access:** the user doesn't need `wrangler` installed — the
Cloudflare dashboard has a built-in SQL console (Workers & Pages → D1 → select database →
Console tab) that works from any browser, including mobile/tablet. Paste the missing
`CREATE TABLE IF NOT EXISTS ...` statement there directly. Confirmed this path works when the
user only had an iPad and no terminal.

**Why:** deploy pipelines for static/serverless platforms (Pages, Vercel, etc.) generally treat
DB schema changes as a separate, manual, non-code-triggered step unless you explicitly wire in a
migration-on-deploy hook.

**How to apply:** whenever a D1/serverless-DB-backed feature "works in dev, not in prod," check
schema drift between `schema.sql` and the actual production database before assuming an app bug.
