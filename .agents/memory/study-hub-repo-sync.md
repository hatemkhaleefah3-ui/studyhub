---
    name: Study Hub repo sync (studyhub GitHub repo)
    description: How this workspace stays in sync with the external hatemkhaleefah3-ui/studyhub GitHub repo, and quirks to know before pushing changes.
    ---

    This Replit project is the working copy for `hatemkhaleefah3-ui/studyhub` (git remote `origin`), which deploys to Cloudflare Pages + D1 in production. The user merges PRs manually on GitHub — never merge for them, just hand back the PR URL.

    - The `study-hub` artifact's frontend does NOT use the workspace's generated OpenAPI client (`lib/api-client-react`/`lib/api-zod`). It has its own hand-written fetch wrapper at `artifacts/study-hub/src/lib/api.ts` calling `/api/study/*` directly. No codegen step is needed when changing study routes.
    - See `study-hub-dual-backend.md` for the Express-vs-Cloudflare-Functions route mirroring requirement — required reading before touching any `/api/study/*` route or table.
    - When pulling fresh files from `origin/main` on top of this workspace's scaffold, exclude `.replit` and each artifact's `.replit-artifact/` directory from the checkout — those are platform-managed and regenerated locally (e.g. `.replit` gains `postgresql-16`/nix-channel entries only when a DB is actually provisioned here).
    - The pulled repo's Express route handlers (`artifacts/api-server/src/routes/study.ts`) used bare `return res.status(x).json(y)` in several handlers, which fails this workspace's stricter TS build (`TS7030: not all code paths return a value`) even though the pulled repo itself may not run that check. Fix pattern: split into `{ res.status(x).json(y); return; }` rather than rewriting the logic.
    