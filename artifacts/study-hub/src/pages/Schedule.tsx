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
  type Subject,
} from "@/hooks/useStudyData";
import { GlassCard } from "@/components/shared/GlassCard";
import { BottomSheet } from "@/components/shared/BottomSheet";
import { ConfirmSheet } from "@/components/shared/ConfirmSheet";
import { SwipeableRow } from "@/components/shared/SwipeableRow";
import { FabPortal } from "@/components/shared/FabPortal";
import {
  format, isSameDay, parseISO,
  getYear, getMonth, getDaysInMonth, getDay, startOfWeek, addDays,
} from "date-fns";
import {
  Plus, CalendarDays, Clock, ChevronLeft, ChevronRight,
  Trash2, CheckCircle2, Circle, XCircle,
  GraduationCap, BookMarked, BookOpen,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// ─── Types ───────────────────────────────────────────────────────────────────

type ViewLevel = "day" | "month" | "year";
type CreateType = ScheduleType | "quickExam" | null;

const YEAR_RANGE_START = 1990;
const YEAR_RANGE_END   = 2039;

const IMPORTANCE_META: Record<ImportanceLevel, { label: string; color: string; dot: string }> = {
  high:   { label: "High",   color: "text-rose-500",    dot: "bg-rose-500"    },
  medium: { label: "Medium", color: "text-amber-500",   dot: "bg-amber-500"   },
  low:    { label: "Low",    color: "text-emerald-500", dot: "bg-emerald-500" },
};

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const inputCls =
  "w-full bg-background border border-border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground";

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
  subjects: Subject[],
  date: Date
): boolean {
  if (schedule.some((e) => isSameDay(new Date(e.datetime), date))) return true;
  if (checklist.some((c) => !!c.dueDate && isSameDay(parseISO(c.dueDate), date))) return true;
  if (plans.some((p) => isStudyPlanDay(p, date))) return true;
  if (subjects.some((s) =>
    (s.exams ?? []).some((e) => e.date && isSameDay(new Date(e.date), date))
  )) return true;
  if (plans.some((p) =>
    p.type === "exam" &&
    p.items.some((i) => i.date && isSameDay(new Date(i.date), date))
  )) return true;
  return false;
}

function countEntriesInMonth(
  schedule: ScheduleEvent[],
  checklist: ChecklistItem[],
  year: number,
  month: number
): number {
  return (
    schedule.filter((e) => {
      const d = new Date(e.datetime);
      return getYear(d) === year && getMonth(d) === month;
    }).length +
    checklist.filter((c) => {
      if (!c.dueDate) return false;
      const d = parseISO(c.dueDate);
      return getYear(d) === year && getMonth(d) === month;
    }).length
  );
}

// ─── Active review subject helper ─────────────────────────────────────────────

export function getActiveReviewSubject(plans: SchedulePlan[], now: Date): SchedulePlanItem | null {
  const todayStr = format(now, "yyyy-MM-dd");
  const reviewPlans = plans.filter(
    (p) => p.type === "review" && p.startDate <= todayStr && p.endDate >= todayStr
  );
  const allItems: SchedulePlanItem[] = reviewPlans.flatMap((p) => p.items);

  // Currently active: reviewStartDate <= today <= reviewEndDate
  const active = allItems.filter(
    (i) => i.reviewStartDate && i.reviewEndDate &&
      i.reviewStartDate <= todayStr && i.reviewEndDate >= todayStr
  );
  if (active.length > 0) {
    // Pick soonest reviewEndDate
    return active.sort((a, b) => (a.reviewEndDate ?? "").localeCompare(b.reviewEndDate ?? ""))[0];
  }
  // Upcoming: nearest reviewStartDate
  const upcoming = allItems.filter((i) => i.reviewStartDate && i.reviewStartDate > todayStr);
  if (upcoming.length > 0) {
    return upcoming.sort((a, b) => (a.reviewStartDate ?? "").localeCompare(b.reviewStartDate ?? ""))[0];
  }
  return null;
}

// ─── Section Header ───────────────────────────────────────────────────────────

function SectionHeader({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between px-0.5 mb-4">
      <h2 className="text-xl font-bold tracking-tight">{title}</h2>
      {action}
    </div>
  );
}

// ─── Next Exam Section — single featured card ─────────────────────────────────

function NextExamSection({ plans }: { plans: SchedulePlan[] }) {
  const now = new Date(); now.setHours(0, 0, 0, 0);
  const examItems = plans
    .filter((p) => p.type === "exam")
    .flatMap((p) => p.items.filter((i) => i.date && new Date(i.date) >= now && !i.checked))
    .sort((a, b) => new Date(a.date!).getTime() - new Date(b.date!).getTime());

  if (examItems.length === 0) return null;

  const featured = examItems[0];
  const featuredDays = daysUntil(featured.date!);

  return (
    <section>
      <SectionHeader title="Next Exam" />
      <GlassCard className="p-5 relative overflow-hidden border-l-4 border-destructive/60">
        <div className="absolute inset-0 opacity-[0.03] bg-destructive pointer-events-none" />
        <div className="relative z-10 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
              {featured.subjectName}
            </p>
            {featured.time && (
              <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" /> {featured.time}
              </p>
            )}
            <p className="text-sm text-muted-foreground mt-1">
              {format(new Date(featured.date!), "EEEE, MMMM d, yyyy")}
            </p>
          </div>
          <div className="shrink-0 text-center min-w-[64px]">
            <p
              className="text-3xl font-black leading-none"
              style={{ color: featuredDays <= 3 ? "hsl(var(--destructive))" : "hsl(var(--primary))" }}
            >
              {featuredDays === 0 ? "TODAY" : featuredDays < 0 ? "PAST" : String(featuredDays)}
            </p>
            {featuredDays > 0 && (
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mt-0.5">
                days left
              </p>
            )}
          </div>
        </div>
      </GlassCard>
    </section>
  );
}

// ─── Exams Section ────────────────────────────────────────────────────────────

