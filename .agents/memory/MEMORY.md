# Memory Index

- [Artifact auto-registration from disk](artifact-auto-registration.md) — the platform scans for `.replit-artifact/artifact.toml` and auto-registers/unregisters artifacts just from files existing/moving, independent of `createArtifact` calls.
- [Git tooling gotchas](git-tooling-gotchas.md) — `gitPull` can time out on a first-time fetch of a large repo; TS `noImplicitReturns` needs explicit `return` on every branch of an Express handler, including the catch block.
- [D1 schema migrations don't auto-apply](d1-schema-migrations.md) — Cloudflare Pages deploys ship code only; a new D1 table stays missing in prod until applied manually via dashboard SQL console or wrangler.
