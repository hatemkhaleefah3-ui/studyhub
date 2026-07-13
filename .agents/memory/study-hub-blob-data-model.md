---
name: Study Hub blob-only data model
description: Lectures/exams are JSON arrays nested inside subject.data, not separate tables/columns — implications for adding new fields.
---

Study Hub's `study_subjects`/`study_schedule`/`study_checklist` tables (Postgres via the Express API server, D1 via the Cloudflare Pages Function) each store a single `{ id, data: jsonb }` blob. Lectures and exams are **not** separate rows or columns — they live as arrays embedded inside `subject.data` (`subject.lectures`, `subject.exams`).

**Why it matters:** adding a new field to a Lecture/Exam/Flashcard/etc. (e.g. `type`, `checked`, `flashcards`, `questions`, `linkedLectureIds`) requires **no DB schema migration and no backend route change**. Both backends already do generic spread-merge PUT/POST on the JSON blob, so any new TypeScript field on the frontend just rides through as-is.

**How to apply:** before assuming a Study Hub feature needs backend work, check whether the new data is just another field on an existing embedded object. If so, only touch `useStudyData.tsx` (types + CRUD) and the pages — skip `artifacts/api-server/src/routes/study.ts` and `functions/api/study/[[path]].ts` entirely. For records created before a new optional field existed, backfill/default the field client-side on load (e.g. a `normalizeSubject` pass) rather than forcing a reclassification or migration.