function ExamsSection({
  plans,
  onEdit,
  onRemoveItem,
}: {
  plans: SchedulePlan[];
  onEdit: (planId: string) => void;
  onRemoveItem: (planId: string, itemId: string) => void;
}) {
  const allItems = plans
    .filter((p) => p.type === "exam")
    .flatMap((p) =>
      p.items.map((item) => ({ ...item, planId: p.id, planTitle: p.title }))
    )
    .sort((a, b) => {
      if (!a.date) return 1;
      if (!b.date) return -1;
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    });

  if (allItems.length === 0) return null;

  return (
    <section>
      <SectionHeader title="Exams" />
      <div className="space-y-2">
        {allItems.map((item) => {
          const days = item.date ? daysUntil(item.date) : null;
          const isPast = days !== null && days < 0;
          const isChecked = !!item.checked;

          return (
            <SwipeableRow
              key={item.id}
              onEdit={() => onEdit(item.planId)}
              onDelete={() => onRemoveItem(item.planId, item.id)}
            >
              <GlassCard
                className={`p-4 flex items-center gap-4 border-border/60 ${(isPast || isChecked) ? "opacity-50" : ""}`}
              >
                <div
                  className={`w-2 h-2 rounded-full shrink-0 ${
                    isChecked ? "bg-emerald-500"
                    : days === null ? "bg-muted-foreground/30"
                    : isPast ? "bg-muted-foreground/30"
                    : days <= 2 ? "bg-destructive"
                    : days <= 7 ? "bg-amber-500"
                    : "bg-primary"
                  }`}
                />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-foreground truncate">{item.subjectName}</p>
                  {item.date && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {format(new Date(item.date), "EEE, MMM d")}
                      {item.time && ` · ${item.time}`}
                    </p>
                  )}
                </div>
                {isChecked && <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />}
                {!isChecked && days !== null && (
                  <p
                    className={`text-sm font-bold shrink-0 ${
                      isPast ? "text-muted-foreground"
                      : days <= 2 ? "text-destructive"
                      : days <= 7 ? "text-amber-500"
                      : "text-foreground"
                    }`}
                  >
                    {isPast ? "Past" : days === 0 ? "Today" : days === 1 ? "Tomorrow" : `${days}d`}
                  </p>
                )}
              </GlassCard>
            </SwipeableRow>
          );
        })}
      </div>
    </section>
  );
}

// ─── Schedule Plan Card ───────────────────────────────────────────────────────

function SchedulePlanCard({ plan, onClick }: { plan: SchedulePlan; onClick?: () => void }) {
  const isExam   = plan.type === "exam";
  const isReview = plan.type === "review";
  const daysStart = daysUntil(plan.startDate);
  const daysEnd   = daysUntil(plan.endDate);
  const isActive  = daysStart <= 0 && daysEnd >= 0;
  const isPast    = daysEnd < 0;

  const borderColor = isExam
    ? "hsl(var(--destructive))"
    : isReview
    ? "#d97706"
    : "hsl(var(--primary))";

  return (
    <GlassCard
      onClick={onClick}
      className={`p-5 cursor-pointer border-l-4 transition-all hover:shadow-md hover:bg-secondary/20 ${onClick ? "active:scale-[0.99]" : ""}`}
      style={{ borderLeftColor: borderColor }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${
                isExam
                  ? "bg-destructive/10 text-destructive border-destructive/20"
                  : isReview
                  ? "bg-amber-500/10 text-amber-600 border-amber-500/20"
                  : "bg-primary/10 text-primary border-primary/20"
              }`}
            >
              {isExam ? <GraduationCap className="w-3 h-3" /> : isReview ? <BookOpen className="w-3 h-3" /> : <BookMarked className="w-3 h-3" />}
              {isExam ? "Exam" : isReview ? "Review" : "Study"}
            </span>
            {isActive && (
              <span className="inline-flex px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
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
            {plan.items.length}{" "}
            {isExam
              ? plan.items.length === 1 ? "exam" : "exams"
              : plan.items.length === 1 ? "subject" : "subjects"}
            {!isExam && !isReview && plan.items[0]?.repeatPattern && ` · ${plan.items[0].repeatPattern}`}
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

// ─── Schedules Section ────────────────────────────────────────────────────────

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
  if (visiblePlans.length === 0 && hiddenPlans.length === 0) return null;

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

// ─── Plan Detail Sheet ────────────────────────────────────────────────────────

function SchedulePlanDetail({ plan }: { plan: SchedulePlan }) {
  const isExam   = plan.type === "exam";
  const isReview = plan.type === "review";
  const daysS  = daysUntil(plan.startDate);
  const daysE  = daysUntil(plan.endDate);
  const isActive = daysS <= 0 && daysE >= 0;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 flex-wrap">
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider border ${
            isExam
              ? "bg-destructive/10 text-destructive border-destructive/20"
              : isReview
              ? "bg-amber-500/10 text-amber-600 border-amber-500/20"
              : "bg-primary/10 text-primary border-primary/20"
          }`}
        >
          {isExam ? <GraduationCap className="w-3.5 h-3.5" /> : isReview ? <BookOpen className="w-3.5 h-3.5" /> : <BookMarked className="w-3.5 h-3.5" />}
          {isExam ? "Exam Schedule" : isReview ? "Review Schedule" : "Study Schedule"}
        </span>
        {isActive && (
          <span className="inline-flex px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
            Active Now
          </span>
        )}
      </div>

      <p className="text-sm text-muted-foreground flex items-center gap-1.5">
        <CalendarDays className="w-4 h-4" />
        {format(new Date(plan.startDate), "MMM d, yyyy")} → {format(new Date(plan.endDate), "MMM d, yyyy")}
      </p>

      {!isActive && daysS > 0 && (
        <GlassCard className="p-4 flex items-center gap-3 bg-secondary/30">
          <Clock className="w-5 h-5 text-muted-foreground shrink-0" />
          <div>
            <p className="text-sm font-bold">
              {daysS === 1 ? "Starts tomorrow" : `Starts in ${daysS} days`}
            </p>
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
                  {daysUntil(item.date) === 0 ? "Today"
                    : daysUntil(item.date) === 1 ? "Tomorrow"
                    : daysUntil(item.date) < 0 ? "Past"
                    : `${daysUntil(item.date)} days`}
                </span>
              </p>
            )}
            {!isExam && !isReview && (
              <p className="text-sm text-muted-foreground mt-1">
                {item.startTime && item.endTime ? `${item.startTime} – ${item.endTime}` : item.startTime ?? ""}
                {item.repeatPattern && ` · ${item.repeatPattern}`}
                {item.repeatPattern === "weekly" && item.weekDays && item.weekDays.length > 0 &&
                  ` (${item.weekDays.map((d) => DAY_NAMES[d]).join(", ")})`}
              </p>
            )}
            {isReview && (
              <p className="text-sm text-muted-foreground mt-1">
                {item.reviewStartDate && item.reviewEndDate
                  ? `${format(new Date(item.reviewStartDate), "MMM d")} → ${format(new Date(item.reviewEndDate), "MMM d")}`
                  : ""}
              </p>
            )}
          </GlassCard>
        ))}
      </div>
    </div>
  );
}

