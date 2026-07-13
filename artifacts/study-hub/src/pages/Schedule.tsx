import { useState, useRef, useEffect, useMemo } from "react";
import { useStudyData } from "@/hooks/useStudyData";
import { type ImportanceLevel, type ScheduleEvent, type ChecklistItem } from "@/hooks/useStudyData";
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
  RotateCcw, ChevronLeft,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { motion, AnimatePresence } from "framer-motion";

type ScheduleEntry =
  | { kind: "event"; id: string; sortTime: number }
  | { kind: "task";  id: string; sortTime: number };

type ViewLevel = "day" | "month" | "year";

const IMPORTANCE_META: Record<ImportanceLevel, { label: string; color: string; dot: string }> = {
  high:   { label: "High",   color: "text-rose-500",    dot: "bg-rose-500"    },
  medium: { label: "Medium", color: "text-amber-500",   dot: "bg-amber-500"   },
  low:    { label: "Low",    color: "text-emerald-500", dot: "bg-emerald-500" },
};

const YEAR_RANGE_START = 1990;
const YEAR_RANGE_END   = 2039;

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

export function Schedule() {
  const {
    schedule, subjects, checklist,
    updateScheduleEvent, deleteScheduleEvent,
    toggleChecklistItem, skipChecklistItem, deleteChecklistItem,
    setCascadeChecklistStatus,
  } = useStudyData();

  const removeFromSchedule = (id: string) => {
    const it = checklist.find(c => c.id === id);
    if (!it) return;
    if (it.repeat && it.repeat !== 'none') skipChecklistItem(id);
    else deleteChecklistItem(id);
  };

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

  const startDate = startOfWeek(selectedDate, { weekStartsOn: 1 });
  const weekDays  = Array.from({ length: 7 }).map((_, i) => addDays(startDate, i));

  const dayEntries = useMemo((): ScheduleEntry[] => {
    const parseTaskTime = (dueDate: string, dueTime?: string | null): number => {
      if (!dueTime) return Infinity;
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

  const goToDay = (date: Date) => { setSelectedDate(date); setViewLevel("day"); };
  const goToMonth = (year: number, month: number) => { setSelectedDate(new Date(year, month, Math.min(selectedDate.getDate(), 28))); setViewLevel("month"); };

  const inputCls = "w-full bg-background border border-border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground";

  return (
    <div className="space-y-6 pb-20 max-w-4xl mx-auto">

      {/* Header & ViewToggle inline */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold tracking-tight mb-2">Schedule</h1>
          <p className="text-muted-foreground font-medium text-lg">
            {viewLevel === "day" && format(startDate, "MMMM yyyy")}
            {viewLevel === "month" && format(selectedDate, "MMMM yyyy")}
            {viewLevel === "year" && getYear(selectedDate)}
          </p>
        </div>
        <ViewToggle level={viewLevel} onChange={setViewLevel} />
      </div>

      {viewLevel === "day" && (
        <>
          <div ref={scrollAreaRef} className="relative z-10 flex gap-2 overflow-x-auto overflow-y-visible py-2 -mx-2 px-2 scrollbar-hide snap-x snap-mandatory">
            {weekDays.map((date, i) => {
              const isToday    = isSameDay(date, new Date());
              const isSelected = isSameDay(date, selectedDate);
              const hasEntries = dayHasEntries(date);

              return (
                <button
                  key={i} data-today={isToday ? "true" : undefined} onClick={() => setSelectedDate(date)}
                  className={`snap-center flex-shrink-0 flex flex-col items-center justify-center w-[4.5rem] h-[5rem] rounded-2xl transition-all duration-200 border shadow-sm ${
                    isSelected
                      ? "bg-primary text-primary-foreground border-primary shadow-primary/20 scale-105"
                      : "bg-card border-border/50 hover:bg-secondary/60 text-muted-foreground"
                  }`}
                >
                  <span className="text-[10px] uppercase font-bold tracking-wider leading-none mb-1">
                    {format(date, "EEE")}
                  </span>
                  <span className="text-xl font-bold leading-none">{format(date, "d")}</span>
                  {!isSelected && (isToday || hasEntries) && (
                    <div className={`w-1.5 h-1.5 rounded-full mt-2 ${isToday ? "bg-primary" : "bg-muted-foreground/30"}`} />
                  )}
                  {isSelected && hasEntries && (
                    <div className="w-1.5 h-1.5 rounded-full mt-2 bg-primary-foreground/80" />
                  )}
                </button>
              );
            })}
          </div>

          <div className="space-y-4 pt-2">
            <h2 className="text-xl font-bold tracking-tight text-foreground/90 pl-1">
              {isSameDay(selectedDate, new Date()) ? "Today's Agenda" : format(selectedDate, "EEEE, MMMM d")}
            </h2>

            {dayEntries.length === 0 ? (
              <GlassCard className="p-12 text-center border-dashed border-2 bg-transparent text-muted-foreground shadow-none">
                Nothing scheduled — add due dates to tasks to see them here.
              </GlassCard>
            ) : (
              <AnimatePresence initial={false}>
                {dayEntries.map(entry => {
                  if (entry.kind === "event") {
                    return (
                      <EventCard
                        key={`event-${entry.id}`} eventId={entry.id} schedule={schedule} subjects={subjects} checklist={checklist}
                        onEdit={() => openEdit(entry.id)} onDelete={() => setDeletingId(entry.id)} onToggle={(cid) => toggleChecklistItem(cid)}
                      />
                    );
                  }
                  return (
                    <TaskCard
                      key={`task-${entry.id}`} taskId={entry.id} checklist={checklist}
                      onToggle={() => toggleChecklistItem(entry.id)} onRemove={() => removeFromSchedule(entry.id)} onCycleStatus={() => cycleChecklistStatus(entry.id)}
                    />
                  );
                })}
              </AnimatePresence>
            )}
          </div>
        </>
      )}

      {viewLevel === "month" && <MonthView anchor={selectedDate} schedule={schedule} checklist={checklist} onSelectDay={goToDay} onBackToYear={() => setViewLevel("year")} onChangeMonth={(year, month) => setSelectedDate(new Date(year, month, 1))} />}
      {viewLevel === "year" && <YearView anchor={selectedDate} schedule={schedule} checklist={checklist} onSelectMonth={goToMonth} onChangeYear={(year) => setSelectedDate(new Date(year, getMonth(selectedDate), 1))} />}

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

      <ConfirmSheet
        isOpen={!!deletingId} onClose={() => setDeletingId(null)}
        onConfirm={() => { if (deletingId) { deleteScheduleEvent(deletingId); setDeletingId(null); } }}
        title="Delete event?" message="This event will be moved to the Archive." confirmLabel="Move to Archive"
      />
    </div>
  );
}

function ViewToggle({ level, onChange }: { level: ViewLevel; onChange: (l: ViewLevel) => void }) {
  const OPTIONS: { value: ViewLevel; label: string }[] = [ { value: "day", label: "Day" }, { value: "month", label: "Month" }, { value: "year", label: "Year" } ];
  return (
    <div className="inline-flex p-1.5 rounded-2xl bg-secondary/60 border border-border/50 self-start w-full md:w-auto">
      {OPTIONS.map(opt => {
        const active = level === opt.value;
        return (
          <button
            key={opt.value} onClick={() => onChange(opt.value)}
            className={`flex-1 md:flex-none relative px-6 py-2 rounded-xl text-sm font-bold transition-all ${active ? "text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-secondary/40"}`}
          >
            {active && <motion.div layoutId="schedule-view-toggle-pill" className="absolute inset-0 bg-primary rounded-xl" transition={{ type: "spring", stiffness: 380, damping: 32 }} />}
            <span className="relative z-10">{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}

function SliderSelector<T extends string | number>({ items, selected, onSelect, getLabel, testIdPrefix }: { items: T[]; selected: T; onSelect: (v: T) => void; getLabel: (v: T) => string; testIdPrefix?: string; }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => { const el = scrollRef.current?.querySelector('[data-selected="true"]') as HTMLElement | null; el?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" }); }, [selected]);
  return (
    <div ref={scrollRef} className="flex gap-2 overflow-x-auto scrollbar-hide py-1 -mx-2 px-2 snap-x snap-mandatory">
      {items.map((item) => {
        const isSelected = item === selected;
        return (
          <button
            key={String(item)} data-selected={isSelected ? "true" : undefined} data-testid={testIdPrefix ? `${testIdPrefix}-${item}` : undefined} onClick={() => onSelect(item)}
            className={`snap-center flex-shrink-0 px-5 py-2.5 rounded-xl text-sm font-bold transition-all border shadow-sm ${isSelected ? "bg-primary text-primary-foreground border-primary shadow-primary/20 scale-105" : "bg-card border-border/50 hover:bg-secondary/60 text-muted-foreground"}`}
          >
            {getLabel(item)}
          </button>
        );
      })}
    </div>
  );
}

function MonthView({ anchor, schedule, checklist, onSelectDay, onBackToYear, onChangeMonth }: { anchor: Date; schedule: ScheduleEvent[]; checklist: ChecklistItem[]; onSelectDay: (d: Date) => void; onBackToYear: () => void; onChangeMonth: (year: number, month: number) => void; }) {
  const year  = getYear(anchor);
  const month = getMonth(anchor);
  const today = new Date();

  const daysInMonth   = getDaysInMonth(new Date(year, month, 1));
  const leadingBlanks = getDay(new Date(year, month, 1));
  const cells: (Date | null)[] = [];
  for (let i = 0; i < leadingBlanks; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);

  const monthItems = Array.from({ length: 12 }, (_, i) => i);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between pl-1">
        <button onClick={onBackToYear} className="inline-flex items-center gap-1.5 text-sm font-bold text-muted-foreground hover:text-foreground transition-colors bg-secondary/50 px-3 py-1.5 rounded-lg border border-border/50">
          <ChevronLeft className="w-4 h-4" /> {year}
        </button>
      </div>

      <SliderSelector items={monthItems} selected={month} onSelect={(m) => onChangeMonth(year, m)} getLabel={(m) => format(new Date(2000, m, 1), "MMMM")} testIdPrefix="btn-month" />

      <GlassCard className="p-4 md:p-6 border-border/60">
        <div className="grid grid-cols-7 gap-1.5 text-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50 mb-3">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((l, i) => <span key={i} className="hidden sm:inline">{l}</span>)}
          {["S", "M", "T", "W", "T", "F", "S"].map((l, i) => <span key={i} className="sm:hidden">{l}</span>)}
        </div>

        <div className="grid grid-cols-7 gap-1.5 md:gap-2">
          {cells.map((date, i) => {
            if (!date) return <div key={i} className="aspect-square rounded-xl bg-secondary/10 border border-dashed border-border/20" />;

            const isCurrentDay = isSameDay(date, today);
            const isAnchorDay  = isSameDay(date, anchor) && !isCurrentDay;
            const hasEntries   = hasEntriesOnDate(schedule, checklist, date);

            return (
              <button
                key={i} onClick={() => onSelectDay(date)} data-testid={`btn-month-day-${format(date, "yyyy-MM-dd")}`}
                className={`aspect-square rounded-xl flex flex-col items-center justify-center gap-1 text-sm md:text-base font-bold transition-all border shadow-sm ${
                  isCurrentDay ? "bg-primary text-primary-foreground border-primary shadow-primary/30 scale-105 z-10" : isAnchorDay ? "bg-secondary border-border text-foreground shadow-sm" : "bg-card border-border/40 hover:bg-secondary/60 text-muted-foreground hover:text-foreground"
                }`}
              >
                {format(date, "d")}
                <span className={`w-1.5 h-1.5 rounded-full ${hasEntries ? (isCurrentDay ? "bg-primary-foreground/80" : "bg-primary") : "bg-transparent"}`} />
              </button>
            );
          })}
        </div>
      </GlassCard>
    </div>
  );
}

function YearView({ anchor, schedule, checklist, onSelectMonth, onChangeYear }: { anchor: Date; schedule: ScheduleEvent[]; checklist: ChecklistItem[]; onSelectMonth: (year: number, month: number) => void; onChangeYear: (year: number) => void; }) {
  const year  = getYear(anchor);
  const month = getMonth(anchor);
  const today = new Date();

  const years = Array.from({ length: YEAR_RANGE_END - YEAR_RANGE_START + 1 }, (_, i) => YEAR_RANGE_START + i);
  const months = Array.from({ length: 12 }, (_, i) => i);

  return (
    <div className="space-y-6">
      <SliderSelector items={years} selected={year} onSelect={onChangeYear} getLabel={(y) => String(y)} testIdPrefix="btn-year" />

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {months.map((m) => {
          const isCurrentMonth = year === getYear(today) && m === getMonth(today);
          const entryCount     = countEntriesInMonth(schedule, checklist, year, m);

          return (
            <button
              key={m} onClick={() => onSelectMonth(year, m)} data-testid={`btn-year-month-${m}`}
              className={`p-5 rounded-2xl border text-left transition-all shadow-sm ${
                isCurrentMonth ? "bg-primary text-primary-foreground border-primary shadow-primary/20 scale-[1.02]" : "bg-card border-border/50 hover:bg-secondary/60 hover:-translate-y-1"
              }`}
            >
              <span className={`block font-bold text-lg mb-1 ${isCurrentMonth ? "text-primary-foreground" : "text-foreground"}`}>{format(new Date(year, m, 1), "MMM")}</span>
              {entryCount > 0 ? (
                <span className={`text-[11px] font-bold uppercase tracking-wider block ${isCurrentMonth ? "text-primary-foreground/80" : "text-muted-foreground"}`}>{entryCount} {entryCount === 1 ? "item" : "items"}</span>
              ) : (
                <span className={`text-[11px] font-medium uppercase tracking-wider block opacity-0`}>-</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function EventCard({ eventId, schedule, subjects, checklist, onEdit, onDelete, onToggle }: { eventId: string; schedule: any[]; subjects: any[]; checklist: any[]; onEdit: () => void; onDelete: () => void; onToggle: (id: string) => void; }) {
  const ev = schedule.find((e: any) => e.id === eventId);
  if (!ev) return null;
  const subject    = subjects.find((s: any) => s.id === ev.subjectId);
  const linkedItem = ev.checklistItemId ? checklist.find((c: any) => c.id === ev.checklistItemId) : null;
  const isDone     = linkedItem ? linkedItem.done : ev.done;

  return (
    <motion.div layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97 }} transition={{ type: "spring", stiffness: 300, damping: 28 }}>
      <SwipeableRow onEdit={onEdit} onDelete={onDelete}>
        <GlassCard className={`p-4 flex gap-4 transition-all group border-border/60 hover:bg-secondary/20 ${isDone ? "opacity-50" : ""}`}>
          <div className="w-14 shrink-0 text-center flex flex-col items-center justify-center border-r border-border/50 pr-3">
            <span className="text-base font-bold leading-tight tracking-tight text-foreground">{format(new Date(ev.datetime), "HH:mm")}</span>
          </div>

          <div className="w-1.5 rounded-full shrink-0 self-stretch" style={{ backgroundColor: subject?.color || "hsl(var(--primary))" }} />

          <div className="flex-1 py-0.5 min-w-0">
            <h3 className={`font-bold text-foreground text-sm ${isDone ? "line-through text-muted-foreground" : ""}`}>{ev.title}</h3>
            {subject && <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mt-1">{subject.name}</p>}
            {ev.note && <p className="text-[11px] font-medium mt-2 text-muted-foreground/80 bg-secondary/50 px-2.5 py-1.5 rounded-lg border border-border/40 inline-block">{ev.note}</p>}
            {ev.checklistItemId && <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-primary mt-2"><Link2 className="w-3 h-3" /> Linked</span>}
          </div>

          <div className="flex flex-col gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity self-start">
            <button onClick={onEdit} className="p-2 text-muted-foreground hover:bg-secondary hover:text-foreground rounded-full transition-all border border-transparent hover:border-border/50"><Pencil className="w-3.5 h-3.5" /></button>
            <button onClick={onDelete} className="p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive rounded-full transition-all border border-transparent hover:border-destructive/20"><Trash2 className="w-3.5 h-3.5" /></button>
          </div>

          {ev.checklistItemId && (
            <button onClick={() => onToggle(ev.checklistItemId!)} className="p-2 h-max shrink-0 mt-0.5 hover:scale-110 transition-transform">
              <CheckCircle2 className={`w-6 h-6 ${isDone ? "text-primary drop-shadow-sm" : "text-muted-foreground"}`} />
            </button>
          )}
        </GlassCard>
      </SwipeableRow>
    </motion.div>
  );
}

const SCHEDULE_REMOVE_ACTION: SwipeAction = { icon: <Trash2 className="w-5 h-5" />, label: "Remove", bg: "bg-secondary", color: "text-muted-foreground" };
function getTaskCycleAction(done: boolean, didNotDo?: boolean): SwipeAction {
  if (!done && !didNotDo) return { icon: <CheckCircle2 className="w-5 h-5" />, label: "Done", bg: "bg-emerald-500/15", color: "text-emerald-600" };
  if (done) return { icon: <XCircle className="w-5 h-5" />, label: "Skip", bg: "bg-slate-400/15", color: "text-slate-500" };
  return { icon: <RotateCcw className="w-5 h-5" />, label: "Undo", bg: "bg-primary/15", color: "text-primary" };
}

function TaskCard({ taskId, checklist, onToggle, onRemove, onCycleStatus }: { taskId: string; checklist: any[]; onToggle: () => void; onRemove: () => void; onCycleStatus: () => void; }) {
  const item = checklist.find((c: any) => c.id === taskId);
  if (!item) return null;
  const imp = item.importance ? IMPORTANCE_META[item.importance as ImportanceLevel] : null;
  const isOverdue = !item.done && !item.didNotDo && item.dueDate && isPast(parseISO(item.dueDate)) && !dateFnsIsToday(parseISO(item.dueDate));

  return (
    <motion.div layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97 }} transition={{ type: "spring", stiffness: 300, damping: 28 }}>
      <SwipeableRow onEdit={onRemove} onDelete={onCycleStatus} editAction={SCHEDULE_REMOVE_ACTION} deleteAction={getTaskCycleAction(item.done, item.didNotDo)}>
        <GlassCard className={`p-4 flex gap-4 transition-all border-border/60 hover:bg-secondary/20 ${item.done || item.didNotDo ? "opacity-50" : ""}`}>
          <div className="w-14 shrink-0 text-center flex flex-col items-center justify-center border-r border-border/50 pr-3">
            {item.dueTime ? (
              <span className={`text-base font-bold leading-tight tracking-tight ${isOverdue ? "text-destructive" : "text-foreground"}`}>{item.dueTime}</span>
            ) : (
              <Circle className="w-5 h-5 text-muted-foreground/30" />
            )}
          </div>

          <div className="flex-1 py-0.5 min-w-0">
            <h3 className={`font-bold text-sm text-foreground ${item.done ? "line-through text-muted-foreground" : item.didNotDo ? "text-muted-foreground" : ""}`}>{item.text}</h3>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              {imp && (
                <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-secondary/50 border border-border/50 ${imp.color}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${imp.dot}`} />{imp.label}
                </span>
              )}
              {isOverdue && <span className="inline-flex px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-destructive/10 text-destructive border border-destructive/20">Overdue</span>}
            </div>
          </div>

          <button onClick={onToggle} className="p-2 shrink-0 mt-0.5 hover:scale-110 transition-transform">
            {item.done ? <CheckCircle2 className="w-6 h-6 text-primary drop-shadow-sm" /> : item.didNotDo ? <XCircle className="w-6 h-6 text-muted-foreground" /> : <Circle className="w-6 h-6 text-muted-foreground hover:text-primary transition-colors" />}
          </button>
        </GlassCard>
      </SwipeableRow>
    </motion.div>
  );
}
