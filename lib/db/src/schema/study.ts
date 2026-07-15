import { pgTable, text, jsonb } from "drizzle-orm/pg-core";

export const studySubjects = pgTable("study_subjects", {
  id: text("id").primaryKey(),
  data: jsonb("data").notNull(),
});

export const studySchedule = pgTable("study_schedule", {
  id: text("id").primaryKey(),
  data: jsonb("data").notNull(),
});

export const studyChecklist = pgTable("study_checklist", {
  id: text("id").primaryKey(),
  data: jsonb("data").notNull(),
});

export const studySettings = pgTable("study_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});

// Archive: soft-deleted items (subjects, schedule events, checklist items).
// Deleting an item moves its row here instead of removing it permanently,
// so it can be restored or purged later from the Archive UI.
export const studyArchive = pgTable("study_archive", {
  id: text("id").primaryKey(),
  category: text("category").notNull(), // 'subject' | 'schedule' | 'checklist'
  originalId: text("original_id").notNull(),
  data: jsonb("data").notNull(),
  deletedAt: text("deleted_at").notNull(),
});
