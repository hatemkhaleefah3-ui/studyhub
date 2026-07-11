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
