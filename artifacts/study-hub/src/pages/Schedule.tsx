import { useState, useRef, useEffect, useMemo } from "react";
import { useStudyData } from "@/hooks/useStudyData";
import {
  type SchedulePlan,
  type SchedulePlanItem,
  type ScheduleType,
  type RepeatPatternPlan,
  type ChecklistItem,
  type ScheduleEvent,
  type ImportanceLevel,
} from "@/hooks/useStudyData";
import { GlassCard } from "@/components/shared/GlassCard";
import { BottomSheet } from "@/components/shared/BottomSheet";
import { ConfirmSheet } from "@/components/shared/ConfirmSheet";
import { SwipeableRow } from "@/components/shared/SwipeableRow";
import { FabPortal } from "@/components/shared/FabPortal";
import {
  format, isSameDay, parseISO, isPast, isToday as dateFnsIsToday,
  getYear, getMonth, getDaysInMonth, getDay, startOfWeek, addDays,
  differenceInCalendarDays,
} from "date-fns";
import {
  Plus, CalendarDays, BookOpen, Clock, ChevronLeft, ChevronRight,
  Trash2, Pencil, CheckCircle2, Circle, XCircle, RotateCcw, AlertCircle,
  GraduationCap, BookMarked,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// ─── Types ───────────────────────────────────────────────────────────────────

type ViewLevel = "day" | "month" | "year";

const YEAR_RANGE_START = 1990;
const YEAR_RANGE_END   = 2039;

const IMPORTANCE_META: Record<ImportanceLevel, { label: string; color: string; dot: string }> = {
  high:   { label: "High",   color: "text-rose-500",    dot: "bg-rose-500"    },
  medium: { label: "Medium", color: "text-amber-500",   dot: "bg-amber-500"   },
  low:    { label: "Low",    color: "text-emerald-500", dot: "bg-emerald-500" },
};

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const inputCls = "w-full bg-background border border-border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function daysUntil(dateStr: string): number {
  const target = new Date(dateStr);
  const today  = new Date();
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - today.getTime()) / 86_400_000);
}

function rangesOverlap(aS: string, aE: string, bS: string, bE: string) {
  return aS <= bE && aE >= bS;
}

function resolveConflicts(plans: SchedulePlan[]) {
  const sorted = [...plans].sort((a, b) => {
    if (a.type !== b.type) return a.type === "exam" ? -1 : 1;
    return a.startDate.localeCompare(b.startDate);
  });
  const visible: SchedulePlan[] = [];
  const hiddenIds = new Set<string>();
  for (const plan of sorted) {
    if (hiddenIds.has(plan.id)) continue;
    const conflicts = visible.some((v) =>
      rangesOverlap(v.startDate, v.endDate, plan.startDate, plan.endDate)
    );
    if (conflicts) hiddenIds.add(plan.id);
    else visible.push(plan);
  }
  return { visible, hidden: sorted.filter((p) => hiddenIds.has(p.id)) };
}

// Check if a given date falls on a study plan session day
function isStudyPlanDay(plan: SchedulePlan, date: Date): boolean {
  if (plan.type !== "study") return false;
  const d = format(date, "yyyy-MM-dd");
  if (d < plan.startDate || d > plan.endDate) return false;
  return plan.items.some((item) => {
    if (!item.repeatPattern || item.repeatPattern === "daily") return true;
    if (item.repeatPattern === "weekly") return (item.weekDays ?? []).includes(date.getDay());
    return false;
  });
}

function hasEntriesOnDate(
  schedule: ScheduleEvent[],
  checklist: ChecklistItem[],
  plans: SchedulePlan[],
  subjects: any[],
  date: Date
): boolean {
  if (schedule.some((e) => isSameDay(new Date(e.datetime), date))) return true;
  if (checklist.some((c) => !!c.dueDate && isSameDay(parseISO(c.dueDate), date))) return true;
  if (plans.some((p) => isStudyPlanDay(p, date))) return true;
  const today0 = new Date(); today0.setHours(0,0,0,0);
  if (subjects.some((s: any) => (s.exams ?? []).some((e: any) => e.date && isSameDay(new Date(e.date), date)))) return true;
  return false;
}

function countEntriesInMonth(
  schedule: ScheduleEvent[],
  checklist: ChecklistItem[],
  year: number,
  month: number
): number {
  return (
    schedule.filter((e) => { const d = new Date(e.datetime); return getYear(d) === year && getMonth(d) === month; }).length +
    checklist.filter((c) => { if (!c.dueDate) return false; const d = parseISO(c.dueDate); return getYear(d) === year && getMonth(d) === month; }).length
  );
}

