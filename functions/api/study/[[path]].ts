/**
 * Cloudflare Pages Function — catch-all for /api/study/*
 *
 * Mirrors every route in artifacts/api-server/src/routes/study.ts,
 * using D1 instead of PostgreSQL.
 *
 * D1 binding name: DB  (set in wrangler.toml and Cloudflare dashboard)
 *
 * Tables (create with schema.sql):
 *   study_subjects   (id TEXT PRIMARY KEY, data TEXT)
 *   study_schedule   (id TEXT PRIMARY KEY, data TEXT)
 *   study_checklist  (id TEXT PRIMARY KEY, data TEXT)
 *   study_settings   (key TEXT PRIMARY KEY, value TEXT)
 */

interface Env {
  DB: D1Database;
}

// ─── tiny helpers ─────────────────────────────────────────────────────────────

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

async function getAllData(db: D1Database) {
  const [subjects, schedule, checklist, settings] = await Promise.all([
    db.prepare("SELECT data FROM study_subjects").all(),
    db.prepare("SELECT data FROM study_schedule").all(),
    db.prepare("SELECT data FROM study_checklist").all(),
    db.prepare("SELECT key, value FROM study_settings").all(),
  ]);

  const settingsMap = Object.fromEntries(
    (settings.results as any[]).map((r) => [r.key, r.value])
  );

  return {
    subjects: (subjects.results as any[]).map((r) => JSON.parse(r.data)),
    schedule: (schedule.results as any[]).map((r) => JSON.parse(r.data)),
    checklist: (checklist.results as any[]).map((r) => JSON.parse(r.data)),
    settings: {
      theme: settingsMap["theme"] ?? "light",
      accentColor: settingsMap["accentColor"] ?? "blue",
    },
  };
}

function parseSegments(url: URL) {
  // Strip "/api/study" prefix and split remaining path
  const path = url.pathname.replace(/^\/api\/study\/?/, "");
  return path.split("/").filter(Boolean);
}

// ─── main handler ─────────────────────────────────────────────────────────────