// ─── Tasks Section (kept but not rendered in Schedule page) ───────────────────

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
  if (tasks.length === 0) return null;

  const todayStr   = format(new Date(), "yyyy-MM-dd");
  const todayTasks    = tasks.filter((t) => t.dueDate === todayStr);
  const upcomingTasks = tasks.filter((t) => t.dueDate && t.dueDate > todayStr).slice(0, 8);
  const overdueTasks  = tasks.filter((t) => t.dueDate && t.dueDate < todayStr && !t.done);

  return (
    <section>
      <SectionHeader title="Tasks" />
      <div className="space-y-5">
        {overdueTasks.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-wider text-destructive px-0.5">Overdue</p>
            {overdueTasks.slice(0, 4).map((t) => (
              <MiniTaskCard
                key={t.id}
                task={t}
                onToggle={() => onToggle(t.id)}
                onRemove={() => onRemove(t.id)}
                onCycle={() => onCycle(t.id)}
              />
            ))}
          </div>
        )}
        {todayTasks.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-0.5">Today</p>
            {todayTasks.map((t) => (
              <MiniTaskCard
                key={t.id}
                task={t}
                onToggle={() => onToggle(t.id)}
                onRemove={() => onRemove(t.id)}
                onCycle={() => onCycle(t.id)}
              />
            ))}
          </div>
        )}
        {upcomingTasks.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-0.5">Upcoming</p>
            {upcomingTasks.map((t) => (
              <MiniTaskCard
                key={t.id}
                task={t}
                onToggle={() => onToggle(t.id)}
                onRemove={() => onRemove(t.id)}
                onCycle={() => onCycle(t.id)}
              />
            ))}
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
  const isOverdue =
    !task.done && !task.didNotDo && task.dueDate && task.dueDate < format(new Date(), "yyyy-MM-dd");
  const imp = task.importance ? IMPORTANCE_META[task.importance] : null;

  return (
    <GlassCard
      className={`p-3.5 flex gap-3 border-border/60 ${task.done || task.didNotDo ? "opacity-50" : ""}`}
    >
      <button onClick={onToggle} className="shrink-0 hover:scale-110 transition-transform mt-0.5">
        {task.done ? (
          <CheckCircle2 className="w-5 h-5 text-primary" />
        ) : task.didNotDo ? (
          <XCircle className="w-5 h-5 text-muted-foreground" />
        ) : (
          <Circle className="w-5 h-5 text-muted-foreground hover:text-primary transition-colors" />
        )}
      </button>
      <div className="flex-1 min-w-0">
        <p
          className={`font-semibold text-sm text-foreground ${task.done ? "line-through text-muted-foreground" : ""}`}
        >
          {task.text}
        </p>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          {task.dueDate && (
            <span
              className={`text-[10px] font-bold ${isOverdue ? "text-destructive" : "text-muted-foreground"}`}
            >
              {task.dueDate === format(new Date(), "yyyy-MM-dd")
                ? "Today"
                : format(parseISO(task.dueDate), "MMM d")}
              {task.dueTime && ` ${task.dueTime}`}
            </span>
          )}
          {imp && (
            <span className={`text-[10px] font-bold flex items-center gap-1 ${imp.color}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${imp.dot}`} />
              {imp.label}
            </span>
          )}
          {isOverdue && (
            <span className="text-[10px] font-bold uppercase text-destructive">Overdue</span>
          )}
        </div>
      </div>
      <button
        onClick={onRemove}
        className="shrink-0 p-1 text-muted-foreground hover:text-destructive transition-colors"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </GlassCard>
  );
}

// ─── Calendar sub-components ──────────────────────────────────────────────────

