---
name: Git tooling gotchas
description: gitPull timeout workaround, and TypeScript noImplicitReturns quirks with Express handlers.
---

## gitPull can time out on first fetch
The `gitPull` callback timed out when pulling a repo into a workspace that had no prior git history synced. Falling back to shell `git fetch origin <branch>` + `git reset --hard FETCH_HEAD` worked reliably instead. Safe to do this when the local repo only has untouched/scaffold content worth discarding — otherwise prefer a normal merge.

## noImplicitReturns + Express handlers
When a repo's `tsconfig.json` has `noImplicitReturns` enabled, an async Express route handler where one branch does `return res.status(x).json(...)` and another branch just calls `res.json(...)` without `return` (or where the `catch` block doesn't `return` its `res.status(500).json(...)`) trips `TS7030: Not all code paths return a value`. Fix by making every `res.json(...)` / `res.status(...).json(...)` call in the handler — including inside `catch` blocks — consistently prefixed with `return`. Doing only the try-block or only the catch-block half still leaves the mismatch (just flips which lines error).
