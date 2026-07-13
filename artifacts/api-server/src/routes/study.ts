import { Router } from "express";
import { db } from "@workspace/db";
import {
  studySubjects,
  studySchedule,
  studyChecklist,
  studySettings,
  studyArchive,
} from "@workspace/db";
import { eq, desc } from "drizzle-orm";

const router = Router();

// ─── Helpers ──────────────────────────────────────────────────────────────────

type ArchiveCategory = "subject" | "schedule" | "checklist";

const TABLES: Record<ArchiveCategory, typeof studySubjects | typeof studySchedule | typeof studyChecklist> = {
  subject: studySubjects,
  schedule: studySchedule,
  checklist: studyChecklist,
};

// Moves a row from its live table into the archive (soft delete).
// No-op (resolves silently) if the row no longer exists.
async function archiveRow(category: ArchiveCategory, id: string) {
  const table = TABLES[category];
  const existing = await db.select().from(table as any).where(eq((table as any).id, id)).limit(1);
  if (!existing.length) return;
  await db.insert(studyArchive).values({
    id: crypto.randomUUID(),
    category,
    originalId: id,
    data: existing[0].data,
    deletedAt: new Date().toISOString(),
  });
  await db.delete(table as any).where(eq((table as any).id, id));
}

async function getAllData() {
  const [subjects, schedule, checklist, settingsRows] = await Promise.all([
    db.select().from(studySubjects),
    db.select().from(studySchedule),
    db.select().from(studyChecklist),
    db.select().from(studySettings),
  ]);

  const settings = settingsRows.reduce<Record<string, string>>((acc, row) => {
    acc[row.key] = row.value;
    return acc;
  }, {});

  return {
    subjects: subjects.map((r) => r.data),
    schedule: schedule.map((r) => r.data),
    checklist: checklist.map((r) => r.data),
    settings: {
      theme: settings["theme"] ?? "light",
      accentColor: settings["accentColor"] ?? "blue",
    },
  };
}