function newItem(): SchedulePlanItem {
  return { id: crypto.randomUUID(), subjectName: "" };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionHeader({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between px-0.5 mb-4">
      <h2 className="text-xl font-bold tracking-tight">{title}</h2>
      {action}
    </div>
  );
}

// ── Next Exam Section ─────────────────────────────────────────────────────────

function NextExamSection({ subjects }: { subjects: any[] }) {
  const now = new Date(); now.setHours(0, 0, 0, 0);
  const upcoming = subjects
    .flatMap((s) => (s.exams ?? [])
      .filter((e: any) => e.date && new Date(e.date) >= now)
      .map((e: any) => ({ ...e, subject: s }))
    )
    .sort((a, b) => new Date(a.date!).getTime() - new Date(b.date!).getTime());

  if (upcoming.length === 0) {
    return (
      <section>
        <SectionHeader title="Next Exam" />
        <GlassCard className="p-8 text-center border-dashed border-2 bg-transparent text-muted-foreground">
          <GraduationCap className="w-8 h-8 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No upcoming exams.</p>
          <p className="text-sm mt-1 opacity-70">Add exam dates in Subjects to see them here.</p>
        </GlassCard>
      </section>
    );
  }

  const featured = upcoming[0];
  const rest = upcoming.slice(1, 5);
  const featuredDays = daysUntil(featured.date!);

  return (
    <section>
      <SectionHeader title="Next Exam" />
      <div className="space-y-3">
        {/* Featured — most urgent */}
        <GlassCard
          className="p-5 relative overflow-hidden border-l-4 border-border/60"
          style={{ borderLeftColor: featured.subject.color }}
        >
          <div
            className="absolute inset-0 opacity-[0.04] pointer-events-none"
            style={{ background: `linear-gradient(135deg, ${featured.subject.color}, transparent)` }}
          />
          <div className="relative z-10 flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: featured.subject.color }} />
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  {featured.subject.name}
                </span>
              </div>
              <h3 className="text-lg font-bold text-foreground leading-tight truncate">{featured.name}</h3>
              {featured.date && (
                <p className="text-sm text-muted-foreground mt-1">
                  {format(new Date(featured.date), "EEEE, MMMM d, yyyy")}
                </p>
              )}
            </div>
            <div className="shrink-0 text-center min-w-[64px]">
              <p
                className="text-3xl font-black leading-none"
                style={{ color: featuredDays <= 3 ? "hsl(var(--destructive))" : "hsl(var(--primary))" }}
              >
                {featuredDays === 0 ? "TODAY" : featuredDays === 1 ? "1" : featuredDays}
              </p>
              {featuredDays > 1 && <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mt-0.5">days left</p>}
            </div>
          </div>
        </GlassCard>

        {/* Remaining upcoming */}
        {rest.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {rest.map((exam) => {
              const days = daysUntil(exam.date!);
              return (
                <GlassCard key={exam.id} className="p-4 border-border/60 relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full rounded-l" style={{ backgroundColor: exam.subject.color }} />
                  <div className="pl-2">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1 truncate">
                      {exam.subject.name}
                    </p>
                    <p className="font-bold text-sm text-foreground leading-tight line-clamp-2">{exam.name}</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      {days === 0 ? "Today" : days === 1 ? "Tomorrow" : `In ${days} days`}
                    </p>
                  </div>
                </GlassCard>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

// ── Schedule Plan Card ────────────────────────────────────────────────────────

function SchedulePlanCard({ plan, onClick }: { plan: SchedulePlan; onClick?: () => void }) {
  const isExam = plan.type === "exam";
  const daysStart = daysUntil(plan.startDate);
  const daysEnd   = daysUntil(plan.endDate);
  const isActive  = daysStart <= 0 && daysEnd >= 0;
  const isPast    = daysEnd < 0;

  return (
    <GlassCard
      onClick={onClick}
      className={`p-5 cursor-pointer border-l-4 transition-all hover:shadow-md hover:bg-secondary/20 ${onClick ? "active:scale-[0.99]" : ""}`}
      style={{ borderLeftColor: isExam ? "hsl(var(--destructive))" : "hsl(var(--primary))" }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${
                isExam
                  ? "bg-destructive/10 text-destructive border-destructive/20"
                  : "bg-primary/10 text-primary border-primary/20"
              }`}
            >
              {isExam ? <GraduationCap className="w-3 h-3" /> : <BookMarked className="w-3 h-3" />}
              {isExam ? "Exam" : "Study"}
            </span>
            {isActive && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                Active
              </span>
            )}
            {isPast && (
              <span className="inline-flex px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-secondary text-muted-foreground border border-border/50">
                Past
              </span>
            )}
          </div>
          <h3 className="font-bold text-foreground leading-tight truncate">{plan.title}</h3>
          <p className="text-xs text-muted-foreground mt-1">
            {format(new Date(plan.startDate), "MMM d")} → {format(new Date(plan.endDate), "MMM d, yyyy")}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {plan.items.length} {isExam ? (plan.items.length === 1 ? "exam" : "exams") : (plan.items.length === 1 ? "subject" : "subjects")}
            {!isExam && plan.items[0]?.repeatPattern && ` · ${plan.items[0].repeatPattern}`}
          </p>
        </div>
        {!isPast && !isActive && (
          <div className="text-right shrink-0">
            <p className="text-lg font-black text-foreground leading-none">{Math.max(0, daysStart)}</p>
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">days</p>
          </div>
        )}
      </div>
    </GlassCard>
  );
}

// ── Schedules Section ─────────────────────────────────────────────────────────

function SchedulesSection({
  visiblePlans,
  hiddenPlans,
  onEdit,
  onDelete,
  onDetail,
  onShowHidden,
}: {
  visiblePlans: SchedulePlan[];
  hiddenPlans: SchedulePlan[];
  onEdit: (p: SchedulePlan) => void;
  onDelete: (id: string) => void;
  onDetail: (p: SchedulePlan) => void;
  onShowHidden: () => void;
}) {
  if (visiblePlans.length === 0 && hiddenPlans.length === 0) {
    return (
      <section>
        <SectionHeader title="Schedules" />
        <GlassCard className="p-8 text-center border-dashed border-2 bg-transparent text-muted-foreground">
          <CalendarDays className="w-8 h-8 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No schedules yet.</p>
          <p className="text-sm mt-1 opacity-70">Tap + to create an exam or study schedule.</p>
        </GlassCard>
      </section>
    );
  }

  return (
    <section>
      <SectionHeader
        title="Schedules"
        action={
          hiddenPlans.length > 0 ? (
            <button
              onClick={onShowHidden}
              className="text-xs font-bold text-muted-foreground hover:text-foreground transition-colors bg-secondary/60 px-3 py-1.5 rounded-lg border border-border/50"
            >
              {hiddenPlans.length} hidden (overlap)
            </button>
          ) : undefined
        }
      />
      <div className="space-y-3">
        {visiblePlans.map((plan) => (
          <motion.div
            key={plan.id}
            layout
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 300, damping: 28 }}
          >
            <SwipeableRow onEdit={() => onEdit(plan)} onDelete={() => onDelete(plan.id)}>
              <SchedulePlanCard plan={plan} onClick={() => onDetail(plan)} />
            </SwipeableRow>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

// ── Plan Detail Sheet ─────────────────────────────────────────────────────────

function SchedulePlanDetail({ plan }: { plan: SchedulePlan }) {
  const isExam = plan.type === "exam";
  const days   = daysUntil(plan.startDate);
  const daysE  = daysUntil(plan.endDate);
  const isActive = days <= 0 && daysE >= 0;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider border ${
          isExam ? "bg-destructive/10 text-destructive border-destructive/20" : "bg-primary/10 text-primary border-primary/20"
        }`}>
          {isExam ? <GraduationCap className="w-3.5 h-3.5" /> : <BookMarked className="w-3.5 h-3.5" />}
          {isExam ? "Exam Schedule" : "Study Schedule"}
        </span>
        {isActive && (
          <span className="inline-flex px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
            Active Now
          </span>
        )}
      </div>

      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <CalendarDays className="w-4 h-4" />
          {format(new Date(plan.startDate), "MMM d, yyyy")} → {format(new Date(plan.endDate), "MMM d, yyyy")}
        </span>
      </div>

      {!isActive && days > 0 && (
        <GlassCard className="p-4 flex items-center gap-3 bg-secondary/30">
          <Clock className="w-5 h-5 text-muted-foreground shrink-0" />
          <div>
            <p className="text-sm font-bold">{days === 1 ? "Starts tomorrow" : `Starts in ${days} days`}</p>
            <p className="text-xs text-muted-foreground">{format(new Date(plan.startDate), "EEEE, MMMM d")}</p>
          </div>
        </GlassCard>
      )}

      <div className="space-y-3">
        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          {isExam ? "Exams" : "Subjects"}
        </p>
        {plan.items.map((item) => (
          <GlassCard key={item.id} className="p-4 border-border/50">
            <p className="font-bold text-foreground">{item.subjectName}</p>
            {isExam && item.date && (
              <p className="text-sm text-muted-foreground mt-1">
                {format(new Date(item.date), "EEEE, MMM d")}
                {item.time && ` at ${item.time}`}
                {" · "}
                <span className={daysUntil(item.date) <= 2 ? "text-destructive font-semibold" : ""}>
                  {daysUntil(item.date) === 0 ? "Today" : daysUntil(item.date) === 1 ? "Tomorrow" : `${daysUntil(item.date)} days`}
                </span>
              </p>
            )}
            {!isExam && (
              <p className="text-sm text-muted-foreground mt-1">
                {item.startTime && item.endTime ? `${item.startTime} – ${item.endTime}` : item.startTime ?? ""}
                {item.repeatPattern && ` · ${item.repeatPattern}`}
                {item.repeatPattern === "weekly" && item.weekDays && item.weekDays.length > 0 &&
                  ` (${item.weekDays.map((d) => DAY_NAMES[d]).join(", ")})`
                }
              </p>
            )}
          </GlassCard>
        ))}
      </div>
    </div>
  );
}

// ── Creation Forms ────────────────────────────────────────────────────────────

function ExamScheduleForm({
  initial,
  onSubmit,
  onBack,
}: {
  initial?: SchedulePlan;
  onSubmit: (plan: Omit<SchedulePlan, "id" | "createdAt">) => void;
  onBack: () => void;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [items, setItems] = useState<SchedulePlanItem[]>(
    initial?.items.length ? initial.items : [{ id: crypto.randomUUID(), subjectName: "", date: "", time: "" }]
  );

  const addItem = () => setItems((p) => [...p, { id: crypto.randomUUID(), subjectName: "", date: "", time: "" }]);
  const removeItem = (id: string) => setItems((p) => p.filter((i) => i.id !== id));
  const updateItem = (id: string, patch: Partial<SchedulePlanItem>) =>
    setItems((p) => p.map((i) => (i.id === id ? { ...i, ...patch } : i)));

  const handleSubmit = () => {
    const validItems = items.filter((i) => i.subjectName.trim() && i.date);
    if (!title.trim() || !validItems.length) return;
    const dates = validItems.map((i) => i.date!).sort();
    onSubmit({
      type: "exam",
      title: title.trim(),
      startDate: dates[0],
      endDate: dates[dates.length - 1],
      items: validItems,
    });
  };

  return (
    <div className="space-y-5">
      <div>
        <label className="block text-sm font-medium mb-2">Schedule Title</label>
        <input
          className={inputCls}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Mid-term Exams Week"
        />
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">Exams</p>
          <button
            type="button"
            onClick={addItem}
            className="text-xs font-bold text-primary flex items-center gap-1 hover:opacity-80"
          >
            <Plus className="w-3.5 h-3.5" /> Add Exam
          </button>
        </div>
        {items.map((item, i) => (
          <GlassCard key={item.id} className="p-4 space-y-3 border-border/50">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Exam {i + 1}</span>
              {items.length > 1 && (
                <button type="button" onClick={() => removeItem(item.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
            <input
              className={inputCls}
              value={item.subjectName}
              onChange={(e) => updateItem(item.id, { subjectName: e.target.value })}
              placeholder="Subject / Exam name"
            />
            <div className="grid grid-cols-2 gap-3">
              <input
                type="date"
                className={inputCls}
                value={item.date ?? ""}
                onChange={(e) => updateItem(item.id, { date: e.target.value })}
              />
              <input
                type="time"
                className={inputCls}
                value={item.time ?? ""}
                onChange={(e) => updateItem(item.id, { time: e.target.value })}
              />
            </div>
          </GlassCard>
        ))}
      </div>

      <div className="flex gap-3 pt-2">
        {!initial && (
          <button
            type="button"
            onClick={onBack}
            className="flex-none px-5 py-3.5 rounded-xl border border-border/50 text-muted-foreground font-semibold hover:bg-secondary/50 transition-colors"
          >
            Back
          </button>
        )}
        <button
          type="button"
          onClick={handleSubmit}
          className="flex-1 bg-primary text-primary-foreground font-semibold rounded-xl py-3.5 hover:opacity-90 transition-opacity"
        >
          {initial ? "Save Changes" : "Create Schedule"}
        </button>
      </div>
    </div>
  );
}

function StudyScheduleForm({
  initial,
  onSubmit,
  onBack,
}: {
  initial?: SchedulePlan;
  onSubmit: (plan: Omit<SchedulePlan, "id" | "createdAt">) => void;
  onBack: () => void;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [startDate, setStartDate] = useState(initial?.startDate ?? "");
  const [endDate, setEndDate] = useState(initial?.endDate ?? "");
  const [items, setItems] = useState<SchedulePlanItem[]>(
    initial?.items.length
      ? initial.items
      : [{ id: crypto.randomUUID(), subjectName: "", startTime: "", endTime: "", repeatPattern: "weekly", weekDays: [1] }]
  );

  const addItem = () =>
    setItems((p) => [...p, { id: crypto.randomUUID(), subjectName: "", startTime: "", endTime: "", repeatPattern: "weekly", weekDays: [1] }]);
  const removeItem = (id: string) => setItems((p) => p.filter((i) => i.id !== id));
  const updateItem = (id: string, patch: Partial<SchedulePlanItem>) =>
    setItems((p) => p.map((i) => (i.id === id ? { ...i, ...patch } : i)));

  const toggleWeekDay = (itemId: string, day: number) => {
    setItems((p) =>
      p.map((i) => {
        if (i.id !== itemId) return i;
        const days = i.weekDays ?? [];
        const next = days.includes(day) ? days.filter((d) => d !== day) : [...days, day].sort();
        return { ...i, weekDays: next };
      })
    );
  };

  const handleSubmit = () => {
    const validItems = items.filter((i) => i.subjectName.trim());
    if (!title.trim() || !startDate || !endDate || !validItems.length) return;
    onSubmit({ type: "study", title: title.trim(), startDate, endDate, items: validItems });
  };

  return (
    <div className="space-y-5">
      <div>
        <label className="block text-sm font-medium mb-2">Schedule Title</label>
        <input
          className={inputCls}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Semester 2 Timetable"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium mb-2">Start Date</label>
          <input type="date" className={inputCls} value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">End Date</label>
          <input type="date" className={inputCls} value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">Subjects</p>
          <button type="button" onClick={addItem} className="text-xs font-bold text-primary flex items-center gap-1 hover:opacity-80">
            <Plus className="w-3.5 h-3.5" /> Add Subject
          </button>
        </div>
        {items.map((item, i) => (
          <GlassCard key={item.id} className="p-4 space-y-3 border-border/50">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Subject {i + 1}</span>
              {items.length > 1 && (
                <button type="button" onClick={() => removeItem(item.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
            <input
              className={inputCls}
              value={item.subjectName}
              onChange={(e) => updateItem(item.id, { subjectName: e.target.value })}
              placeholder="Subject name"
            />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium mb-1.5 text-muted-foreground">Start time</label>
                <input type="time" className={inputCls} value={item.startTime ?? ""} onChange={(e) => updateItem(item.id, { startTime: e.target.value })} />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5 text-muted-foreground">End time</label>
                <input type="time" className={inputCls} value={item.endTime ?? ""} onChange={(e) => updateItem(item.id, { endTime: e.target.value })} />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium mb-2 text-muted-foreground">Repeat</label>
              <div className="flex gap-2">
                {(["daily", "weekly", "monthly"] as RepeatPatternPlan[]).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => updateItem(item.id, { repeatPattern: r })}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize border transition-all ${
                      item.repeatPattern === r
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-secondary/50 text-muted-foreground border-border/50 hover:bg-secondary"
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
            {item.repeatPattern === "weekly" && (
              <div>
                <label className="block text-xs font-medium mb-2 text-muted-foreground">Days</label>
                <div className="flex gap-1.5 flex-wrap">
                  {DAY_NAMES.map((d, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => toggleWeekDay(item.id, idx)}
                      className={`w-9 h-9 rounded-full text-xs font-bold border transition-all ${
                        (item.weekDays ?? []).includes(idx)
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-secondary/50 text-muted-foreground border-border/50 hover:bg-secondary"
                      }`}
                    >
                      {d[0]}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </GlassCard>
        ))}
      </div>

      <div className="flex gap-3 pt-2">
        {!initial && (
          <button
            type="button"
            onClick={onBack}
            className="flex-none px-5 py-3.5 rounded-xl border border-border/50 text-muted-foreground font-semibold hover:bg-secondary/50 transition-colors"
          >
            Back
          </button>
        )}
        <button
          type="button"
          onClick={handleSubmit}
          className="flex-1 bg-primary text-primary-foreground font-semibold rounded-xl py-3.5 hover:opacity-90 transition-opacity"
        >
          {initial ? "Save Changes" : "Create Schedule"}
        </button>
      </div>
    </div>
  );
}

// ── Tasks Section ─────────────────────────────────────────────────────────────

function TasksSection({
  tasks,
  onToggle,
  onRemove,
  onCycle,
}: {
  tasks: ChecklistItem[];
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
  onCycle: (id: string) => void;
}) {
  const today = new Date(); today.setHours(0,0,0,0);
  const todayStr = format(today, "yyyy-MM-dd");

  const todayTasks     = tasks.filter((t) => t.dueDate === todayStr);
  const upcomingTasks  = tasks.filter((t) => t.dueDate && t.dueDate > todayStr).slice(0, 8);
  const overdueTasks   = tasks.filter((t) => t.dueDate && t.dueDate < todayStr && !t.done);

  if (tasks.length === 0) {
    return (
      <section>
        <SectionHeader title="Tasks" />
        <GlassCard className="p-6 text-center border-dashed border-2 bg-transparent text-muted-foreground">
          <Circle className="w-6 h-6 mx-auto mb-2 opacity-30" />
          <p className="font-medium text-sm">No tasks with due dates.</p>
        </GlassCard>
      </section>
    );
  }

  return (
    <section>
      <SectionHeader title="Tasks" />
      <div className="space-y-5">
        {overdueTasks.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-wider text-destructive px-0.5">Overdue</p>
            {overdueTasks.slice(0, 4).map((t) => <MiniTaskCard key={t.id} task={t} onToggle={() => onToggle(t.id)} onRemove={() => onRemove(t.id)} onCycle={() => onCycle(t.id)} />)}
          </div>
        )}
        {todayTasks.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-0.5">Today</p>
            {todayTasks.map((t) => <MiniTaskCard key={t.id} task={t} onToggle={() => onToggle(t.id)} onRemove={() => onRemove(t.id)} onCycle={() => onCycle(t.id)} />)}
          </div>
        )}
        {upcomingTasks.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-0.5">Upcoming</p>
            {upcomingTasks.map((t) => <MiniTaskCard key={t.id} task={t} onToggle={() => onToggle(t.id)} onRemove={() => onRemove(t.id)} onCycle={() => onCycle(t.id)} />)}
          </div>
        )}
      </div>
    </section>
  );
}

function MiniTaskCard({
  task,
  onToggle,
  onRemove,
  onCycle,
}: {
  task: ChecklistItem;
  onToggle: () => void;
  onRemove: () => void;
  onCycle: () => void;
}) {
  const isOverdue = !task.done && !task.didNotDo && task.dueDate && task.dueDate < format(new Date(), "yyyy-MM-dd");
  const imp = task.importance ? IMPORTANCE_META[task.importance] : null;

  return (
    <GlassCard className={`p-3.5 flex gap-3 border-border/60 ${task.done || task.didNotDo ? "opacity-50" : ""}`}>
      <button onClick={onToggle} className="shrink-0 hover:scale-110 transition-transform mt-0.5">
        {task.done
          ? <CheckCircle2 className="w-5 h-5 text-primary" />
          : task.didNotDo
          ? <XCircle className="w-5 h-5 text-muted-foreground" />
          : <Circle className="w-5 h-5 text-muted-foreground hover:text-primary transition-colors" />
        }
      </button>
      <div className="flex-1 min-w-0">
        <p className={`font-semibold text-sm text-foreground ${task.done ? "line-through text-muted-foreground" : ""}`}>{task.text}</p>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          {task.dueDate && (
            <span className={`text-[10px] font-bold ${isOverdue ? "text-destructive" : "text-muted-foreground"}`}>
              {task.dueDate === format(new Date(), "yyyy-MM-dd") ? "Today" : format(parseISO(task.dueDate), "MMM d")}
              {task.dueTime && ` ${task.dueTime}`}
            </span>
          )}
          {imp && (
            <span className={`text-[10px] font-bold flex items-center gap-1 ${imp.color}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${imp.dot}`} />{imp.label}
            </span>
          )}
          {isOverdue && <span className="text-[10px] font-bold uppercase text-destructive">Overdue</span>}
        </div>
      </div>
      <button onClick={onRemove} className="shrink-0 p-1 text-muted-foreground hover:text-destructive transition-colors">
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </GlassCard>
  );
}

// ── Calendar sub-components (kept from existing) ───────────────────────────────

function ViewToggle({ level, onChange }: { level: ViewLevel; onChange: (l: ViewLevel) => void }) {
  const OPTIONS: { value: ViewLevel; label: string }[] = [
    { value: "day", label: "Day" }, { value: "month", label: "Month" }, { value: "year", label: "Year" },
  ];
  return (
    <div className="inline-flex p-1 rounded-xl bg-secondary/60 border border-border/50 self-start">
      {OPTIONS.map((opt) => {
        const active = level === opt.value;
        return (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={`relative px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
              active ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {active && (
              <motion.div
                layoutId="sched-view-pill"
                className="absolute inset-0 bg-primary rounded-lg"
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

function SliderSelector<T extends string | number>({
  items, selected, onSelect, getLabel,
}: {
  items: T[]; selected: T; onSelect: (v: T) => void; getLabel: (v: T) => string;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = scrollRef.current?.querySelector('[data-selected="true"]') as HTMLElement | null;
    el?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, [selected]);

  return (
    <div ref={scrollRef} className="flex gap-2 overflow-x-auto scrollbar-hide py-1 -mx-2 px-2 snap-x snap-mandatory">
      {items.map((item) => {
        const isSel = item === selected;
        return (
          <button
            key={String(item)}
            data-selected={isSel ? "true" : undefined}
            onClick={() => onSelect(item)}
            className={`snap-center flex-shrink-0 px-5 py-2.5 rounded-xl text-sm font-bold transition-all border shadow-sm ${
              isSel
                ? "bg-primary text-primary-foreground border-primary shadow-primary/20 scale-105"
                : "bg-card border-border/50 hover:bg-secondary/60 text-muted-foreground"
            }`}
          >
            {getLabel(item)}
          </button>
        );
      })}
    </div>
  );
}

function MonthView({
  anchor, schedule, checklist, plans, subjects, onSelectDay, onBackToYear, onChangeMonth,
}: {
  anchor: Date; schedule: ScheduleEvent[]; checklist: ChecklistItem[];
  plans: SchedulePlan[]; subjects: any[];
  onSelectDay: (d: Date) => void; onBackToYear: () => void; onChangeMonth: (y: number, m: number) => void;
}) {
  const year  = getYear(anchor);
  const month = getMonth(anchor);
  const today = new Date();
  const daysInM  = getDaysInMonth(new Date(year, month, 1));
  const leading  = getDay(new Date(year, month, 1));
  const cells: (Date | null)[] = [];
  for (let i = 0; i < leading; i++) cells.push(null);
  for (let d = 1; d <= daysInM; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <button onClick={onBackToYear} className="inline-flex items-center gap-1.5 text-sm font-bold text-muted-foreground hover:text-foreground transition-colors bg-secondary/50 px-3 py-1.5 rounded-lg border border-border/50">
          <ChevronLeft className="w-4 h-4" /> {year}
        </button>
      </div>
      <SliderSelector items={Array.from({ length: 12 }, (_, i) => i)} selected={month} onSelect={(m) => onChangeMonth(year, m)} getLabel={(m) => format(new Date(2000, m, 1), "MMMM")} />
      <GlassCard className="p-4 md:p-6 border-border/60">
        <div className="grid grid-cols-7 gap-1.5 text-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50 mb-3">
          {["S","M","T","W","T","F","S"].map((l, i) => <span key={i}>{l}</span>)}
        </div>
        <div className="grid grid-cols-7 gap-1.5">
          {cells.map((date, i) => {
            if (!date) return <div key={i} className="aspect-square rounded-xl bg-secondary/10 border border-dashed border-border/20" />;
            const isNow   = isSameDay(date, today);
            const isAnch  = isSameDay(date, anchor) && !isNow;
            const hasEnt  = hasEntriesOnDate(schedule, checklist, plans, subjects, date);
            return (
              <button
                key={i}
                onClick={() => onSelectDay(date)}
                className={`aspect-square rounded-xl flex flex-col items-center justify-center gap-0.5 text-sm font-bold transition-all border shadow-sm ${
                  isNow ? "bg-primary text-primary-foreground border-primary shadow-primary/30 scale-105 z-10"
                  : isAnch ? "bg-secondary border-border text-foreground"
                  : "bg-card border-border/40 hover:bg-secondary/60 text-muted-foreground hover:text-foreground"
                }`}
              >
                {format(date, "d")}
                <span className={`w-1.5 h-1.5 rounded-full ${hasEnt ? (isNow ? "bg-primary-foreground/80" : "bg-primary") : "bg-transparent"}`} />
              </button>
            );
          })}
        </div>
      </GlassCard>
    </div>
  );
}

function YearView({
  anchor, schedule, checklist, onSelectMonth, onChangeYear,
}: {
  anchor: Date; schedule: ScheduleEvent[]; checklist: ChecklistItem[];
  onSelectMonth: (y: number, m: number) => void; onChangeYear: (y: number) => void;
}) {
  const year  = getYear(anchor);
  const today = new Date();
  const years = Array.from({ length: YEAR_RANGE_END - YEAR_RANGE_START + 1 }, (_, i) => YEAR_RANGE_START + i);

  return (
    <div className="space-y-4">
      <SliderSelector items={years} selected={year} onSelect={onChangeYear} getLabel={(y) => String(y)} />
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {Array.from({ length: 12 }, (_, m) => {
          const isNow  = year === getYear(today) && m === getMonth(today);
          const count  = countEntriesInMonth(schedule, checklist, year, m);
          return (
            <button
              key={m}
              onClick={() => onSelectMonth(year, m)}
              className={`p-5 rounded-2xl border text-left transition-all shadow-sm ${
                isNow ? "bg-primary text-primary-foreground border-primary shadow-primary/20 scale-[1.02]"
                : "bg-card border-border/50 hover:bg-secondary/60 hover:-translate-y-1"
              }`}
            >
              <span className={`block font-bold text-lg mb-1 ${isNow ? "text-primary-foreground" : "text-foreground"}`}>
                {format(new Date(year, m, 1), "MMM")}
              </span>
              {count > 0 && (
                <span className={`text-[11px] font-bold uppercase tracking-wider ${isNow ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                  {count} item{count !== 1 ? "s" : ""}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function Schedule() {
  const {
    subjects, schedule, checklist,
    schedulePlans, addSchedulePlan, updateSchedulePlan, deleteSchedulePlan,
    toggleChecklistItem, skipChecklistItem, deleteChecklistItem, setCascadeChecklistStatus,
  } = useStudyData();

  // Sheet state
  const [isCreating,     setIsCreating]     = useState(false);
  const [createType,     setCreateType]     = useState<ScheduleType | null>(null);
  const [editingPlan,    setEditingPlan]    = useState<SchedulePlan | null>(null);
  const [detailPlan,     setDetailPlan]     = useState<SchedulePlan | null>(null);
  const [deletingPlanId, setDeletingPlanId] = useState<string | null>(null);
  const [showHidden,     setShowHidden]     = useState(false);

  // Calendar state
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [viewLevel,    setViewLevel]    = useState<ViewLevel>("day");
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (viewLevel !== "day") return;
    const t = setTimeout(() => {
      const btn = scrollAreaRef.current?.querySelector('[data-today="true"]') as HTMLElement | null;
      btn?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
    }, 80);
    return () => clearTimeout(t);
  }, [viewLevel]);

  const upcomingExams = useMemo(() => {
    const now = new Date(); now.setHours(0,0,0,0);
    return subjects
      .flatMap((s) => (s.exams ?? []).filter((e: any) => e.date && new Date(e.date) >= now).map((e: any) => ({ ...e, subject: s })))
      .sort((a, b) => new Date(a.date!).getTime() - new Date(b.date!).getTime());
  }, [subjects]);

  const taskEntries = useMemo(() =>
    checklist
      .filter((c) => !!c.dueDate && !c.isTaskList)
      .sort((a, b) => (a.dueDate! + (a.dueTime ?? "23:59")).localeCompare(b.dueDate! + (b.dueTime ?? "23:59"))),
    [checklist]
  );

  const startDate = startOfWeek(selectedDate, { weekStartsOn: 1 });
  const weekDays  = Array.from({ length: 7 }).map((_, i) => addDays(startDate, i));

  const dayEntries = useMemo(() => {
    const events = schedule
      .filter((e) => isSameDay(new Date(e.datetime), selectedDate))
      .map((e) => ({ kind: "event" as const, id: e.id, sortTime: new Date(e.datetime).getTime() }));
    const tasks = checklist
      .filter((c) => !!c.dueDate && isSameDay(parseISO(c.dueDate), selectedDate))
      .map((c) => {
        const t = c.dueTime ? c.dueDate! + "T" + c.dueTime : null;
        return { kind: "task" as const, id: c.id, sortTime: t ? new Date(t).getTime() : Infinity };
      });
    return [...events, ...tasks].sort((a, b) => a.sortTime - b.sortTime);
  }, [schedule, checklist, selectedDate]);

  const { visible: visiblePlans, hidden: hiddenPlans } = useMemo(() => resolveConflicts(schedulePlans), [schedulePlans]);

  const removeTask = (id: string) => {
    const item = checklist.find((c) => c.id === id);
    if (!item) return;
    if (item.repeat && item.repeat !== "none") skipChecklistItem(id);
    else deleteChecklistItem(id);
  };

  const cycleTask = (id: string) => {
    const it = checklist.find((c) => c.id === id);
    if (!it) return;
    if (!it.done && !it.didNotDo) setCascadeChecklistStatus(id, true, false);
    else if (it.done) setCascadeChecklistStatus(id, false, true);
    else setCascadeChecklistStatus(id, false, false);
  };

  const closeCreate = () => { setIsCreating(false); setCreateType(null); };

  return (
    <div className="space-y-10 pb-28 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold tracking-tight mb-2">Schedule</h1>
        <p className="text-lg text-muted-foreground font-medium">{format(new Date(), "EEEE, MMMM do")}</p>
      </div>

      {/* 1. Next Exam */}
      <NextExamSection subjects={subjects} />

      {/* 2. Schedules */}
      <SchedulesSection
        visiblePlans={visiblePlans}
        hiddenPlans={hiddenPlans}
        onEdit={setEditingPlan}
        onDelete={setDeletingPlanId}
        onDetail={setDetailPlan}
        onShowHidden={() => setShowHidden(true)}
      />

      {/* 3. Tasks */}
      <TasksSection tasks={taskEntries} onToggle={toggleChecklistItem} onRemove={removeTask} onCycle={cycleTask} />

      {/* 4. Calendar */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold tracking-tight">Calendar</h2>
          <ViewToggle level={viewLevel} onChange={setViewLevel} />
        </div>

        {viewLevel === "day" && (
          <>
            <div ref={scrollAreaRef} className="flex gap-2 overflow-x-auto scrollbar-hide py-2 -mx-2 px-2 snap-x snap-mandatory">
              {weekDays.map((date, i) => {
                const isNow  = isSameDay(date, new Date());
                const isSel  = isSameDay(date, selectedDate);
                const hasEnt = hasEntriesOnDate(schedule, checklist, schedulePlans, subjects, date);
                return (
                  <button
                    key={i}
                    data-today={isNow ? "true" : undefined}
                    onClick={() => setSelectedDate(date)}
                    className={`snap-center flex-shrink-0 flex flex-col items-center justify-center w-[4.5rem] h-[5rem] rounded-2xl transition-all duration-200 border shadow-sm ${
                      isSel
                        ? "bg-primary text-primary-foreground border-primary shadow-primary/20 scale-105"
                        : "bg-card border-border/50 hover:bg-secondary/60 text-muted-foreground"
                    }`}
                  >
                    <span className="text-[10px] uppercase font-bold tracking-wider leading-none mb-1">{format(date, "EEE")}</span>
                    <span className="text-xl font-bold leading-none">{format(date, "d")}</span>
                    {!isSel && (isNow || hasEnt) && (
                      <div className={`w-1.5 h-1.5 rounded-full mt-2 ${isNow ? "bg-primary" : "bg-muted-foreground/30"}`} />
                    )}
                    {isSel && hasEnt && <div className="w-1.5 h-1.5 rounded-full mt-2 bg-primary-foreground/80" />}
                  </button>
                );
              })}
            </div>

            <div className="space-y-3 pt-1">
              <h3 className="text-base font-bold tracking-tight text-foreground/90 px-0.5">
                {isSameDay(selectedDate, new Date()) ? "Today's Agenda" : format(selectedDate, "EEEE, MMMM d")}
              </h3>
              {dayEntries.length === 0 ? (
                <GlassCard className="p-10 text-center border-dashed border-2 bg-transparent text-muted-foreground shadow-none text-sm">
                  Nothing on this day
                </GlassCard>
              ) : (
                <AnimatePresence initial={false}>
                  {dayEntries.map((entry) => {
                    if (entry.kind === "event") {
                      const ev = schedule.find((e) => e.id === entry.id);
                      if (!ev) return null;
                      const sub = subjects.find((s: any) => s.id === ev.subjectId);
                      return (
                        <motion.div key={`ev-${entry.id}`} layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97 }}>
                          <GlassCard className="p-4 flex gap-4 border-border/60">
                            <div className="w-14 shrink-0 text-center flex flex-col items-center justify-center border-r border-border/50 pr-3">
                              <span className="text-base font-bold leading-tight">{format(new Date(ev.datetime), "HH:mm")}</span>
                            </div>
                            <div className="w-1.5 rounded-full shrink-0 self-stretch" style={{ backgroundColor: sub?.color ?? "hsl(var(--primary))" }} />
                            <div className="flex-1 py-0.5">
                              <p className="font-bold text-foreground text-sm">{ev.title}</p>
                              {sub && <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mt-1">{sub.name}</p>}
                              {ev.note && <p className="text-[11px] mt-2 text-muted-foreground/80 bg-secondary/50 px-2.5 py-1.5 rounded-lg border border-border/40 inline-block">{ev.note}</p>}
                            </div>
                          </GlassCard>
                        </motion.div>
                      );
                    }
                    const task = checklist.find((c) => c.id === entry.id);
                    if (!task) return null;
                    return (
                      <motion.div key={`task-${entry.id}`} layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97 }}>
                        <MiniTaskCard task={task} onToggle={() => toggleChecklistItem(task.id)} onRemove={() => removeTask(task.id)} onCycle={() => cycleTask(task.id)} />
                      </motion.div>
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
            plans={schedulePlans}
            subjects={subjects}
            onSelectDay={(d) => { setSelectedDate(d); setViewLevel("day"); }}
            onBackToYear={() => setViewLevel("year")}
            onChangeMonth={(y, m) => setSelectedDate(new Date(y, m, 1))}
          />
        )}

        {viewLevel === "year" && (
          <YearView
            anchor={selectedDate}
            schedule={schedule}
            checklist={checklist}
            onSelectMonth={(y, m) => { setSelectedDate(new Date(y, m, 1)); setViewLevel("month"); }}
            onChangeYear={(y) => setSelectedDate(new Date(y, getMonth(selectedDate), 1))}
          />
        )}
      </section>

      {/* FAB */}
      <FabPortal>
        <button
          onClick={() => setIsCreating(true)}
          className="fixed bottom-24 md:bottom-10 right-6 md:right-10 w-14 h-14 bg-primary text-primary-foreground rounded-full shadow-lg shadow-primary/30 flex items-center justify-center hover:scale-105 transition-transform z-40"
        >
          <Plus className="w-6 h-6" />
        </button>
      </FabPortal>

      {/* Type picker */}
      <BottomSheet isOpen={isCreating && !createType} onClose={closeCreate} title="New Schedule">
        <div className="space-y-3">
          <button
            onClick={() => setCreateType("exam")}
            className="w-full flex items-center gap-4 p-5 rounded-2xl bg-destructive/5 border border-destructive/20 hover:bg-destructive/10 transition-colors text-left"
          >
            <div className="w-12 h-12 rounded-2xl bg-destructive/10 flex items-center justify-center shrink-0 border border-destructive/20">
              <GraduationCap className="w-6 h-6 text-destructive" />
            </div>
            <div>
              <p className="font-bold text-foreground">Exam Schedule</p>
              <p className="text-sm text-muted-foreground mt-0.5">Group multiple exams with their dates &amp; times</p>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground ml-auto shrink-0" />
          </button>

          <button
            onClick={() => setCreateType("study")}
            className="w-full flex items-center gap-4 p-5 rounded-2xl bg-primary/5 border border-primary/20 hover:bg-primary/10 transition-colors text-left"
          >
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20">
              <BookMarked className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="font-bold text-foreground">Study Schedule</p>
              <p className="text-sm text-muted-foreground mt-0.5">Recurring sessions with days, times &amp; repeat pattern</p>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground ml-auto shrink-0" />
          </button>
        </div>
      </BottomSheet>

      {/* Exam creation form */}
      <BottomSheet isOpen={isCreating && createType === "exam"} onClose={closeCreate} title="New Exam Schedule">
        <ExamScheduleForm
          onSubmit={(plan) => { addSchedulePlan(plan); closeCreate(); }}
          onBack={() => setCreateType(null)}
        />
      </BottomSheet>

      {/* Study creation form */}
      <BottomSheet isOpen={isCreating && createType === "study"} onClose={closeCreate} title="New Study Schedule">
        <StudyScheduleForm
          onSubmit={(plan) => { addSchedulePlan(plan); closeCreate(); }}
          onBack={() => setCreateType(null)}
        />
      </BottomSheet>

      {/* Edit exam */}
      <BottomSheet isOpen={!!editingPlan && editingPlan.type === "exam"} onClose={() => setEditingPlan(null)} title="Edit Exam Schedule">
        {editingPlan?.type === "exam" && (
          <ExamScheduleForm
            initial={editingPlan}
            onSubmit={(plan) => { updateSchedulePlan(editingPlan.id, plan); setEditingPlan(null); }}
            onBack={() => setEditingPlan(null)}
          />
        )}
      </BottomSheet>

      {/* Edit study */}
      <BottomSheet isOpen={!!editingPlan && editingPlan.type === "study"} onClose={() => setEditingPlan(null)} title="Edit Study Schedule">
        {editingPlan?.type === "study" && (
          <StudyScheduleForm
            initial={editingPlan}
            onSubmit={(plan) => { updateSchedulePlan(editingPlan.id, plan); setEditingPlan(null); }}
            onBack={() => setEditingPlan(null)}
          />
        )}
      </BottomSheet>

      {/* Detail */}
      <BottomSheet isOpen={!!detailPlan} onClose={() => setDetailPlan(null)} title={detailPlan?.title ?? "Schedule"}>
        {detailPlan && <SchedulePlanDetail plan={detailPlan} />}
      </BottomSheet>

      {/* Hidden (overlapping) plans */}
      <BottomSheet isOpen={showHidden} onClose={() => setShowHidden(false)} title={`${hiddenPlans.length} Overlapping Schedule${hiddenPlans.length !== 1 ? "s" : ""}`}>
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">These schedules overlap with a higher-priority one and are hidden from the main list.</p>
          {hiddenPlans.map((plan) => (
            <SchedulePlanCard key={plan.id} plan={plan} onClick={() => { setDetailPlan(plan); setShowHidden(false); }} />
          ))}
        </div>
      </BottomSheet>

      {/* Delete confirm */}
      <ConfirmSheet
        isOpen={!!deletingPlanId}
        onClose={() => setDeletingPlanId(null)}
        onConfirm={() => { if (deletingPlanId) { deleteSchedulePlan(deletingPlanId); setDeletingPlanId(null); } }}
        title="Delete schedule?"
        message="This schedule will be permanently deleted."
        confirmLabel="Delete"
      />
    </div>
  );
}