export const onRequest: PagesFunction<Env> = async ({ request, env }) => {
  const db = env.DB;
  const url = new URL(request.url);
  const method = request.method.toUpperCase();
  const segs = parseSegments(url);

  let body: any = {};
  if (["POST", "PUT", "PATCH"].includes(method)) {
    try { body = await request.json(); } catch {}
  }

  try {
    // GET /api/study/data
    if (method === "GET" && segs[0] === "data") {
      return json(await getAllData(db));
    }

    // GET /api/study/export
    if (method === "GET" && segs[0] === "export") {
      return json(await getAllData(db));
    }

    // PUT /api/study/settings
    if (method === "PUT" && segs[0] === "settings") {
      const entries: [string, string][] = [];
      if (body.theme !== undefined) entries.push(["theme", body.theme]);
      if (body.accentColor !== undefined) entries.push(["accentColor", body.accentColor]);
      for (const [key, value] of entries) {
        await db.prepare("INSERT INTO study_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value")
          .bind(key, value).run();
      }
      return json({ ok: true });
    }

    // DELETE /api/study/reset
    if (method === "DELETE" && segs[0] === "reset") {
      await Promise.all([
        db.prepare("DELETE FROM study_subjects").run(),
        db.prepare("DELETE FROM study_schedule").run(),
        db.prepare("DELETE FROM study_checklist").run(),
        db.prepare("DELETE FROM study_settings").run(),
      ]);
      return json({ ok: true });
    }

    // POST /api/study/import
    if (method === "POST" && segs[0] === "import") {
      const { subjects = [], schedule = [], checklist = [], settings } = body;
      await Promise.all([
        db.prepare("DELETE FROM study_subjects").run(),
        db.prepare("DELETE FROM study_schedule").run(),
        db.prepare("DELETE FROM study_checklist").run(),
        db.prepare("DELETE FROM study_settings").run(),
      ]);
      for (const s of subjects) await db.prepare("INSERT INTO study_subjects (id, data) VALUES (?, ?)").bind(s.id, JSON.stringify(s)).run();
      for (const e of schedule) await db.prepare("INSERT INTO study_schedule (id, data) VALUES (?, ?)").bind(e.id, JSON.stringify(e)).run();
      for (const c of checklist) await db.prepare("INSERT INTO study_checklist (id, data) VALUES (?, ?)").bind(c.id, JSON.stringify(c)).run();
      if (settings) {
        for (const [key, value] of Object.entries(settings)) {
          await db.prepare("INSERT INTO study_settings (key, value) VALUES (?, ?)").bind(key, String(value)).run();
        }
      }
      return json({ ok: true });
    }

    // ── Subjects ──────────────────────────────────────────────────────────────
    if (segs[0] === "subjects") {
      const subjectId = segs[1];

      if (!subjectId) {
        if (method === "POST") {
          await db.prepare("INSERT INTO study_subjects (id, data) VALUES (?, ?)").bind(body.id, JSON.stringify(body)).run();
          return json(body);
        }
      }

      if (subjectId && !segs[2]) {
        if (method === "PUT") {
          const row = await db.prepare("SELECT data FROM study_subjects WHERE id=?").bind(subjectId).first() as any;
          if (!row) return json({ error: "Not found" }, 404);
          const updated = { ...JSON.parse(row.data), ...body };
          await db.prepare("UPDATE study_subjects SET data=? WHERE id=?").bind(JSON.stringify(updated), subjectId).run();
          return json(updated);
        }
        if (method === "DELETE") {
          await db.prepare("DELETE FROM study_subjects WHERE id=?").bind(subjectId).run();
          // Cascade delete schedule + checklist with this subjectId (best-effort)
          const schedRows = await db.prepare("SELECT id, data FROM study_schedule").all();
          for (const r of schedRows.results as any[]) {
            const ev = JSON.parse(r.data);
            if (ev.subjectId === subjectId) await db.prepare("DELETE FROM study_schedule WHERE id=?").bind(r.id).run();
          }
          const clRows = await db.prepare("SELECT id, data FROM study_checklist").all();
          for (const r of clRows.results as any[]) {
            const item = JSON.parse(r.data);
            if (item.subjectId === subjectId) await db.prepare("DELETE FROM study_checklist WHERE id=?").bind(r.id).run();
          }
          return json({ ok: true });
        }
      }

      // Lectures: /subjects/:subjectId/lectures[/:id]
      if (segs[2] === "lectures") {
        const lecId = segs[3];
        const row = await db.prepare("SELECT data FROM study_subjects WHERE id=?").bind(subjectId).first() as any;
        if (!row) return json({ error: "Subject not found" }, 404);
        const subject = JSON.parse(row.data);

        if (method === "POST") {
          subject.lectures = [...(subject.lectures || []), body];
          await db.prepare("UPDATE study_subjects SET data=? WHERE id=?").bind(JSON.stringify(subject), subjectId).run();
          return json(body);
        }
        if (method === "PUT" && lecId) {
          subject.lectures = (subject.lectures || []).map((l: any) => l.id === lecId ? { ...l, ...body } : l);
          await db.prepare("UPDATE study_subjects SET data=? WHERE id=?").bind(JSON.stringify(subject), subjectId).run();
          return json({ ok: true });
        }
        if (method === "DELETE" && lecId) {
          subject.lectures = (subject.lectures || []).filter((l: any) => l.id !== lecId);
          await db.prepare("UPDATE study_subjects SET data=? WHERE id=?").bind(JSON.stringify(subject), subjectId).run();
          return json({ ok: true });
        }
      }

      // Exams: /subjects/:subjectId/exams[/:id]
      if (segs[2] === "exams") {
        const examId = segs[3];
        const row = await db.prepare("SELECT data FROM study_subjects WHERE id=?").bind(subjectId).first() as any;
        if (!row) return json({ error: "Subject not found" }, 404);
        const subject = JSON.parse(row.data);

        if (method === "POST") {
          subject.exams = [...(subject.exams || []), body];
          await db.prepare("UPDATE study_subjects SET data=? WHERE id=?").bind(JSON.stringify(subject), subjectId).run();
          return json(body);
        }
        if (method === "PUT" && examId) {
          subject.exams = (subject.exams || []).map((e: any) => e.id === examId ? { ...e, ...body } : e);
          await db.prepare("UPDATE study_subjects SET data=? WHERE id=?").bind(JSON.stringify(subject), subjectId).run();
          return json({ ok: true });
        }
        if (method === "DELETE" && examId) {
          subject.exams = (subject.exams || []).filter((e: any) => e.id !== examId);
          await db.prepare("UPDATE study_subjects SET data=? WHERE id=?").bind(JSON.stringify(subject), subjectId).run();
          return json({ ok: true });
        }
      }
    }

    // ── Schedule ──────────────────────────────────────────────────────────────
    if (segs[0] === "schedule") {
      const eventId = segs[1];
      if (!eventId && method === "POST") {
        await db.prepare("INSERT INTO study_schedule (id, data) VALUES (?, ?)").bind(body.id, JSON.stringify(body)).run();
        if (url.searchParams.get("createChecklist") === "1") {
          const task = { id: crypto.randomUUID(), text: body.title, subjectId: body.subjectId || null, done: false, linkedScheduleId: body.id, isTaskList: false };
          await db.prepare("INSERT INTO study_checklist (id, data) VALUES (?, ?)").bind(task.id, JSON.stringify(task)).run();
          const updatedEvent = { ...body, checklistItemId: task.id };
          await db.prepare("UPDATE study_schedule SET data=? WHERE id=?").bind(JSON.stringify(updatedEvent), body.id).run();
        }
        return json({ ok: true });
      }
      if (eventId && method === "PUT") {
        const row = await db.prepare("SELECT data FROM study_schedule WHERE id=?").bind(eventId).first() as any;
        if (!row) return json({ error: "Not found" }, 404);
        const updated = { ...JSON.parse(row.data), ...body };
        await db.prepare("UPDATE study_schedule SET data=? WHERE id=?").bind(JSON.stringify(updated), eventId).run();
        return json({ ok: true });
      }
      if (eventId && method === "DELETE") {
        await db.prepare("DELETE FROM study_schedule WHERE id=?").bind(eventId).run();
        return json({ ok: true });
      }
    }

    // ── Checklist ─────────────────────────────────────────────────────────────
    if (segs[0] === "checklist") {
      const itemId = segs[1];
      if (!itemId && method === "POST") {
        await db.prepare("INSERT INTO study_checklist (id, data) VALUES (?, ?)").bind(body.id, JSON.stringify(body)).run();
        return json(body);
      }
      if (itemId && !segs[2]) {
        if (method === "PUT") {
          const row = await db.prepare("SELECT data FROM study_checklist WHERE id=?").bind(itemId).first() as any;
          if (!row) return json({ error: "Not found" }, 404);
          const updated = { ...JSON.parse(row.data), ...body };
          await db.prepare("UPDATE study_checklist SET data=? WHERE id=?").bind(JSON.stringify(updated), itemId).run();
          return json({ ok: true });
        }
        if (method === "DELETE") {
          await db.prepare("DELETE FROM study_checklist WHERE id=?").bind(itemId).run();
          return json({ ok: true });
        }
      }
      // SubTasks: /checklist/:id/subtasks[/:sid]
      if (segs[2] === "subtasks") {
        const sid = segs[3];
        const row = await db.prepare("SELECT data FROM study_checklist WHERE id=?").bind(itemId).first() as any;
        if (!row) return json({ error: "Not found" }, 404);
        const item = JSON.parse(row.data);
        if (method === "POST") {
          const st = { id: crypto.randomUUID(), text: body.text, done: false };
          item.subTasks = [...(item.subTasks || []), st];
          await db.prepare("UPDATE study_checklist SET data=? WHERE id=?").bind(JSON.stringify(item), itemId).run();
          return json(st);
        }
        if (method === "PUT" && sid) {
          item.subTasks = (item.subTasks || []).map((st: any) => st.id === sid ? { ...st, ...body } : st);
          await db.prepare("UPDATE study_checklist SET data=? WHERE id=?").bind(JSON.stringify(item), itemId).run();
          return json({ ok: true });
        }
        if (method === "DELETE" && sid) {
          item.subTasks = (item.subTasks || []).filter((st: any) => st.id !== sid);
          await db.prepare("UPDATE study_checklist SET data=? WHERE id=?").bind(JSON.stringify(item), itemId).run();
          return json({ ok: true });
        }
      }
    }

    return json({ error: "Not found" }, 404);
  } catch (err) {
    return json({ error: String(err) }, 500);
  }
};
