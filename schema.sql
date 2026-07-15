-- Cloudflare D1 schema for Study Hub
-- Run once after creating your D1 database:
--   wrangler d1 execute study-hub-db --file=schema.sql

CREATE TABLE IF NOT EXISTS study_subjects (
  id   TEXT PRIMARY KEY,
  data TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS study_schedule (
  id   TEXT PRIMARY KEY,
  data TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS study_checklist (
  id   TEXT PRIMARY KEY,
  data TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS study_settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- Archive: soft-deleted items (subjects, schedule events, checklist items).
-- Deleting an item moves its row here instead of removing it permanently.
CREATE TABLE IF NOT EXISTS study_archive (
  id          TEXT PRIMARY KEY,
  category    TEXT NOT NULL,
  original_id TEXT NOT NULL,
  data        TEXT NOT NULL,
  deleted_at  TEXT NOT NULL
);