// ─── GET /api/study/data ──────────────────────────────────────────────────────
router.get("/data", async (_req, res) => {
  try {
    return res.json(await getAllData());
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
});

// ─── Settings ─────────────────────────────────────────────────────────────────
router.put("/settings", async (req, res) => {
  try {
    const { theme, accentColor } = req.body as { theme?: string; accentColor?: string };
    const upserts = [];
    if (theme !== undefined) {
      upserts.push(
        db.insert(studySettings).values({ key: "theme", value: theme })
          .onConflictDoUpdate({ target: studySettings.key, set: { value: theme } })
      );
    }
    if (accentColor !== undefined) {
      upserts.push(
        db.insert(studySettings).values({ key: "accentColor", value: accentColor })
          .onConflictDoUpdate({ target: studySettings.key, set: { value: accentColor } })
      );
    }
    await Promise.all(upserts);
    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
});

// ─── Subjects CRUD ────────────────────────────────────────────────────────────
router.post("/subjects", async (req, res) => {
  try {
    const subject = req.body;
    await db.insert(studySubjects).values({ id: subject.id, data: subject });
    return res.json(subject);
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
});

router.put("/subjects/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await db.select().from(studySubjects).where(eq(studySubjects.id, id)).limit(1);
    if (!existing.length) return res.status(404).json({ error: "Not found" });
    const updated = { ...(existing[0].data as object), ...req.body };
    await db.update(studySubjects).set({ data: updated }).where(eq(studySubjects.id, id));
    return res.json(updated);
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
});

router.delete("/subjects/:id", async (req, res) => {
  try {
    const { id } = req.params;
    // Archive the subject, then cascade-archive linked schedule + checklist items
    await archiveRow("subject", id);
    const scheduleRows = await db.select().from(studySchedule);
    for (const row of scheduleRows) {
      const ev = row.data as any;
      if (ev.subjectId === id) await archiveRow("schedule", row.id);
    }
    const checklistRows = await db.select().from(studyChecklist);
    for (const row of checklistRows) {
      const item = row.data as any;
      if (item.subjectId === id) await archiveRow("checklist", row.id);
    }
    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
});

// ─── Lectures (nested in subject.data) ───────────────────────────────────────
router.post("/subjects/:subjectId/lectures", async (req, res) => {
  try {
    const { subjectId } = req.params;
    const existing = await db.select().from(studySubjects).where(eq(studySubjects.id, subjectId)).limit(1);
    if (!existing.length) return res.status(404).json({ error: "Subject not found" });
    const subject = existing[0].data as any;
    subject.lectures = [...(subject.lectures || []), req.body];
    await db.update(studySubjects).set({ data: subject }).where(eq(studySubjects.id, subjectId));
    return res.json(req.body);
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
});

router.put("/subjects/:subjectId/lectures/:id", async (req, res) => {
  try {
    const { subjectId, id } = req.params;
    const existing = await db.select().from(studySubjects).where(eq(studySubjects.id, subjectId)).limit(1);
    if (!existing.length) return res.status(404).json({ error: "Subject not found" });
    const subject = existing[0].data as any;
    subject.lectures = (subject.lectures || []).map((l: any) =>
      l.id === id ? { ...l, ...req.body } : l
    );
    await db.update(studySubjects).set({ data: subject }).where(eq(studySubjects.id, subjectId));
    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
});

router.delete("/subjects/:subjectId/lectures/:id", async (req, res) => {
  try {
    const { subjectId, id } = req.params;
    const existing = await db.select().from(studySubjects).where(eq(studySubjects.id, subjectId)).limit(1);
    if (!existing.length) return res.status(404).json({ error: "Subject not found" });
    const subject = existing[0].data as any;
    subject.lectures = (subject.lectures || []).filter((l: any) => l.id !== id);
    await db.update(studySubjects).set({ data: subject }).where(eq(studySubjects.id, subjectId));
    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
});

// ─── Exams (nested in subject.data) ──────────────────────────────────────────
router.post("/subjects/:subjectId/exams", async (req, res) => {
  try {
    const { subjectId } = req.params;
    const existing = await db.select().from(studySubjects).where(eq(studySubjects.id, subjectId)).limit(1);
    if (!existing.length) return res.status(404).json({ error: "Subject not found" });
    const subject = existing[0].data as any;
    subject.exams = [...(subject.exams || []), req.body];
    await db.update(studySubjects).set({ data: subject }).where(eq(studySubjects.id, subjectId));
    return res.json(req.body);
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
});

router.put("/subjects/:subjectId/exams/:id", async (req, res) => {
  try {
    const { subjectId, id } = req.params;
    const existing = await db.select().from(studySubjects).where(eq(studySubjects.id, subjectId)).limit(1);
    if (!existing.length) return res.status(404).json({ error: "Subject not found" });
    const subject = existing[0].data as any;
    subject.exams = (subject.exams || []).map((e: any) =>
      e.id === id ? { ...e, ...req.body } : e
    );
    await db.update(studySubjects).set({ data: subject }).where(eq(studySubjects.id, subjectId));
    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
});

router.delete("/subjects/:subjectId/exams/:id", async (req, res) => {
  try {
    const { subjectId, id } = req.params;
    const existing = await db.select().from(studySubjects).where(eq(studySubjects.id, subjectId)).limit(1);
    if (!existing.length) return res.status(404).json({ error: "Subject not found" });
    const subject = existing[0].data as any;
    subject.exams = (subject.exams || []).filter((e: any) => e.id !== id);
    await db.update(studySubjects).set({ data: subject }).where(eq(studySubjects.id, subjectId));
    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
});

// ─── Schedule CRUD ────────────────────────────────────────────────────────────
router.post("/schedule", async (req, res) => {
  try {
    const event = req.body;
    await db.insert(studySchedule).values({ id: event.id, data: event });

    // Optionally create linked checklist item
    if (req.query["createChecklist"] === "1") {
      const task = {
        id: crypto.randomUUID(),
        text: event.title,
        subjectId: event.subjectId || null,
        done: false,
        linkedScheduleId: event.id,
        isTaskList: false,
      };
      await db.insert(studyChecklist).values({ id: task.id, data: task });
      // Update event with checklistItemId
      const updatedEvent = { ...event, checklistItemId: task.id };
      await db.update(studySchedule).set({ data: updatedEvent }).where(eq(studySchedule.id, event.id));
    }

    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
});

router.put("/schedule/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await db.select().from(studySchedule).where(eq(studySchedule.id, id)).limit(1);
    if (!existing.length) return res.status(404).json({ error: "Not found" });
    const updated = { ...(existing[0].data as object), ...req.body };
    await db.update(studySchedule).set({ data: updated }).where(eq(studySchedule.id, id));
    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
});

router.delete("/schedule/:id", async (req, res) => {
  try {
    await archiveRow("schedule", req.params.id);
    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
});

// ─── Checklist CRUD ───────────────────────────────────────────────────────────
router.post("/checklist", async (req, res) => {
  try {
    const item = req.body;
    await db.insert(studyChecklist).values({ id: item.id, data: item });
    return res.json(item);
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
});

router.put("/checklist/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await db.select().from(studyChecklist).where(eq(studyChecklist.id, id)).limit(1);
    if (!existing.length) return res.status(404).json({ error: "Not found" });
    const updated = { ...(existing[0].data as object), ...req.body };
    await db.update(studyChecklist).set({ data: updated }).where(eq(studyChecklist.id, id));
    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
});

router.delete("/checklist/:id", async (req, res) => {
  try {
    await archiveRow("checklist", req.params.id);
    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
});

// ─── Archive ──────────────────────────────────────────────────────────────────
router.get("/archive", async (_req, res) => {
  try {
    const rows = await db.select().from(studyArchive).orderBy(desc(studyArchive.deletedAt));
    return res.json(rows.map((r) => ({
      id: r.id,
      category: r.category,
      originalId: r.originalId,
      deletedAt: r.deletedAt,
      data: r.data,
    })));
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
});

router.post("/archive/:id/restore", async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await db.select().from(studyArchive).where(eq(studyArchive.id, id)).limit(1);
    if (!existing.length) return res.status(404).json({ error: "Not found" });
    const row = existing[0];
    const category = row.category as ArchiveCategory;
    const table = TABLES[category];
    if (!table) return res.status(400).json({ error: "Unknown category" });
    await db.insert(table as any).values({ id: row.originalId, data: row.data });
    await db.delete(studyArchive).where(eq(studyArchive.id, id));
    return res.json({ ok: true, category, item: row.data });
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
});

router.delete("/archive/:id", async (req, res) => {
  try {
    await db.delete(studyArchive).where(eq(studyArchive.id, req.params.id));
    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
});

// ─── SubTasks (nested in checklist item data) ─────────────────────────────────
router.post("/checklist/:id/subtasks", async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await db.select().from(studyChecklist).where(eq(studyChecklist.id, id)).limit(1);
    if (!existing.length) return res.status(404).json({ error: "Not found" });
    const item = existing[0].data as any;
    const newSubTask = { id: crypto.randomUUID(), text: req.body.text, done: false };
    item.subTasks = [...(item.subTasks || []), newSubTask];
    await db.update(studyChecklist).set({ data: item }).where(eq(studyChecklist.id, id));
    return res.json(newSubTask);
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
});

router.put("/checklist/:id/subtasks/:sid", async (req, res) => {
  try {
    const { id, sid } = req.params;
    const existing = await db.select().from(studyChecklist).where(eq(studyChecklist.id, id)).limit(1);
    if (!existing.length) return res.status(404).json({ error: "Not found" });
    const item = existing[0].data as any;
    item.subTasks = (item.subTasks || []).map((st: any) =>
      st.id === sid ? { ...st, ...req.body } : st
    );
    await db.update(studyChecklist).set({ data: item }).where(eq(studyChecklist.id, id));
    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
});

router.delete("/checklist/:id/subtasks/:sid", async (req, res) => {
  try {
    const { id, sid } = req.params;
    const existing = await db.select().from(studyChecklist).where(eq(studyChecklist.id, id)).limit(1);
    if (!existing.length) return res.status(404).json({ error: "Not found" });
    const item = existing[0].data as any;
    item.subTasks = (item.subTasks || []).filter((st: any) => st.id !== sid);
    await db.update(studyChecklist).set({ data: item }).where(eq(studyChecklist.id, id));
    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
});

// ─── Export / Import / Reset ──────────────────────────────────────────────────
router.get("/export", async (_req, res) => {
  try {
    return res.json(await getAllData());
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
});

router.post("/import", async (req, res) => {
  try {
    const { subjects = [], schedule = [], checklist = [], settings } = req.body as any;

    // Wipe existing data
    await Promise.all([
      db.delete(studySubjects),
      db.delete(studySchedule),
      db.delete(studyChecklist),
      db.delete(studySettings),
      db.delete(studyArchive),
    ]);

    // Insert imported data
    if (subjects.length) await db.insert(studySubjects).values(subjects.map((s: any) => ({ id: s.id, data: s })));
    if (schedule.length) await db.insert(studySchedule).values(schedule.map((e: any) => ({ id: e.id, data: e })));
    if (checklist.length) await db.insert(studyChecklist).values(checklist.map((c: any) => ({ id: c.id, data: c })));
    if (settings) {
      const entries = Object.entries(settings).map(([key, value]) => ({ key, value: String(value) }));
      if (entries.length) await db.insert(studySettings).values(entries);
    }

    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
});

router.delete("/reset", async (_req, res) => {
  try {
    await Promise.all([
      db.delete(studySubjects),
      db.delete(studySchedule),
      db.delete(studyChecklist),
      db.delete(studySettings),
      db.delete(studyArchive),
    ]);
    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
});

export default router;
