import { useState, useRef, useEffect, useMemo } from "react";
import { useStudyData } from "@/hooks/useStudyData";
import { type ImportanceLevel, type RepeatInterval, type ScheduleEvent, type ChecklistItem } from "@/hooks/useStudyData";
import { GlassCard } from "@/components/shared/GlassCard";
import { BottomSheet } from "@/components/shared/BottomSheet";
import { ConfirmSheet } from "@/components/shared/ConfirmSheet";
import { SwipeableRow, type SwipeAction } from "@/components/shared/SwipeableRow";
import {
  format, startOfWeek, addDays, isSameDay, parseISO,
  isPast, isToday as dateFnsIsToday,
  getYear, getMonth, getDaysInMonth, getDay,
} from "date-fns";
import {
  CheckCircle2, Circle, XCircle, Link2, Pencil, Trash2,
  Clock, Repeat, CheckSquare, RotateCcw, ChevronLeft,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { motion, AnimatePresence } from "framer-motion";

// ── Types ─────────────────────────────────────────────────────────────────────

type ScheduleEntry =
  | { kind: "event"; id: string; sortTime: number }
  | { kind: "task";  id: string; sortTime: number };

type ViewLevel = "day" | "month" | "year";

const IMPORTANCE_META: Record<ImportanceLevel, { label: string; color: string; dot: string }> = {
  high:   { label: "High",   color: "text-rose-500",    dot: "bg-rose-500"    },
  medium: { label: "Medium", color: "text-amber-500",   dot: "bg-amber-500"   },
  low:    { label: "Low",    color: "text-emerald-500", dot: "bg-emerald-500" },
};

const REPEAT_LABEL: Record<RepeatInterval, string> = {
  none: "", daily: "Daily", weekly: "Weekly", monthly: "Monthly",
};

const YEAR_RANGE_START = 1990;
const YEAR_RANGE_END   = 2039;

// ── Shared date-entry helpers (used by Day / Month / Year views alike) ────────

function hasEntriesOnDate(schedule: ScheduleEvent[], checklist: ChecklistItem[], date: Date): boolean {
  const hasEvent = schedule.some(e => isSameDay(new Date(e.datetime), date));
  const hasTask  = checklist.some(c => !!c.dueDate && isSameDay(parseISO(c.dueDate), date));
  return hasEvent || hasTask;
}

function countEntriesInMonth(schedule: ScheduleEvent[], checklist: ChecklistItem[], year: number, month: number): number {
  const eventCount = schedule.filter(e => {
    const d = new Date(e.datetime);
    return getYear(d) === year && getMonth(d) === month;
  }).length;
  const taskCount = checklist.filter(c => {
    if (!c.dueDate) return false;
    const d = parseISO(c.dueDate);
    return getYear(d) === year && getMonth(d) === month;
  }).length;
  return eventCount + taskCount;
}

// ── Main ──────────────────────────────────────────────────────────────────────

export function Schedule() {
  const {
    schedule, subjects, checklist,
    updateScheduleEvent, deleteScheduleEvent,
    toggleChecklistItem, skipChecklistItem, deleteChecklistItem,
    setCascadeChecklistStatus,
  } = useStudyData();

  // Left→Right swipe on schedule task:
  // repeated task → skip for today (stays in checklist, resets automatically once
  //                 the next occurrence's date/time is reached)
  // non-repeated task → fully delete from schedule + checklist
  const removeFromSchedule = (id: string) => {
    const it = checklist.find(c => c.id === id);
    if (!it) return;
    if (it.repeat && it.repeat !== 'none') {
      skipChecklistItem(id);
    } else {
      deleteChecklistItem(id);
    }
  };

  // Right→Left swipe: 3-state cycle, cascades to sub-tasks for list tasks
  const cycleChecklistStatus = (id: string) => {
    const it = checklist.find(c => c.id === id);
    if (!it) return;
    if (!it.done && !it.didNotDo) setCascadeChecklistStatus(id, true,  false);
    else if (it.done)              setCascadeChecklistStatus(id, false, true);
    else                           setCascadeChecklistStatus(id, false, false);
  };

  const [editingId, setEditingId]   = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [viewLevel, setViewLevel] = useState<ViewLevel>("day");
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const { register: regEdit, handleSubmit: handleEditSubmit, reset: resetEdit } = useForm({
    defaultValues: { title: "", subjectId: "", date: "", time: "", note: "" },
  });

  // Auto-scroll to today on mount (Day view week strip)
  useEffect(() => {
    if (viewLevel !== "day") return;
    const timer = setTimeout(() => {
      if (scrollAreaRef.current) {
        const btn = scrollAreaRef.current.querySelector('[data-today="true"]') as HTMLElement | null;
        btn?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
      }
    }, 80);
    return () => clearTimeout(timer);
  }, [viewLevel]);

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

  // ── Week strip (Day view) ────────────────────────────────────────────────────

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

  const dayHasEntries = (date: Date) => hasEntriesOnDate(schedule, checklist, date);

  // ── Drill-down navigation ────────────────────────────────────────────────────

  const goToDay = (date: Date) => {
    setSelectedDate(date);
    setViewLevel("day");
  };

  const goToMonth = (year: number, month: number) => {
    setSelectedDate(new Date(year, month, Math.min(selectedDate.getDate(), 28)));
    setViewLevel("month");
  };

  const inputCls =
    "w-full bg-background border border-border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50";

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 pb-20">

      {/* Header — no add button */}
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-4xl font-bold tracking-tight mb-1">Schedule</h1>
          <p className="text-muted-foreground text-lg">
            {viewLevel === "day" && format(startDate, "MMMM yyyy")}
            {viewLevel === "month" && format(selectedDate, "MMMM yyyy")}
            {viewLevel === "year" && getYear(selectedDate)}
          </p>
        </div>

        <ViewToggle level={viewLevel} onChange={setViewLevel} />
      </div>

      {viewLevel === "day" && (
        <>
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
                      onToggle={() => toggleChecklistItem(entry.id)}
                      onRemove={() => removeFromSchedule(entry.id)}
                      onCycleStatus={() => cycleChecklistStatus(entry.id)}
                    />
                  );
                })}
              </AnimatePresence>
            )}
          </div>
        </>
      )}

      {viewLevel === "month" && (
        <MonthView
          anchor={selectedDate}
          schedule={schedule}
          checklist={checklist}
          onSelectDay={goToDay}
          onBackToYear={() => setViewLevel("year")}
          onChangeMonth={(year, month) => setSelectedDate(new Date(year, month, 1))}
        />
      )}

      {viewLevel === "year" && (
        <YearView
          anchor={selectedDate}
          schedule={schedule}
          checklist={checklist}
          onSelectMonth={goToMonth}
          onChangeYear={(year) => setSelectedDate(new Date(year, getMonth(selectedDate), 1))}
        />
      )}

      {/* Edit event sheet (schedule events only — tasks are edited from Checklist) */}
      <BottomSheet isOpen={!!editingId} onClose={() => setEditingId(null)} title="Edit Event">
        <form onSubmit={handleEditSubmit(onEditSubmit)} className="space-y-5">
          <div>
            <label className="block text-sm font-medium mb-2">Title</label>
            <input {...regEdit("title", { required: true })} className={inputCls} />
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

