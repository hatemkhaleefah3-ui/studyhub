import { useState, useMemo } from "react";
import { useStudyData } from "@/hooks/useStudyData";
import { type ImportanceLevel, type RepeatInterval } from "@/hooks/useStudyData";
import { GlassCard } from "@/components/shared/GlassCard";
import { BottomSheet } from "@/components/shared/BottomSheet";
import { ConfirmSheet } from "@/components/shared/ConfirmSheet";
import { SwipeableRow } from "@/components/shared/SwipeableRow";
import {
  format, isSameDay, parseISO, subDays, addDays,
  isPast, isToday as dateFnsIsToday,
} from "date-fns";

type DateFilter = "today" | "yesterday" | "tomorrow" | "nodate";

const DATE_FILTERS: { key: DateFilter; label: string }[] = [
  { key: "today",     label: "Today"     },
  { key: "yesterday", label: "Yesterday" },
  { key: "tomorrow",  label: "Tomorrow"  },
  { key: "nodate",    label: "No date"   },
];
import {
  CheckCircle2, Circle, XCircle, Link2, Pencil, Trash2,
  Clock, Repeat, CheckSquare,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { motion, AnimatePresence } from "framer-motion";

// ── Types ─────────────────────────────────────────────────────────────────────

type ScheduleEntry =
  | { kind: "event"; id: string; sortTime: number }
  | { kind: "task";  id: string; sortTime: number };

const IMPORTANCE_META: Record<ImportanceLevel, { label: string; color: string; dot: string }> = {
  high:   { label: "High",   color: "text-rose-500",    dot: "bg-rose-500"    },
  medium: { label: "Medium", color: "text-amber-500",   dot: "bg-amber-500"   },
  low:    { label: "Low",    color: "text-emerald-500", dot: "bg-emerald-500" },
};

const REPEAT_LABEL: Record<RepeatInterval, string> = {
  none: "", daily: "Daily", weekly: "Weekly", monthly: "Monthly",
};

// ── Main ──────────────────────────────────────────────────────────────────────

export function Schedule() {
  const {
    schedule, subjects, checklist,
    updateScheduleEvent, deleteScheduleEvent,
    toggleChecklistItem,
  } = useStudyData();

  const [editingId, setEditingId]   = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<DateFilter>("today");

  const { register: regEdit, handleSubmit: handleEditSubmit, reset: resetEdit } = useForm({
    defaultValues: { title: "", subjectId: "", date: "", time: "", note: "" },
  });

  const today     = new Date();
  const filterDate: Record<Exclude<DateFilter, "nodate">, Date> = {
    today:     today,
    yesterday: subDays(today, 1),
    tomorrow:  addDays(today, 1),
  };

  const openEdit = (id: string) => {
    const ev = schedule.find(e => e.id === id);
    if (!ev) return;
    const dt = new Date(ev.datetime);
    resetEdit({
      title: ev.title,
      subjectId: ev.subjectId,
      date: format(dt, "yyyy-MM-dd"),
      time: format(dt, "HH:mm"),
      note: ev.note,
    });
    setEditingId(id);
  };

  const onEditSubmit = (data: any) => {
    if (!editingId) return;
    updateScheduleEvent(editingId, {
      title: data.title,
      subjectId: data.subjectId,
      datetime: new Date(`${data.date}T${data.time}`).toISOString(),
      note: data.note,
    });
    setEditingId(null);
  };

  // ── Build combined entry list for active filter ────────────────────────────

  const dayEntries = useMemo((): ScheduleEntry[] => {
    const parseTaskTime = (dueDate: string, dueTime?: string | null): number => {
      if (!dueTime) return Infinity;
      const [h, m] = dueTime.split(":").map(Number);
      const d = parseISO(dueDate);
      d.setHours(h, m, 0, 0);
      return d.getTime();
    };

    if (activeFilter === "nodate") {
      const events: ScheduleEntry[] = schedule
        .filter(e => !e.datetime)
        .map(e => ({ kind: "event" as const, id: e.id, sortTime: Infinity }));
      const tasks: ScheduleEntry[] = checklist
        .filter(c => !c.dueDate)
        .map(c => ({ kind: "task" as const, id: c.id, sortTime: Infinity }));
      return [...events, ...tasks];
    }

    const target = filterDate[activeFilter];
    const events: ScheduleEntry[] = schedule
      .filter(e => e.datetime && isSameDay(new Date(e.datetime), target))
      .map(e => ({ kind: "event" as const, id: e.id, sortTime: new Date(e.datetime).getTime() }));
    const tasks: ScheduleEntry[] = checklist
      .filter(c => !!c.dueDate && isSameDay(parseISO(c.dueDate), target))
      .map(c => ({ kind: "task" as const, id: c.id, sortTime: parseTaskTime(c.dueDate!, c.dueTime) }));

    return [...events, ...tasks].sort((a, b) => a.sortTime - b.sortTime);
  }, [schedule, checklist, activeFilter]);

  const inputCls =
    "w-full bg-background border border-border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50";

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-8 pb-20">

      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold tracking-tight mb-1">Schedule</h1>
        <p className="text-muted-foreground text-lg">{format(today, "MMMM yyyy")}</p>
      </div>

      {/* Date filter pills */}
      <div className="flex gap-2 flex-wrap">
        {DATE_FILTERS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActiveFilter(key)}
            className={`px-5 py-2 rounded-full text-sm font-semibold transition-all duration-200 ${
              activeFilter === key
                ? "bg-primary text-primary-foreground shadow-md shadow-primary/25"
                : "bg-card/60 backdrop-blur border border-border text-muted-foreground hover:bg-card"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Entries for active filter */}
      <div className="space-y-3">
        <h2 className="text-xl font-semibold">
          {{ today: "Today", yesterday: "Yesterday", tomorrow: "Tomorrow", nodate: "No date" }[activeFilter]}
        </h2>

        {dayEntries.length === 0 ? (
          <GlassCard className="p-12 text-center border-dashed border-2 bg-transparent text-muted-foreground">
            {activeFilter === "nodate"
              ? "No items without a date."
              : "Nothing scheduled — add due dates to checklist tasks to see them here."}
          </GlassCard>
        ) : (
          <AnimatePresence initial={false}>
            {dayEntries.map(entry => {
              if (entry.kind === "event") {
                return (
                  <EventCard
                    key={`event-${entry.id}`}
                    eventId={entry.id}
                    schedule={schedule}
                    subjects={subjects}
                    checklist={checklist}
                    onEdit={() => openEdit(entry.id)}
                    onDelete={() => setDeletingId(entry.id)}
                    onToggle={(cid) => toggleChecklistItem(cid)}
                  />
                );
              }
              return (
                <TaskCard
                  key={`task-${entry.id}`}
                  taskId={entry.id}
                  checklist={checklist}
                  subjects={subjects}
                  onToggle={() => toggleChecklistItem(entry.id)}
                />
              );
            })}
          </AnimatePresence>
        )}
      </div>

      {/* Edit event sheet (schedule events only — tasks are edited from Checklist) */}
      <BottomSheet isOpen={!!editingId} onClose={() => setEditingId(null)} title="Edit Event">
        <form onSubmit={handleEditSubmit(onEditSubmit)} className="space-y-5">
          <div>
            <label className="block text-sm font-medium mb-2">Title</label>
            <input {...regEdit("title", { required: true })} className={inputCls} autoFocus />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Subject</label>
            <select {...regEdit("subjectId")} className={`${inputCls} appearance-none`}>
              <option value="">Select a subject…</option>
              {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Date</label>
              <input type="date" {...regEdit("date", { required: true })} className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Time</label>
              <input type="time" {...regEdit("time", { required: true })} className={inputCls} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Note (optional)</label>
            <textarea {...regEdit("note")} className={`${inputCls} min-h-[80px]`} />
          </div>
          <button type="submit" className="w-full bg-primary text-primary-foreground font-semibold rounded-xl py-3.5">
            Save Changes
          </button>
        </form>
      </BottomSheet>

      {/* Delete confirm */}
      <ConfirmSheet
        isOpen={!!deletingId}
        onClose={() => setDeletingId(null)}
        onConfirm={() => { if (deletingId) { deleteScheduleEvent(deletingId); setDeletingId(null); } }}
        title="Delete event?"
        message="This event will be moved to the Archive. You can restore it later from Settings."
        confirmLabel="Move to Archive"
      />
    </div>
  );
}

// ── Event card (real schedule events) ────────────────────────────────────────

function EventCard({
  eventId, schedule, subjects, checklist, onEdit, onDelete, onToggle,
}: {
  eventId: string;
  schedule: any[];
  subjects: any[];
  checklist: any[];
  onEdit: () => void;
  onDelete: () => void;
  onToggle: (id: string) => void;
}) {
  const ev = schedule.find((e: any) => e.id === eventId);
  if (!ev) return null;
  const subject    = subjects.find((s: any) => s.id === ev.subjectId);
  const linkedItem = ev.checklistItemId ? checklist.find((c: any) => c.id === ev.checklistItemId) : null;
  const isDone     = linkedItem ? linkedItem.done : ev.done;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ type: "spring", stiffness: 300, damping: 28 }}
    >
      <SwipeableRow onEdit={onEdit} onDelete={onDelete}>
        <GlassCard className={`p-4 flex gap-4 transition-all group ${isDone ? "opacity-50" : ""}`}>
          {/* Time column */}
          <div className="w-14 shrink-0 text-center flex flex-col items-center justify-center border-r border-border/50 pr-3">
            <span className="text-base font-bold leading-tight">
              {format(new Date(ev.datetime), "HH:mm")}
            </span>
          </div>

          {/* Subject colour bar */}
          <div className="w-1.5 rounded-full shrink-0 self-stretch" style={{ backgroundColor: subject?.color || "hsl(var(--primary))" }} />

          {/* Content */}
          <div className="flex-1 py-0.5 min-w-0">
            <h3 className={`font-semibold ${isDone ? "line-through text-muted-foreground" : ""}`}>{ev.title}</h3>
            {subject && <p className="text-sm text-muted-foreground mt-0.5">{subject.name}</p>}
            {ev.note && (
              <p className="text-xs mt-1.5 text-muted-foreground/80 bg-secondary/50 px-2 py-1.5 rounded-lg">
                {ev.note}
              </p>
            )}
            {ev.checklistItemId && (
              <span className="inline-flex items-center gap-1 text-xs text-primary/70 mt-1.5">
                <Link2 className="w-3 h-3" /> Linked to checklist
              </span>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity self-start">
            <button onClick={onEdit} className="p-2 text-muted-foreground hover:bg-secondary hover:text-foreground rounded-full transition-all">
              <Pencil className="w-4 h-4" />
            </button>
            <button onClick={onDelete} className="p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive rounded-full transition-all">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>

          {ev.checklistItemId && (
            <button onClick={() => onToggle(ev.checklistItemId!)} className="p-2 h-max shrink-0 mt-0.5 hover:scale-110 transition-transform">
              <CheckCircle2 className={`w-6 h-6 ${isDone ? "text-primary" : "text-muted-foreground"}`} />
            </button>
          )}
        </GlassCard>
      </SwipeableRow>
    </motion.div>
  );
}

// ── Task card (checklist items with dueDate) ──────────────────────────────────

function TaskCard({
  taskId, checklist, subjects, onToggle,
}: {
  taskId: string;
  checklist: any[];
  subjects: any[];
  onToggle: () => void;
}) {
  const item = checklist.find((c: any) => c.id === taskId);
  if (!item) return null;
  const subject = subjects.find((s: any) => s.id === item.subjectId);
  const imp     = item.importance ? IMPORTANCE_META[item.importance as ImportanceLevel] : null;
  const isOverdue = !item.done && !item.didNotDo && item.dueDate
    && isPast(parseISO(item.dueDate)) && !dateFnsIsToday(parseISO(item.dueDate));

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ type: "spring", stiffness: 300, damping: 28 }}
    >
      <GlassCard
        className={`p-4 flex gap-4 transition-all ${item.done || item.didNotDo ? "opacity-50" : ""}`}
      >
        {/* Time column — shows dueTime or a task icon */}
        <div className="w-14 shrink-0 text-center flex flex-col items-center justify-center border-r border-border/50 pr-3">
          {item.dueTime ? (
            <span className="text-base font-bold leading-tight">{item.dueTime}</span>
          ) : (
            <CheckSquare className="w-4 h-4 text-muted-foreground/60" />
          )}
        </div>

        {/* Subject colour bar (or primary if no subject) */}
        <div
          className="w-1.5 rounded-full shrink-0 self-stretch"
          style={{ backgroundColor: subject?.color || "hsl(var(--muted-foreground))" }}
        />

        {/* Content */}
        <div className="flex-1 py-0.5 min-w-0">
          <h3 className={`font-semibold ${item.done ? "line-through text-muted-foreground" : item.didNotDo ? "line-through text-muted-foreground/60" : ""}`}>
            {item.text}
          </h3>

          <div className="flex items-center gap-1 flex-wrap mt-1">
            {subject && <span className="text-xs text-muted-foreground">{subject.name}</span>}
            {imp && (
              <span className={`inline-flex items-center gap-1 text-xs ${imp.color}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${imp.dot}`} />
                {imp.label}
              </span>
            )}
            {item.repeat && item.repeat !== "none" && (
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <Repeat className="w-3 h-3" />
                {REPEAT_LABEL[item.repeat as RepeatInterval]}
              </span>
            )}
            {isOverdue && (
              <span className="text-xs text-rose-500 font-medium">Overdue</span>
            )}
            {item.didNotDo && (
              <span className="text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full">Skipped</span>
            )}
          </div>

          {item.description && (
            <p className="text-xs mt-1 text-muted-foreground/80 line-clamp-2">{item.description}</p>
          )}
        </div>

        {/* Checkbox — cycles status like on Checklist page */}
        <button onClick={onToggle} className="p-2 h-max shrink-0 mt-0.5 hover:scale-110 transition-transform">
          {item.done
            ? <CheckCircle2 className="w-6 h-6 text-primary" />
            : item.didNotDo
            ? <XCircle className="w-6 h-6 text-muted-foreground" />
            : <Circle className="w-6 h-6 text-muted-foreground hover:text-primary transition-colors" />
          }
        </button>
      </GlassCard>
    </motion.div>
  );
}
