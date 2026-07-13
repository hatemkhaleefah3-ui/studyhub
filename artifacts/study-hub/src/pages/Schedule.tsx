import { useState, useRef, useEffect, useMemo } from "react";
import { useStudyData } from "@/hooks/useStudyData";
import { type ImportanceLevel, type RepeatInterval } from "@/hooks/useStudyData";
import { GlassCard } from "@/components/shared/GlassCard";
import { BottomSheet } from "@/components/shared/BottomSheet";
import { ConfirmSheet } from "@/components/shared/ConfirmSheet";
import { SwipeableRow } from "@/components/shared/SwipeableRow";
import {
  format, startOfWeek, addDays, isSameDay, parseISO,
  isPast, isToday as dateFnsIsToday,
} from "date-fns";
import {
  CheckCircle2, Circle, XCircle, Check, X, Link2, Pencil, Trash2,
  Repeat, CheckSquare,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from "framer-motion";

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
    updateChecklistItem, deleteChecklistItem,
  } = useStudyData();

  // Cycle undone → done → didNotDo → undone
  const cycleTaskStatus = (id: string) => {
    const item = checklist.find(c => c.id === id);
    if (!item) return;
    if (!item.done && !item.didNotDo) updateChecklistItem(id, { done: true,  didNotDo: false });
    else if (item.done)               updateChecklistItem(id, { done: false, didNotDo: true  });
    else                              updateChecklistItem(id, { done: false, didNotDo: false });
  };

  const [editingId, setEditingId]   = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const { register: regEdit, handleSubmit: handleEditSubmit, reset: resetEdit } = useForm({
    defaultValues: { title: "", subjectId: "", date: "", time: "", note: "" },
  });

  // Auto-scroll to today on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      if (scrollAreaRef.current) {
        const btn = scrollAreaRef.current.querySelector('[data-today="true"]') as HTMLElement | null;
        btn?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
      }
    }, 80);
    return () => clearTimeout(timer);
  }, []);

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

  // ── Week strip ─────────────────────────────────────────────────────────────

  const startDate = startOfWeek(selectedDate, { weekStartsOn: 1 });
  const weekDays  = Array.from({ length: 7 }).map((_, i) => addDays(startDate, i));

  // ── Build combined entry list for selected day ─────────────────────────────

  const dayEntries = useMemo((): ScheduleEntry[] => {
    const parseTaskTime = (dueDate: string, dueTime?: string | null): number => {
      if (!dueTime) return Infinity; // tasks without a time go at the end
      const [h, m] = dueTime.split(":").map(Number);
      const d = parseISO(dueDate);
      d.setHours(h, m, 0, 0);
      return d.getTime();
    };

    const events: ScheduleEntry[] = schedule
      .filter(e => isSameDay(new Date(e.datetime), selectedDate))
      .map(e => ({ kind: "event", id: e.id, sortTime: new Date(e.datetime).getTime() }));

    const tasks: ScheduleEntry[] = checklist
      .filter(c => !!c.dueDate && isSameDay(parseISO(c.dueDate), selectedDate))
      .map(c => ({ kind: "task", id: c.id, sortTime: parseTaskTime(c.dueDate!, c.dueTime) }));

    return [...events, ...tasks].sort((a, b) => a.sortTime - b.sortTime);
  }, [schedule, checklist, selectedDate]);

  // ── Day dot: does a day have any entries? ──────────────────────────────────

  const dayHasEntries = (date: Date) => {
    const hasEvent  = schedule.some(e => isSameDay(new Date(e.datetime), date));
    const hasTask   = checklist.some(c => !!c.dueDate && isSameDay(parseISO(c.dueDate), date));
    return hasEvent || hasTask;
  };

  const inputCls =
    "w-full bg-background border border-border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50";

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-8 pb-20">

      {/* Header — no add button */}
      <div>
        <h1 className="text-4xl font-bold tracking-tight mb-1">Schedule</h1>
        <p className="text-muted-foreground text-lg">{format(startDate, "MMMM yyyy")}</p>
      </div>

      {/* Day picker */}
      <div
        ref={scrollAreaRef}
        className="relative z-10 flex gap-2 overflow-x-auto overflow-y-visible py-2 -my-2 scrollbar-hide snap-x snap-mandatory"
      >
        {weekDays.map((date, i) => {
          const isToday    = isSameDay(date, new Date());
          const isSelected = isSameDay(date, selectedDate);
          const hasEntries = dayHasEntries(date);

          return (
            <button
              key={i}
              data-today={isToday ? "true" : undefined}
              onClick={() => setSelectedDate(date)}
              className={`snap-center flex-shrink-0 flex flex-col items-center justify-center w-[4.5rem] h-[4.75rem] rounded-2xl transition-all duration-200 ${
                isSelected
                  ? "bg-primary text-primary-foreground shadow-md shadow-primary/25 ring-2 ring-primary/30"
                  : "bg-card/60 backdrop-blur border border-border hover:bg-card text-muted-foreground"
              }`}
              data-testid={`btn-day-${format(date, "yyyy-MM-dd")}`}
            >
              <span className="text-[10px] uppercase font-bold tracking-wider leading-none">
                {format(date, "EEE")}
              </span>
              <span className="text-xl font-bold mt-1 leading-none">{format(date, "d")}</span>
              {/* Dot: today indicator OR entry indicator */}
              {!isSelected && (isToday || hasEntries) && (
                <div className={`w-1.5 h-1.5 rounded-full mt-1.5 ${isToday ? "bg-primary" : "bg-muted-foreground/40"}`} />
              )}
            </button>
          );
        })}
      </div>

      {/* Day content */}
      <div className="space-y-3">
        <h2 className="text-xl font-semibold">
          {isSameDay(selectedDate, new Date()) ? "Today" : format(selectedDate, "EEEE, MMM d")}
        </h2>

        {dayEntries.length === 0 ? (
          <GlassCard className="p-12 text-center border-dashed border-2 bg-transparent text-muted-foreground">
            Nothing scheduled — add due dates to checklist tasks to see them here.
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
                  onCycle={() => cycleTaskStatus(entry.id)}
                  onDelete={() => deleteChecklistItem(entry.id)}
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

// ── Task card — swipeable ─────────────────────────────────────────────────────
//
//  ← right-to-left : cycle  undone → done → skipped → undone
//  → left-to-right : delete

const CYCLE_THRESHOLD  = 72;   // px to trigger cycle
const DELETE_THRESHOLD = 72;   // px to trigger delete

// Next-action colour per current state (shown behind on right-to-left)
const NEXT_ACTION: Record<string, { color: string; label: string; Icon: React.FC<any> }> = {
  undone:   { color: "#22c55e", label: "Done",  Icon: CheckCircle2 },
  done:     { color: "#f59e0b", label: "Skip",  Icon: XCircle      },
  didNotDo: { color: "#64748b", label: "Undo",  Icon: Circle       },
};

function TaskCard({
  taskId, checklist, subjects, onCycle, onDelete,
}: {
  taskId:   string;
  checklist: any[];
  subjects:  any[];
  onCycle:  () => void;
  onDelete: () => void;
}) {
  const item = checklist.find((c: any) => c.id === taskId);
  if (!item) return null;

  const subject   = subjects.find((s: any) => s.id === item.subjectId);
  const imp       = item.importance ? IMPORTANCE_META[item.importance as ImportanceLevel] : null;
  const isOverdue = !item.done && !item.didNotDo && item.dueDate
    && isPast(parseISO(item.dueDate)) && !dateFnsIsToday(parseISO(item.dueDate));

  const stateKey = item.done ? "done" : item.didNotDo ? "didNotDo" : "undone";
  const next = NEXT_ACTION[stateKey];

  // ── Motion values ────────────────────────────────────────────────────────
  const x      = useMotionValue(0);
  const rotate = useTransform(x, [-140, 0, 140], [-1.8, 0, 1.8]);

  // Right-to-left (negative x): cycle backdrop
  const cycleOpacity  = useTransform(x, [-CYCLE_THRESHOLD, -24, 0], [1, 0.6, 0]);
  const cycleIconScale = useTransform(x, [-CYCLE_THRESHOLD - 20, -CYCLE_THRESHOLD, -24], [1.25, 1.1, 0.8]);

  // Left-to-right (positive x): delete backdrop
  const deleteOpacity   = useTransform(x, [0, 24, DELETE_THRESHOLD], [0, 0.6, 1]);
  const deleteIconScale = useTransform(x, [24, DELETE_THRESHOLD, DELETE_THRESHOLD + 20], [0.8, 1.1, 1.25]);

  const handleDragEnd = (_: any, info: { offset: { x: number } }) => {
    const ox = info.offset.x;
    if (ox < -CYCLE_THRESHOLD) {
      onCycle();
      // snap card back after cycling
      animate(x, 0, { type: "spring", stiffness: 500, damping: 36 });
    } else if (ox > DELETE_THRESHOLD) {
      onDelete();
      // AnimatePresence handles exit; no snap needed
    } else {
      // below threshold — snap back
      animate(x, 0, { type: "spring", stiffness: 500, damping: 36 });
    }
  };

  // ── Status icon (decorative, shows current state) ────────────────────────
  const StatusIcon =
    item.done     ? CheckCircle2 :
    item.didNotDo ? XCircle      :
                    Circle;
  const statusColor =
    item.done     ? "text-primary"           :
    item.didNotDo ? "text-muted-foreground/50" :
                    "text-muted-foreground/40";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: 80, transition: { duration: 0.22 } }}
      transition={{ type: "spring", stiffness: 300, damping: 28 }}
      className="relative"
    >
      {/* ── Right-to-left backdrop (cycle action) ── */}
      <motion.div
        className="absolute inset-0 rounded-2xl flex items-center justify-end pr-5 gap-2"
        style={{ backgroundColor: next.color, opacity: cycleOpacity }}
      >
        <span className="text-sm font-bold text-white">{next.label}</span>
        <motion.div style={{ scale: cycleIconScale }}>
          <next.Icon className="w-6 h-6 text-white" />
        </motion.div>
      </motion.div>

      {/* ── Left-to-right backdrop (delete) ── */}
      <motion.div
        className="absolute inset-0 rounded-2xl flex items-center pl-5 gap-2"
        style={{ backgroundColor: "#ef4444", opacity: deleteOpacity }}
      >
        <motion.div style={{ scale: deleteIconScale }}>
          <Trash2 className="w-6 h-6 text-white" />
        </motion.div>
        <span className="text-sm font-bold text-white">Delete</span>
      </motion.div>

      {/* ── Draggable card ── */}
      <motion.div
        drag="x"
        dragMomentum={false}
        dragElastic={0.12}
        dragConstraints={{ left: -160, right: 160 }}
        style={{ x, rotate }}
        onDragEnd={handleDragEnd}
        className="relative touch-pan-y cursor-grab active:cursor-grabbing"
      >
        <GlassCard className={`p-4 flex gap-4 transition-opacity duration-300 ${item.done || item.didNotDo ? "opacity-55" : ""}`}>

          {/* Time column */}
          <div className="w-14 shrink-0 flex flex-col items-center justify-center text-center border-r border-border/50 pr-3 gap-0.5">
            {item.dueTime ? (
              <>
                <span className="text-base font-bold leading-none tabular-nums">
                  {item.dueTime.split(":")[0]}
                </span>
                <span className="text-[10px] text-muted-foreground font-medium leading-none">
                  {item.dueTime.split(":")[1]}
                </span>
              </>
            ) : (
              <CheckSquare className="w-4 h-4 text-muted-foreground/50" />
            )}
          </div>

          {/* Subject colour bar */}
          <div
            className="w-1 rounded-full shrink-0 self-stretch"
            style={{ backgroundColor: subject?.color || "hsl(var(--muted-foreground) / 0.3)" }}
          />

          {/* Content */}
          <div className="flex-1 py-0.5 min-w-0">
            <p className={`font-semibold leading-snug ${
              item.done     ? "line-through text-muted-foreground"    :
              item.didNotDo ? "line-through text-muted-foreground/50" : ""
            }`}>
              {item.text}
            </p>

            <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
              {subject && (
                <span className="text-xs text-muted-foreground font-medium">{subject.name}</span>
              )}
              {imp && (
                <span className={`inline-flex items-center gap-1 text-xs font-medium ${imp.color}`}>
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
                <span className="text-xs font-semibold text-rose-500 bg-rose-500/10 px-1.5 py-0.5 rounded-full">
                  Overdue
                </span>
              )}
              {item.didNotDo && (
                <span className="text-xs font-medium bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full">
                  Skipped
                </span>
              )}
            </div>

            {item.description && (
              <p className="text-xs mt-1.5 text-muted-foreground/70 line-clamp-2 leading-relaxed">
                {item.description}
              </p>
            )}
          </div>

          {/* Status icon — decorative, shows current state */}
          <div className="flex items-center shrink-0 self-center pointer-events-none">
            <StatusIcon className={`w-6 h-6 ${statusColor}`} />
          </div>

        </GlassCard>
      </motion.div>
    </motion.div>
  );
}