// ── View toggle (Day / Month / Year) ───────────────────────────────────────────

function ViewToggle({ level, onChange }: { level: ViewLevel; onChange: (l: ViewLevel) => void }) {
  const OPTIONS: { value: ViewLevel; label: string }[] = [
    { value: "day",   label: "Day" },
    { value: "month", label: "Month" },
    { value: "year",  label: "Year" },
  ];

  return (
    <div className="inline-flex p-1 rounded-full bg-secondary/60 border border-border self-start">
      {OPTIONS.map(opt => {
        const active = level === opt.value;
        return (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            data-testid={`btn-view-${opt.value}`}
            className={`relative px-5 py-1.5 rounded-full text-sm font-semibold transition-colors ${
              active ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {active && (
              <motion.div
                layoutId="schedule-view-toggle-pill"
                className="absolute inset-0 bg-primary rounded-full"
                transition={{ type: "spring", stiffness: 380, damping: 32 }}
              />
            )}
            <span className="relative z-10">{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}

// ── Shared horizontal slider selector (years / months) ─────────────────────────

function SliderSelector<T extends string | number>({
  items, selected, onSelect, getLabel, testIdPrefix,
}: {
  items: T[];
  selected: T;
  onSelect: (v: T) => void;
  getLabel: (v: T) => string;
  testIdPrefix?: string;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current?.querySelector('[data-selected="true"]') as HTMLElement | null;
    el?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, [selected]);

  return (
    <div
      ref={scrollRef}
      className="flex gap-2 overflow-x-auto scrollbar-hide py-1 -my-1 snap-x snap-mandatory"
    >
      {items.map((item) => {
        const isSelected = item === selected;
        return (
          <button
            key={String(item)}
            data-selected={isSelected ? "true" : undefined}
            data-testid={testIdPrefix ? `${testIdPrefix}-${item}` : undefined}
            onClick={() => onSelect(item)}
            className={`snap-center flex-shrink-0 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              isSelected
                ? "bg-primary text-primary-foreground shadow-sm shadow-primary/25"
                : "bg-card/60 backdrop-blur border border-border hover:bg-card text-muted-foreground"
            }`}
          >
            {getLabel(item)}
          </button>
        );
      })}
    </div>
  );
}

// ── Month view: full grid with correct blank cells + leap-year-safe day count ──

function MonthView({
  anchor, schedule, checklist, onSelectDay, onBackToYear, onChangeMonth,
}: {
  anchor: Date;
  schedule: ScheduleEvent[];
  checklist: ChecklistItem[];
  onSelectDay: (d: Date) => void;
  onBackToYear: () => void;
  onChangeMonth: (year: number, month: number) => void;
}) {
  const year  = getYear(anchor);
  const month = getMonth(anchor);
  const today = new Date();

  // date-fns getDaysInMonth already accounts for leap years correctly.
  const daysInMonth   = getDaysInMonth(new Date(year, month, 1));
  const leadingBlanks = getDay(new Date(year, month, 1)); // 0 = Sunday
  const cells: (Date | null)[] = [];
  for (let i = 0; i < leadingBlanks; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);

  const monthItems = Array.from({ length: 12 }, (_, i) => i);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <button
          onClick={onBackToYear}
          className="inline-flex items-center gap-1 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
          data-testid="btn-back-to-year"
        >
          <ChevronLeft className="w-4 h-4" /> {year}
        </button>
      </div>

      <SliderSelector
        items={monthItems}
        selected={month}
        onSelect={(m) => onChangeMonth(year, m)}
        getLabel={(m) => format(new Date(2000, m, 1), "MMM")}
        testIdPrefix="btn-month"
      />

      <div className="grid grid-cols-7 gap-1.5 text-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
        {["S", "M", "T", "W", "T", "F", "S"].map((l, i) => <span key={i}>{l}</span>)}
      </div>

      <div className="grid grid-cols-7 gap-1.5">
        {cells.map((date, i) => {
          if (!date) return <div key={i} className="aspect-square" />;

          const isCurrentDay = isSameDay(date, today);
          const isAnchorDay  = isSameDay(date, anchor) && !isCurrentDay;
          const hasEntries   = hasEntriesOnDate(schedule, checklist, date);

          return (
            <button
              key={i}
              onClick={() => onSelectDay(date)}
              data-testid={`btn-month-day-${format(date, "yyyy-MM-dd")}`}
              className={`aspect-square rounded-xl flex flex-col items-center justify-center gap-0.5 text-sm font-medium transition-all ${
                isCurrentDay
                  ? "bg-primary text-primary-foreground font-bold shadow-sm shadow-primary/30"
                  : isAnchorDay
                  ? "border-2 border-primary/60 text-foreground"
                  : "bg-card/60 border border-border hover:bg-card"
              }`}
            >
              {format(date, "d")}
              <span
                className={`w-1 h-1 rounded-full ${
                  hasEntries ? (isCurrentDay ? "bg-primary-foreground" : "bg-primary") : "bg-transparent"
                }`}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Year view: 12-month grid ────────────────────────────────────────────────────

function YearView({
  anchor, schedule, checklist, onSelectMonth, onChangeYear,
}: {
  anchor: Date;
  schedule: ScheduleEvent[];
  checklist: ChecklistItem[];
  onSelectMonth: (year: number, month: number) => void;
  onChangeYear: (year: number) => void;
}) {
  const year  = getYear(anchor);
  const month = getMonth(anchor);
  const today = new Date();

  const years = Array.from(
    { length: YEAR_RANGE_END - YEAR_RANGE_START + 1 },
    (_, i) => YEAR_RANGE_START + i
  );
  const months = Array.from({ length: 12 }, (_, i) => i);

  return (
    <div className="space-y-5">
      <SliderSelector
        items={years}
        selected={year}
        onSelect={onChangeYear}
        getLabel={(y) => String(y)}
        testIdPrefix="btn-year"
      />

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {months.map((m) => {
          const isCurrentMonth = year === getYear(today) && m === getMonth(today);
          const isAnchorMonth  = m === month && !isCurrentMonth;
          const entryCount     = countEntriesInMonth(schedule, checklist, year, m);

          return (
            <button
              key={m}
              onClick={() => onSelectMonth(year, m)}
              data-testid={`btn-year-month-${m}`}
              className={`p-4 rounded-2xl border text-left transition-all ${
                isCurrentMonth
                  ? "bg-primary text-primary-foreground border-primary shadow-md shadow-primary/25"
                  : isAnchorMonth
                  ? "border-primary/60 bg-primary/5"
                  : "border-border bg-card/60 hover:bg-card"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold">{format(new Date(year, m, 1), "MMMM")}</span>
              </div>
              {entryCount > 0 && (
                <span className={`text-xs mt-1 block ${isCurrentMonth ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                  {entryCount} {entryCount === 1 ? "item" : "items"}
                </span>
              )}
            </button>
          );
        })}
      </div>
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

// ── Swipe action configs for task cards ───────────────────────────────────────

const SCHEDULE_REMOVE_ACTION: SwipeAction = {
  icon: <Trash2 className="w-5 h-5" />,
  label: "Remove",
  bg: "bg-secondary",
  color: "text-muted-foreground",
};

function getTaskCycleAction(done: boolean, didNotDo?: boolean): SwipeAction {
  if (!done && !didNotDo) return {
    icon: <CheckCircle2 className="w-5 h-5" />,
    label: "Done",
    bg: "bg-emerald-500/15",
    color: "text-emerald-600",
  };
  if (done) return {
    icon: <XCircle className="w-5 h-5" />,
    label: "Skip",
    bg: "bg-slate-400/15",
    color: "text-slate-500",
  };
  return {
    icon: <RotateCcw className="w-5 h-5" />,
    label: "Undo",
    bg: "bg-primary/15",
    color: "text-primary",
  };
}

// ── Task card (checklist items with dueDate) ──────────────────────────────────

function TaskCard({
  taskId, checklist, onToggle, onRemove, onCycleStatus,
}: {
  taskId: string;
  checklist: any[];
  onToggle: () => void;
  onRemove: () => void;
  onCycleStatus: () => void;
}) {
  const item = checklist.find((c: any) => c.id === taskId);
  if (!item) return null;
  const imp = item.importance ? IMPORTANCE_META[item.importance as ImportanceLevel] : null;
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
      <SwipeableRow
        onEdit={onRemove}
        onDelete={onCycleStatus}
        editAction={SCHEDULE_REMOVE_ACTION}
        deleteAction={getTaskCycleAction(item.done, item.didNotDo)}
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

          {/* Content */}
          <div className="flex-1 py-0.5 min-w-0">
            <h3 className={`font-semibold ${item.done ? "line-through text-muted-foreground" : item.didNotDo ? "line-through text-muted-foreground/60" : ""}`}>
              {item.text}
            </h3>

            <div className="flex items-center gap-1 flex-wrap mt-1">
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
              {isOverdue && <span className="text-xs text-rose-500 font-medium">Overdue</span>}
              {item.didNotDo && (
                <span className="text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full">Skipped</span>
              )}
            </div>

            {item.description && (
              <p className="text-xs mt-1 text-muted-foreground/80 line-clamp-2">{item.description}</p>
            )}
          </div>

          {/* Status button — tapping directly also cycles */}
          <button
            onClick={e => { e.stopPropagation(); onToggle(); }}
            className="p-2 h-max shrink-0 mt-0.5 hover:scale-110 transition-transform"
          >
            {item.done
              ? <CheckCircle2 className="w-6 h-6 text-primary" />
              : item.didNotDo
              ? <XCircle className="w-6 h-6 text-muted-foreground" />
              : <Circle className="w-6 h-6 text-muted-foreground hover:text-primary transition-colors" />
            }
          </button>
        </GlassCard>
      </SwipeableRow>
    </motion.div>
  );
}