function ViewToggle({ level, onChange }: { level: ViewLevel; onChange: (l: ViewLevel) => void }) {
  const OPTIONS: { value: ViewLevel; label: string }[] = [
    { value: "day", label: "Day" },
    { value: "month", label: "Month" },
    { value: "year", label: "Year" },
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
  items,
  selected,
  onSelect,
  getLabel,
}: {
  items: T[];
  selected: T;
  onSelect: (v: T) => void;
  getLabel: (v: T) => string;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = scrollRef.current?.querySelector('[data-selected="true"]') as HTMLElement | null;
    el?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, [selected]);

  return (
    <div
      ref={scrollRef}
      className="flex gap-2 overflow-x-auto scrollbar-hide py-1 -mx-2 px-2 snap-x snap-mandatory"
    >
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
  anchor,
  schedule,
  checklist,
  plans,
  subjects,
  onSelectDay,
  onBackToYear,
  onChangeMonth,
}: {
  anchor: Date;
  schedule: ScheduleEvent[];
  checklist: ChecklistItem[];
  plans: SchedulePlan[];
  subjects: Subject[];
  onSelectDay: (d: Date) => void;
  onBackToYear: () => void;
  onChangeMonth: (y: number, m: number) => void;
}) {
  const year     = getYear(anchor);
  const month    = getMonth(anchor);
  const today    = new Date();
  const daysInM  = getDaysInMonth(new Date(year, month, 1));
  const leading  = getDay(new Date(year, month, 1));
  const cells: (Date | null)[] = [];
  for (let i = 0; i < leading; i++) cells.push(null);
  for (let d = 1; d <= daysInM; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);

  // Determine most-important non-exam plan
  const nonExamPlans = plans.filter((p) => p.type !== "exam");
  const mostImportantPlan = nonExamPlans.length > 0
    ? nonExamPlans.reduce((best, p) => {
        const bImp = best.importance ?? 2;
        const pImp = p.importance ?? 2;
        return pImp < bImp ? p : best;
      })
    : null;

  const activeReviewSubject = getActiveReviewSubject(plans, today);

  function getCellBg(date: Date): string | undefined {
    const dateStr = format(date, "yyyy-MM-dd");

    // 1. Exam item date → red
    const hasExamItem = plans.some(
      (p) => p.type === "exam" && p.items.some((i) => i.date === dateStr)
    );
    if (hasExamItem) return "rgba(239,68,68,0.18)";

    // 2. Active review subject range → dark green
    if (
      activeReviewSubject &&
      activeReviewSubject.reviewStartDate &&
      activeReviewSubject.reviewEndDate &&
      dateStr >= activeReviewSubject.reviewStartDate &&
      dateStr <= activeReviewSubject.reviewEndDate
    ) {
      return "rgba(34,197,94,0.18)";
    }

    // 3. Most-important schedule's days
    if (mostImportantPlan) {
      if (mostImportantPlan.type === "review") {
        const d = mostImportantPlan;
        if (dateStr >= d.startDate && dateStr <= d.endDate) {
          return "rgba(234,179,8,0.18)";
        }
      } else if (mostImportantPlan.type === "study") {
        if (isStudyPlanDay(mostImportantPlan, date)) {
          return "rgba(59,130,246,0.15)";
        }
      }
    }

    return undefined;
  }

  function getCellScheduleInfo(date: Date): { label: string } | null {
    const dateStr = format(date, "yyyy-MM-dd");
    // 1. Exam item on this exact date
    for (const plan of plans) {
      if (plan.type === "exam") {
        const item = plan.items.find(i => i.date === dateStr);
        if (item) return { label: (item as any).subjectName || plan.title };
      }
    }
    // 2. Active review subject window
    if (
      activeReviewSubject?.reviewStartDate &&
      activeReviewSubject?.reviewEndDate &&
      dateStr >= activeReviewSubject.reviewStartDate &&
      dateStr <= activeReviewSubject.reviewEndDate
    ) {
      return { label: (activeReviewSubject as any).subjectName || "Review" };
    }
    // 3. Most-important non-exam plan
    if (mostImportantPlan) {
      if (mostImportantPlan.type === "review") {
        if (dateStr >= mostImportantPlan.startDate && dateStr <= mostImportantPlan.endDate)
          return { label: mostImportantPlan.title };
      } else if (mostImportantPlan.type === "study") {
        if (isStudyPlanDay(mostImportantPlan, date))
          return { label: mostImportantPlan.title };
      }
    }
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <button
          onClick={onBackToYear}
          className="inline-flex items-center gap-1.5 text-sm font-bold text-muted-foreground hover:text-foreground transition-colors bg-secondary/50 px-3 py-1.5 rounded-lg border border-border/50"
        >
          <ChevronLeft className="w-4 h-4" /> {year}
        </button>
      </div>
      <SliderSelector
        items={Array.from({ length: 12 }, (_, i) => i)}
        selected={month}
        onSelect={(m) => onChangeMonth(year, m)}
        getLabel={(m) => format(new Date(2000, m, 1), "MMMM")}
      />
      <GlassCard className="p-4 md:p-6 border-border/60">
        <div className="grid grid-cols-7 gap-1.5 text-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50 mb-3">
          {["S", "M", "T", "W", "T", "F", "S"].map((l, i) => (
            <span key={i}>{l}</span>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1.5">
          {cells.map((date, i) => {
            if (!date)
              return (
                <div
                  key={i}
                  className="aspect-square rounded-xl bg-secondary/10 border border-dashed border-border/20"
                />
              );
            const isNow  = isSameDay(date, today);
            const isAnch = isSameDay(date, anchor) && !isNow;
            const hasEnt = hasEntriesOnDate(schedule, checklist, plans, subjects, date);
            const cellBg = !isNow ? getCellBg(date) : undefined;
            const schedInfo = !isNow ? getCellScheduleInfo(date) : null;
            return (
              <button
                key={i}
                onClick={() => onSelectDay(date)}
                style={cellBg ? { backgroundColor: cellBg } : undefined}
                className={`aspect-square rounded-xl flex flex-col items-center justify-center gap-0.5 text-sm font-bold transition-all border shadow-sm ${
                  isNow
                    ? "bg-primary text-primary-foreground border-primary shadow-primary/30 scale-105 z-10"
                    : isAnch
                    ? "bg-secondary border-border text-foreground"
                    : "bg-card border-border/40 hover:bg-secondary/60 text-muted-foreground hover:text-foreground"
                }`}
              >
                <span className="leading-none">{format(date, "d")}</span>
                {schedInfo ? (
                  <span className="text-[7px] font-bold truncate w-full text-center px-0.5 leading-tight opacity-90">
                    {schedInfo.label}
                  </span>
                ) : (
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      hasEnt
                        ? isNow
                          ? "bg-primary-foreground/80"
                          : "bg-primary"
                        : "bg-transparent"
                    }`}
                  />
                )}
              </button>
            );
          })}
        </div>
      </GlassCard>
    </div>
  );
}

function YearView({
  anchor,
  schedule,
  checklist,
  onSelectMonth,
  onChangeYear,
}: {
  anchor: Date;
  schedule: ScheduleEvent[];
  checklist: ChecklistItem[];
  onSelectMonth: (y: number, m: number) => void;
  onChangeYear: (y: number) => void;
}) {
  const year  = getYear(anchor);
  const today = new Date();
  const years = Array.from(
    { length: YEAR_RANGE_END - YEAR_RANGE_START + 1 },
    (_, i) => YEAR_RANGE_START + i
  );

  return (
    <div className="space-y-4">
      <SliderSelector
        items={years}
        selected={year}
        onSelect={onChangeYear}
        getLabel={(y) => String(y)}
      />
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {Array.from({ length: 12 }, (_, m) => {
          const isNow  = year === getYear(today) && m === getMonth(today);
          const count  = countEntriesInMonth(schedule, checklist, year, m);
          return (
            <button
              key={m}
              onClick={() => onSelectMonth(year, m)}
              className={`p-5 rounded-2xl border text-left transition-all shadow-sm ${
                isNow
                  ? "bg-primary text-primary-foreground border-primary shadow-primary/20 scale-[1.02]"
                  : "bg-card border-border/50 hover:bg-secondary/60 hover:-translate-y-1"
              }`}
            >
              <span
                className={`block font-bold text-lg mb-1 ${
                  isNow ? "text-primary-foreground" : "text-foreground"
                }`}
              >
                {format(new Date(year, m, 1), "MMM")}
              </span>
              {count > 0 && (
                <span
                  className={`text-[11px] font-bold uppercase tracking-wider ${
                    isNow ? "text-primary-foreground/80" : "text-muted-foreground"
                  }`}
                >
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

// ─── Creation Forms ───────────────────────────────────────────────────────────

function QuickExamForm({
  subjects,
  onSubmit,
  onBack,
}: {
  subjects: Subject[];
  onSubmit: (plan: Omit<SchedulePlan, "id" | "createdAt">) => void;
  onBack: () => void;
}) {
  const [subjectName, setSubjectName] = useState("");
  const [subjectId, setSubjectId]     = useState("");
  const [date, setDate]               = useState("");
  const [time, setTime]               = useState("");
  const [importance, setImportance]   = useState<number>(2);

  const handleSubjectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val === "") {
      setSubjectName("");
      setSubjectId("");
    } else {
      const sub = subjects.find((s) => s.id === val);
      setSubjectName(sub?.name ?? "");
      setSubjectId(val);
    }
  };

  const handleSubmit = () => {
    if (!subjectName.trim() || !date) return;
    const finalTime = time || "09:00";
    onSubmit({
      type: "exam",
      title: subjectName.trim(),
      startDate: date,
      endDate: date,
      importance,
      items: [{ id: crypto.randomUUID(), subjectName: subjectName.trim(), subjectId: subjectId || undefined, date, time: finalTime }],
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-2">Subject</label>
        {subjects.length > 0 ? (
          <select className={inputCls} value={subjectId} onChange={handleSubjectChange}>
            <option value="">Select subject…</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>{s.emoji ? `${s.emoji} ` : ""}{s.name}</option>
            ))}
          </select>
        ) : (
          <input
            className={inputCls}
            value={subjectName}
            onChange={(e) => setSubjectName(e.target.value)}
            placeholder="e.g. Biochemistry"
          />
        )}
      </div>
      <div>
        <label className="block text-sm font-medium mb-2">Date</label>
        <input type="date" className={inputCls} value={date} onChange={(e) => setDate(e.target.value)} />
      </div>
      <div>
        <label className="block text-sm font-medium mb-2">
          Time <span className="text-muted-foreground font-normal">(optional, defaults to 09:00)</span>
        </label>
        <input type="time" className={inputCls} value={time} onChange={(e) => setTime(e.target.value)} />
      </div>
      <div>
        <label className="block text-sm font-medium mb-2">Importance</label>
        <select className={inputCls} value={importance} onChange={(e) => setImportance(Number(e.target.value))}>
          <option value={1}>1 — Most Important</option>
          <option value={2}>2</option>
          <option value={3}>3 — Least Important</option>
        </select>
      </div>
      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={onBack}
          className="flex-none px-5 py-3.5 rounded-xl border border-border/50 text-muted-foreground font-semibold hover:bg-secondary/50 transition-colors"
        >
          Back
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          className="flex-1 bg-primary text-primary-foreground font-semibold rounded-xl py-3.5 hover:opacity-90 transition-opacity"
        >
          Add Exam
        </button>
      </div>
    </div>
  );
}

function ExamScheduleForm({
  initial,
  subjects,
  onSubmit,
  onBack,
}: {
  initial?: SchedulePlan;
  subjects: Subject[];
  onSubmit: (plan: Omit<SchedulePlan, "id" | "createdAt">) => void;
  onBack: () => void;
}) {
  const [title, setTitle]         = useState(initial?.title ?? "");
  const [importance, setImportance] = useState<number>(initial?.importance ?? 2);
  const [items, setItems] = useState<SchedulePlanItem[]>(
    initial?.items.length
      ? initial.items
      : [{ id: crypto.randomUUID(), subjectName: "", date: "", time: "" }]
  );

  const addItem   = () => setItems((p) => [...p, { id: crypto.randomUUID(), subjectName: "", date: "", time: "" }]);
  const removeItem = (id: string) => setItems((p) => p.filter((i) => i.id !== id));
  const updateItem = (id: string, patch: Partial<SchedulePlanItem>) =>
    setItems((p) => p.map((i) => (i.id === id ? { ...i, ...patch } : i)));

  const handleSubjectChange = (itemId: string, val: string) => {
    if (val === "") {
      updateItem(itemId, { subjectName: "", subjectId: undefined });
    } else {
      const sub = subjects.find((s) => s.id === val);
      updateItem(itemId, { subjectName: sub?.name ?? "", subjectId: val });
    }
  };

  const handleSubmit = () => {
    const validItems = items.filter((i) => i.subjectName.trim() && i.date);
    if (!title.trim() || !validItems.length) return;
    const finalItems = validItems.map((i) => ({ ...i, time: i.time || "09:00" }));
    const dates = finalItems.map((i) => i.date!).sort();
    onSubmit({
      type: "exam",
      title: title.trim(),
      startDate: dates[0],
      endDate: dates[dates.length - 1],
      importance,
      items: finalItems,
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
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Exam {i + 1}
              </span>
              {items.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeItem(item.id)}
                  className="text-muted-foreground hover:text-destructive transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
            {subjects.length > 0 ? (
              <select
                className={inputCls}
                value={item.subjectId ?? ""}
                onChange={(e) => handleSubjectChange(item.id, e.target.value)}
              >
                <option value="">Select subject…</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>{s.emoji ? `${s.emoji} ` : ""}{s.name}</option>
                ))}
              </select>
            ) : (
              <input
                className={inputCls}
                value={item.subjectName}
                onChange={(e) => updateItem(item.id, { subjectName: e.target.value })}
                placeholder="Subject / Exam name"
              />
            )}
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
      <div>
        <label className="block text-sm font-medium mb-2">Importance</label>
        <select className={inputCls} value={importance} onChange={(e) => setImportance(Number(e.target.value))}>
          <option value={1}>1 — Most Important</option>
          <option value={2}>2</option>
          <option value={3}>3 — Least Important</option>
        </select>
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
  subjects,
  onSubmit,
  onBack,
}: {
  initial?: SchedulePlan;
  subjects: Subject[];
  onSubmit: (plan: Omit<SchedulePlan, "id" | "createdAt">) => void;
  onBack: () => void;
}) {
  const [title, setTitle]         = useState(initial?.title ?? "");
  const [startDate, setStartDate] = useState(initial?.startDate ?? "");
  const [endDate, setEndDate]     = useState(initial?.endDate ?? "");
  const [importance, setImportance] = useState<number>(initial?.importance ?? 2);
  const [items, setItems] = useState<SchedulePlanItem[]>(
    initial?.items.length
      ? initial.items
      : [
          {
            id: crypto.randomUUID(),
            subjectName: "",
            startTime: "",
            endTime: "",
            repeatPattern: "weekly",
            weekDays: [1],
          },
        ]
  );

  const addItem    = () =>
    setItems((p) => [
      ...p,
      { id: crypto.randomUUID(), subjectName: "", startTime: "", endTime: "", repeatPattern: "weekly", weekDays: [1] },
    ]);
  const removeItem  = (id: string) => setItems((p) => p.filter((i) => i.id !== id));
  const updateItem  = (id: string, patch: Partial<SchedulePlanItem>) =>
    setItems((p) => p.map((i) => (i.id === id ? { ...i, ...patch } : i)));

  const handleSubjectChange = (itemId: string, val: string) => {
    if (val === "") {
      updateItem(itemId, { subjectName: "", subjectId: undefined });
    } else {
      const sub = subjects.find((s) => s.id === val);
      updateItem(itemId, { subjectName: sub?.name ?? "", subjectId: val });
    }
  };

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
    onSubmit({ type: "study", title: title.trim(), startDate, endDate, importance, items: validItems });
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
          <button
            type="button"
            onClick={addItem}
            className="text-xs font-bold text-primary flex items-center gap-1 hover:opacity-80"
          >
            <Plus className="w-3.5 h-3.5" /> Add Subject
          </button>
        </div>
        {items.map((item, i) => (
          <GlassCard key={item.id} className="p-4 space-y-3 border-border/50">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Subject {i + 1}
              </span>
              {items.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeItem(item.id)}
                  className="text-muted-foreground hover:text-destructive transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
            {subjects.length > 0 ? (
              <select
                className={inputCls}
                value={item.subjectId ?? ""}
                onChange={(e) => handleSubjectChange(item.id, e.target.value)}
              >
                <option value="">Select subject…</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>{s.emoji ? `${s.emoji} ` : ""}{s.name}</option>
                ))}
              </select>
            ) : (
              <input
                className={inputCls}
                value={item.subjectName}
                onChange={(e) => updateItem(item.id, { subjectName: e.target.value })}
                placeholder="Subject name"
              />
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium mb-1.5 text-muted-foreground">Start time</label>
                <input
                  type="time"
                  className={inputCls}
                  value={item.startTime ?? ""}
                  onChange={(e) => updateItem(item.id, { startTime: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5 text-muted-foreground">End time</label>
                <input
                  type="time"
                  className={inputCls}
                  value={item.endTime ?? ""}
                  onChange={(e) => updateItem(item.id, { endTime: e.target.value })}
                />
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
      <div>
        <label className="block text-sm font-medium mb-2">Importance</label>
        <select className={inputCls} value={importance} onChange={(e) => setImportance(Number(e.target.value))}>
          <option value={1}>1 — Most Important</option>
          <option value={2}>2</option>
          <option value={3}>3 — Least Important</option>
        </select>
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

function ReviewScheduleForm({
  initial,
  subjects,
  onSubmit,
  onBack,
}: {
  initial?: SchedulePlan;
  subjects: Subject[];
  onSubmit: (plan: Omit<SchedulePlan, "id" | "createdAt">) => void;
  onBack: () => void;
}) {
  const [title, setTitle]         = useState(initial?.title ?? "");
  const [startDate, setStartDate] = useState(initial?.startDate ?? "");
  const [endDate, setEndDate]     = useState(initial?.endDate ?? "");
  const [importance, setImportance] = useState<number>(initial?.importance ?? 2);
  const [items, setItems] = useState<SchedulePlanItem[]>(
    initial?.items.length
      ? initial.items
      : [{ id: crypto.randomUUID(), subjectName: "", reviewStartDate: "", reviewEndDate: "" }]
  );

  const addItem = () =>
    setItems((p) => [...p, { id: crypto.randomUUID(), subjectName: "", reviewStartDate: "", reviewEndDate: "" }]);
  const removeItem = (id: string) => setItems((p) => p.filter((i) => i.id !== id));
  const updateItem = (id: string, patch: Partial<SchedulePlanItem>) =>
    setItems((p) => p.map((i) => (i.id === id ? { ...i, ...patch } : i)));

  const handleSubjectChange = (itemId: string, val: string) => {
    if (val === "") {
      updateItem(itemId, { subjectName: "", subjectId: undefined });
    } else {
      const sub = subjects.find((s) => s.id === val);
      updateItem(itemId, { subjectName: sub?.name ?? "", subjectId: val });
    }
  };

  const handleSubmit = () => {
    const validItems = items.filter((i) => i.subjectName.trim());
    if (!title.trim() || !startDate || !endDate || !validItems.length) return;
    onSubmit({ type: "review", title: title.trim(), startDate, endDate, importance, items: validItems });
  };

  return (
    <div className="space-y-5">
      <div>
        <label className="block text-sm font-medium mb-2">Schedule Title</label>
        <input
          className={inputCls}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Final Review Period"
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
          <button
            type="button"
            onClick={addItem}
            className="text-xs font-bold text-amber-600 flex items-center gap-1 hover:opacity-80"
          >
            <Plus className="w-3.5 h-3.5" /> Add Subject
          </button>
        </div>
        {items.map((item, i) => (
          <GlassCard key={item.id} className="p-4 space-y-3 border-amber-500/20 bg-amber-500/5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-600">
                Subject {i + 1}
              </span>
              {items.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeItem(item.id)}
                  className="text-muted-foreground hover:text-destructive transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
            {subjects.length > 0 ? (
              <select
                className={inputCls}
                value={item.subjectId ?? ""}
                onChange={(e) => handleSubjectChange(item.id, e.target.value)}
              >
                <option value="">Select subject…</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>{s.emoji ? `${s.emoji} ` : ""}{s.name}</option>
                ))}
              </select>
            ) : (
              <input
                className={inputCls}
                value={item.subjectName}
                onChange={(e) => updateItem(item.id, { subjectName: e.target.value })}
                placeholder="Subject name"
              />
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium mb-1.5 text-muted-foreground">Review Start</label>
                <input
                  type="date"
                  className={inputCls}
                  value={item.reviewStartDate ?? ""}
                  onChange={(e) => updateItem(item.id, { reviewStartDate: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5 text-muted-foreground">Review End</label>
                <input
                  type="date"
                  className={inputCls}
                  value={item.reviewEndDate ?? ""}
                  onChange={(e) => updateItem(item.id, { reviewEndDate: e.target.value })}
                />
              </div>
            </div>
          </GlassCard>
        ))}
      </div>
      <div>
        <label className="block text-sm font-medium mb-2">Importance</label>
        <select className={inputCls} value={importance} onChange={(e) => setImportance(Number(e.target.value))}>
          <option value={1}>1 — Most Important</option>
          <option value={2}>2</option>
          <option value={3}>3 — Least Important</option>
        </select>
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
          className="flex-1 bg-amber-500 text-white font-semibold rounded-xl py-3.5 hover:opacity-90 transition-opacity"
        >
          {initial ? "Save Changes" : "Create Review Schedule"}
        </button>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function Schedule() {
  const {
    subjects,
    schedule,
    checklist,
    schedulePlans,
    addSchedulePlan,
    updateSchedulePlan,
    deleteSchedulePlan,
    toggleChecklistItem,
    skipChecklistItem,
    deleteChecklistItem,
    setCascadeChecklistStatus,
  } = useStudyData();

  // Sheet / dialog state
  const [isCreating,     setIsCreating]     = useState(false);
  const [createType,     setCreateType]     = useState<CreateType>(null);
  const [editingPlan,    setEditingPlan]    = useState<SchedulePlan | null>(null);
  const [detailPlan,     setDetailPlan]     = useState<SchedulePlan | null>(null);
  const [deletingPlanId, setDeletingPlanId] = useState<string | null>(null);
  const [showHidden,     setShowHidden]     = useState(false);
  const [scheduleSubMenu, setScheduleSubMenu] = useState(false);

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

  // ── Derived data ────────────────────────────────────────────────────────────

  const monthStart = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
  const weekDays   = Array.from({ length: getDaysInMonth(selectedDate) }).map((_, i) => addDays(monthStart, i));

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

  const { visible: visiblePlans, hidden: hiddenPlans } = useMemo(
    () => resolveConflicts(schedulePlans),
    [schedulePlans]
  );

  // Color helper for the day-strip — mirrors MonthView's getCellBg
  const _dayARSub    = getActiveReviewSubject(schedulePlans, new Date());
  const _dayNonExam  = visiblePlans.filter(p => p.type !== "exam");
  const _dayTopPlan  = _dayNonExam.length > 0
    ? _dayNonExam.reduce((best, p) => ((p.importance ?? 2) < (best.importance ?? 2) ? p : best))
    : null;
  const getDayBg = (date: Date): string | undefined => {
    const s = format(date, "yyyy-MM-dd");
    if (schedulePlans.some(p => p.type === "exam" && p.items.some(i => i.date === s)))
      return "rgba(239,68,68,0.18)";
    if (_dayARSub?.reviewStartDate && _dayARSub?.reviewEndDate &&
        s >= _dayARSub.reviewStartDate && s <= _dayARSub.reviewEndDate)
      return "rgba(34,197,94,0.18)";
    if (_dayTopPlan) {
      if (_dayTopPlan.type === "review" && s >= _dayTopPlan.startDate && s <= _dayTopPlan.endDate)
        return "rgba(234,179,8,0.18)";
      if (_dayTopPlan.type === "study" && isStudyPlanDay(_dayTopPlan, date))
        return "rgba(59,130,246,0.15)";
    }
    return undefined;
  };

  // ── Handlers ────────────────────────────────────────────────────────────────

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

  const closeCreate = () => {
    setIsCreating(false);
    setCreateType(null);
    setScheduleSubMenu(false);
  };

  const handleEditPlan = (planId: string) => {
    const plan = schedulePlans.find((p) => p.id === planId);
    if (plan) setEditingPlan(plan);
  };

  const handleRemoveExamItem = (planId: string, itemId: string) => {
    const plan = schedulePlans.find((p) => p.id === planId);
    if (!plan) return;
    updateSchedulePlan(planId, { ...plan, items: plan.items.filter((i) => i.id !== itemId) });
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-10 pb-28 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold tracking-tight mb-2">Schedule</h1>
        <p className="text-lg text-muted-foreground font-medium">{format(new Date(), "EEEE, MMMM do")}</p>
      </div>

      {/* ── 1. NEXT EXAM (above calendar) ── */}
      <NextExamSection plans={schedulePlans} />

      {/* ── 2. CALENDAR ── */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold tracking-tight">Calendar</h2>
          <ViewToggle level={viewLevel} onChange={setViewLevel} />
        </div>

        {viewLevel === "day" && (
          <>
            {/* Week strip */}
            <div
              ref={scrollAreaRef}
              className="flex gap-2 overflow-x-auto scrollbar-hide py-2 -mx-2 px-2 snap-x snap-mandatory"
            >
              {weekDays.map((date, i) => {
                const isNow  = isSameDay(date, new Date());
                const isSel  = isSameDay(date, selectedDate);
                const hasEnt = hasEntriesOnDate(schedule, checklist, schedulePlans, subjects, date);
                const dayBg  = !isSel && !isNow ? getDayBg(date) : undefined;
                return (
                  <button
                    key={i}
                    data-today={isNow ? "true" : undefined}
                    onClick={() => setSelectedDate(date)}
                    style={dayBg ? { backgroundColor: dayBg } : undefined}
                    className={`snap-center flex-shrink-0 flex flex-col items-center justify-center w-[4.5rem] h-[5rem] rounded-2xl transition-all duration-200 border shadow-sm ${
                      isSel
                        ? "bg-primary text-primary-foreground border-primary shadow-primary/20 scale-105"
                        : "bg-card border-border/50 hover:bg-secondary/60 text-muted-foreground"
                    }`}
                  >
                    <span className="text-[10px] uppercase font-bold tracking-wider leading-none mb-1">
                      {format(date, "EEE")}
                    </span>
                    <span className="text-xl font-bold leading-none">{format(date, "d")}</span>
                    {!isSel && (isNow || hasEnt) && (
                      <div
                        className={`w-1.5 h-1.5 rounded-full mt-2 ${
                          isNow ? "bg-primary" : "bg-muted-foreground/30"
                        }`}
                      />
                    )}
                    {isSel && hasEnt && <div className="w-1.5 h-1.5 rounded-full mt-2 bg-primary-foreground/80" />}
                  </button>
                );
              })}
            </div>

            {/* Day agenda */}
            <div className="space-y-3 pt-1">
              <h3 className="text-base font-bold tracking-tight text-foreground/90 px-0.5">
                {isSameDay(selectedDate, new Date())
                  ? "Today's Agenda"
                  : format(selectedDate, "EEEE, MMMM d")}
              </h3>
              {dayEntries.length === 0 ? (
                <GlassCard className="p-8 text-center border-dashed border-2 bg-transparent text-muted-foreground shadow-none text-sm">
                  Nothing on this day
                </GlassCard>
              ) : (
                <AnimatePresence initial={false}>
                  {dayEntries.map((entry) => {
                    if (entry.kind === "event") {
                      const ev  = schedule.find((e) => e.id === entry.id);
                      if (!ev) return null;
                      const sub = subjects.find((s) => s.id === ev.subjectId);
                      return (
                        <motion.div
                          key={`ev-${entry.id}`}
                          layout
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.97 }}
                        >
                          <GlassCard className="p-4 flex gap-4 border-border/60">
                            <div className="w-14 shrink-0 text-center flex flex-col items-center justify-center border-r border-border/50 pr-3">
                              <span className="text-base font-bold leading-tight">
                                {format(new Date(ev.datetime), "HH:mm")}
                              </span>
                            </div>
                            <div
                              className="w-1.5 rounded-full shrink-0 self-stretch"
                              style={{ backgroundColor: sub?.color ?? "hsl(var(--primary))" }}
                            />
                            <div className="flex-1 py-0.5">
                              <p className="font-bold text-foreground text-sm">{ev.title}</p>
                              {sub && (
                                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mt-1">
                                  {sub.name}
                                </p>
                              )}
                              {ev.note && (
                                <p className="text-[11px] mt-2 text-muted-foreground/80 bg-secondary/50 px-2.5 py-1.5 rounded-lg border border-border/40 inline-block">
                                  {ev.note}
                                </p>
                              )}
                            </div>
                          </GlassCard>
                        </motion.div>
                      );
                    }
                    const task = checklist.find((c) => c.id === entry.id);
                    if (!task) return null;
                    return (
                      <motion.div
                        key={`task-${entry.id}`}
                        layout
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.97 }}
                      >
                        <MiniTaskCard
                          task={task}
                          onToggle={() => toggleChecklistItem(task.id)}
                          onRemove={() => removeTask(task.id)}
                          onCycle={() => cycleTask(task.id)}
                        />
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

      {/* ── 3. EXAMS ── */}
      <ExamsSection
        plans={schedulePlans}
        onEdit={handleEditPlan}
        onRemoveItem={handleRemoveExamItem}
      />

      {/* ── 4. SCHEDULES ── */}
      <SchedulesSection
        visiblePlans={visiblePlans}
        hiddenPlans={hiddenPlans}
        onEdit={setEditingPlan}
        onDelete={setDeletingPlanId}
        onDetail={setDetailPlan}
        onShowHidden={() => setShowHidden(true)}
      />

      {/* ── FAB ── */}
      <FabPortal>
        <button
          onClick={() => setIsCreating(true)}
          className="fixed bottom-24 md:bottom-10 right-6 md:right-10 w-14 h-14 bg-primary text-primary-foreground rounded-full shadow-lg shadow-primary/30 flex items-center justify-center hover:scale-105 transition-transform z-40"
        >
          <Plus className="w-6 h-6" />
        </button>
      </FabPortal>

      {/* ── Type picker ── */}
      <BottomSheet isOpen={isCreating && !createType} onClose={closeCreate} title="Add to Schedule">
        <div className="space-y-3">
          {!scheduleSubMenu ? (
            <>
              {/* Top-level: Add Exam */}
              <button
                onClick={() => setCreateType("quickExam")}
                className="w-full flex items-center gap-4 p-5 rounded-2xl bg-destructive/5 border border-destructive/20 hover:bg-destructive/10 transition-colors text-left"
              >
                <div className="w-12 h-12 rounded-2xl bg-destructive/10 flex items-center justify-center shrink-0 border border-destructive/20">
                  <GraduationCap className="w-6 h-6 text-destructive" />
                </div>
                <div>
                  <p className="font-bold text-foreground">Add Exam</p>
                  <p className="text-sm text-muted-foreground mt-0.5">Quick-add a single upcoming exam</p>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground ml-auto shrink-0" />
              </button>

              {/* Top-level: Add Schedule */}
              <button
                onClick={() => setScheduleSubMenu(true)}
                className="w-full flex items-center gap-4 p-5 rounded-2xl bg-primary/5 border border-primary/20 hover:bg-primary/10 transition-colors text-left"
              >
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20">
                  <CalendarDays className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="font-bold text-foreground">Add Schedule</p>
                  <p className="text-sm text-muted-foreground mt-0.5">Set up an exam, review, or study schedule</p>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground ml-auto shrink-0" />
              </button>
            </>
          ) : (
            <>
              {/* Back */}
              <button
                onClick={() => setScheduleSubMenu(false)}
                className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors mb-1"
              >
                <ChevronLeft className="w-4 h-4" /> Back
              </button>

              {/* Exam Schedule */}
              <button
                onClick={() => setCreateType("exam")}
                className="w-full flex items-center gap-4 p-5 rounded-2xl bg-secondary/40 border border-border/50 hover:bg-secondary/60 transition-colors text-left"
              >
                <div className="w-12 h-12 rounded-2xl bg-secondary flex items-center justify-center shrink-0 border border-border/50">
                  <CalendarDays className="w-6 h-6 text-foreground/70" />
                </div>
                <div>
                  <p className="font-bold text-foreground">Exam Schedule</p>
                  <p className="text-sm text-muted-foreground mt-0.5">Group multiple exams in one schedule</p>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground ml-auto shrink-0" />
              </button>

              {/* Review Schedule */}
              <button
                onClick={() => setCreateType("review")}
                className="w-full flex items-center gap-4 p-5 rounded-2xl bg-amber-500/5 border border-amber-500/20 hover:bg-amber-500/10 transition-colors text-left"
              >
                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center shrink-0 border border-amber-500/20">
                  <BookOpen className="w-6 h-6 text-amber-600" />
                </div>
                <div>
                  <p className="font-bold text-foreground">Review Schedule</p>
                  <p className="text-sm text-muted-foreground mt-0.5">Plan subject-by-subject review periods</p>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground ml-auto shrink-0" />
              </button>

              {/* Study Schedule */}
              <button
                onClick={() => setCreateType("study")}
                className="w-full flex items-center gap-4 p-5 rounded-2xl bg-primary/5 border border-primary/20 hover:bg-primary/10 transition-colors text-left"
              >
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20">
                  <BookMarked className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="font-bold text-foreground">Study Schedule</p>
                  <p className="text-sm text-muted-foreground mt-0.5">Recurring sessions with times &amp; days</p>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground ml-auto shrink-0" />
              </button>
            </>
          )}
        </div>
      </BottomSheet>

      {/* ── Quick Exam form ── */}
      <BottomSheet isOpen={isCreating && createType === "quickExam"} onClose={closeCreate} title="Add Exam">
        <QuickExamForm
          subjects={subjects}
          onSubmit={(plan) => { addSchedulePlan(plan); closeCreate(); }}
          onBack={() => setCreateType(null)}
        />
      </BottomSheet>

      {/* ── Exam Schedule form ── */}
      <BottomSheet isOpen={isCreating && createType === "exam"} onClose={closeCreate} title="New Exam Schedule">
        <ExamScheduleForm
          subjects={subjects}
          onSubmit={(plan) => { addSchedulePlan(plan); closeCreate(); }}
          onBack={() => setCreateType(null)}
        />
      </BottomSheet>

      {/* ── Study Schedule form ── */}
      <BottomSheet isOpen={isCreating && createType === "study"} onClose={closeCreate} title="New Study Schedule">
        <StudyScheduleForm
          subjects={subjects}
          onSubmit={(plan) => { addSchedulePlan(plan); closeCreate(); }}
          onBack={() => setCreateType(null)}
        />
      </BottomSheet>

      {/* ── Review Schedule form ── */}
      <BottomSheet isOpen={isCreating && createType === "review"} onClose={closeCreate} title="New Review Schedule">
        <ReviewScheduleForm
          subjects={subjects}
          onSubmit={(plan) => { addSchedulePlan(plan); closeCreate(); }}
          onBack={() => setCreateType(null)}
        />
      </BottomSheet>

      {/* ── Edit Exam Schedule ── */}
      <BottomSheet
        isOpen={!!editingPlan && editingPlan.type === "exam"}
        onClose={() => setEditingPlan(null)}
        title="Edit Exam Schedule"
      >
        {editingPlan?.type === "exam" && (
          <ExamScheduleForm
            initial={editingPlan}
            subjects={subjects}
            onSubmit={(plan) => { updateSchedulePlan(editingPlan.id, plan); setEditingPlan(null); }}
            onBack={() => setEditingPlan(null)}
          />
        )}
      </BottomSheet>

      {/* ── Edit Study Schedule ── */}
      <BottomSheet
        isOpen={!!editingPlan && editingPlan.type === "study"}
        onClose={() => setEditingPlan(null)}
        title="Edit Study Schedule"
      >
        {editingPlan?.type === "study" && (
          <StudyScheduleForm
            initial={editingPlan}
            subjects={subjects}
            onSubmit={(plan) => { updateSchedulePlan(editingPlan.id, plan); setEditingPlan(null); }}
            onBack={() => setEditingPlan(null)}
          />
        )}
      </BottomSheet>

      {/* ── Edit Review Schedule ── */}
      <BottomSheet
        isOpen={!!editingPlan && editingPlan.type === "review"}
        onClose={() => setEditingPlan(null)}
        title="Edit Review Schedule"
      >
        {editingPlan?.type === "review" && (
          <ReviewScheduleForm
            initial={editingPlan}
            subjects={subjects}
            onSubmit={(plan) => { updateSchedulePlan(editingPlan.id, plan); setEditingPlan(null); }}
            onBack={() => setEditingPlan(null)}
          />
        )}
      </BottomSheet>

      {/* ── Detail sheet ── */}
      <BottomSheet
        isOpen={!!detailPlan}
        onClose={() => setDetailPlan(null)}
        title={detailPlan?.title ?? "Schedule"}
      >
        {detailPlan && <SchedulePlanDetail plan={detailPlan} />}
      </BottomSheet>

      {/* ── Hidden / overlapping plans ── */}
      <BottomSheet
        isOpen={showHidden}
        onClose={() => setShowHidden(false)}
        title={`${hiddenPlans.length} Overlapping Schedule${hiddenPlans.length !== 1 ? "s" : ""}`}
      >
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            These schedules overlap with a higher-priority one and are hidden from the main list.
          </p>
          {hiddenPlans.map((plan) => (
            <SchedulePlanCard
              key={plan.id}
              plan={plan}
              onClick={() => { setDetailPlan(plan); setShowHidden(false); }}
            />
          ))}
        </div>
      </BottomSheet>

      {/* ── Delete confirm ── */}
      <ConfirmSheet
        isOpen={!!deletingPlanId}
        onClose={() => setDeletingPlanId(null)}
        onConfirm={() => {
          if (deletingPlanId) { deleteSchedulePlan(deletingPlanId); setDeletingPlanId(null); }
        }}
        title="Delete schedule?"
        message="This schedule will be permanently deleted."
        confirmLabel="Delete"
      />
    </div>
  );
}
