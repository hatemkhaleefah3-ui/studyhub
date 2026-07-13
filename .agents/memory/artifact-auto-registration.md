---
name: Artifact auto-registration from disk
description: The Replit platform auto-registers/unregisters artifacts by scanning for .replit-artifact/artifact.toml files, independent of explicit createArtifact calls.
---

The platform continuously scans the workspace for `.replit-artifact/artifact.toml` files and keeps the artifact registry (and the workflow list) in sync with what it finds on disk — it does not wait for a `createArtifact` call.

**Why:** While importing an existing project, an old artifact directory was renamed (not deleted) to get it out of the way during a merge. Because it still contained its own `.replit-artifact/artifact.toml` with a `previewPath`, the platform auto-registered it as a second artifact and spun up an extra workflow, colliding with the real artifact's `previewPath`.

**How to apply:** When reorganizing or replacing an artifact directory (e.g. merging real app content into a freshly scaffolded one), delete the old directory outright rather than renaming/moving it elsewhere in the workspace — or strip/move its `.replit-artifact/artifact.toml` first. Renaming alone does not stop the auto-registration. After such an operation, check `listArtifacts()` and the configured-workflows list for stray duplicates.
