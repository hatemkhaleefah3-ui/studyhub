import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import { addDays, format, isSameDay, isToday, parseISO } from "date-fns";
import { GlassCard } from "@/components/shared/GlassCard";
import { SwipeableRow, type SwipeAction } from "@/components/shared/SwipeableRow";
import { useStudyData, type ChecklistItem, type SchedulePlan, type SchedulePlanItem } from "@/hooks/useStudyData";
import { CalendarDays, CheckCircle2, Circle, Trash2, XCircle } from "lucide-react";

const CHECK_ACTION: SwipeAction = {
  icon: <CheckCircle2 className="h-5 w-5" />,
  label: "Check",
  bg: "bg-emerald-500/15",
  color: "text-emerald-500",
};

const SKIP_ACTION: SwipeAction = {
  icon: <XCircle className="h-5 w-5" />,
  label: "Skip",
  bg: "bg-amber-500/15",
  color: "text-amber-500",
};

const REMOVE_DONE_ACTION: SwipeAction = {
  icon: <Trash2 className="h-5 w-5" />,
  label: "Remove done",
  bg: "bg-emerald-500/15",
  color: "text-emerald-500",
};

const REMOVE_SKIPPED_ACTION: SwipeAction = {
  icon: <Trash2 className="h-5 w-5" />,
  label: "Remove skipped",
  bg: "bg-amber-500/15",
  color: "text-amber-500",
};

function isStudyPlanDay(plan: SchedulePlan, date: Date): boolean {
  if (plan.type !== "study") return false;
  const value = format(date, "yyyy-MM-dd");
  if (value < plan.startDate || value > plan.endDate) return false;
  return plan.items.some((item) => {
    if (!item.repeatPattern || item.repeatPattern === "daily") return true;
    if (item.repeatPattern === "weekly") return (item.weekDays ?? []).includes(date.getDay());
    return false;
  });
}

function activeReviewSubject(plans: SchedulePlan[], now: Date): SchedulePlanItem | null {
  const today = format(now, "yyyy-MM-dd");
  const items = plans
    .filter((plan) => plan.type === "review" && plan.startDate <= today && plan.endDate >= today)
    .flatMap((plan) => plan.items);
  return items.find((item) => item.reviewStartDate && item.reviewEndDate && item.reviewStartDate <= today && item.reviewEndDate >= today) ?? null;
}

export function MiniCalendar({ schedule, checklist }: { schedule: any[]; checklist: ChecklistItem[] }) {
  const { subjects, schedulePlans, setCascadeChecklistStatus, deleteChecklistItem } = useStudyData();
  const [, navigate] = useLocation();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const today = new Date();
  const startDate = addDays(today, -14);
  const days = Array.from({ length: 28 }).map((_, index) => addDays(startDate, index));
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = scrollRef.current?.querySelector('[data-today="true"]');
    element?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, []);

  const review = activeReviewSubject(schedulePlans, new Date());
  const topPlan = schedulePlans
    .filter((plan) => plan.type !== "exam")
    .sort((a, b) => (a.importance ?? 2) - (b.importance ?? 2))[0];

  const dayColor = (date: Date): string | undefined => {
    const value = format(date, "yyyy-MM-dd");
    if (schedulePlans.some((plan) => plan.type === "exam" && plan.items.some((item) => item.date === value))) return "rgba(239,68,68,0.18)";
    if (review?.reviewStartDate && review.reviewEndDate && value >= review.reviewStartDate && value <= review.reviewEndDate) return "rgba(34,197,94,0.18)";
    if (topPlan?.type === "review" && value >= topPlan.startDate && value <= topPlan.endDate) return "rgba(234,179,8,0.18)";
    if (topPlan?.type === "study" && isStudyPlanDay(topPlan, date)) return "rgba(59,130,246,0.15)";
    return undefined;
  };

  const checkOrRemove = (task: ChecklistItem) => {
    if (task.done) deleteChecklistItem(task.id);
    else setCascadeChecklistStatus(task.id, true, false);
  };

  const skipOrRemove = (task: ChecklistItem) => {
    if (task.didNotDo) deleteChecklistItem(task.id);
    else setCascadeChecklistStatus(task.id, false, true);
  };

  const dayEvents = schedule
    .filter((event) => isSameDay(new Date(event.datetime), selectedDate))
    .sort((a, b) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime());
  const dayTasks = checklist.filter((item) => !!item.dueDate && isSameDay(parseISO(item.dueDate), selectedDate));
  const allItems: Array<{ type: "event"; data: any } | { type: "task"; data: ChecklistItem }> = [
    ...dayEvents.map((data) => ({ type: "event" as const, data })),
    ...dayTasks.map((data) => ({ type: "task" as const, data })),
  ];
  const visibleItems = allItems.slice(0, 3);
  const hiddenCount = allItems.length - visibleItems.length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-1">
        <h2 className="text-xl font-bold tracking-tight">This Month</h2>
        <Link href="/schedule" className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary transition-colors hover:text-primary/80">
          <CalendarDays className="h-4 w-4" /> Full Schedule
        </Link>
      </div>

      <GlassCard className="flex flex-col overflow-hidden border-border/60 p-0">
        <div ref={scrollRef} className="flex snap-x snap-mandatory gap-2 overflow-x-auto border-b border-border/40 bg-secondary/10 p-4 scrollbar-hide">
          {days.map((date, index) => {
            const selected = isSameDay(date, selectedDate);
            const current = isToday(date);
            const hasEvent = schedule.some((event) => isSameDay(new Date(event.datetime), date));
            const hasTask = checklist.some((item) => !!item.dueDate && isSameDay(parseISO(item.dueDate), date));
            const color = !selected && !current ? dayColor(date) : undefined;
            return (
              <button
                key={index}
                data-today={current ? "true" : undefined}
                onClick={() => setSelectedDate(date)}
                style={color ? { backgroundColor: color } : undefined}
                className={`flex h-[4.5rem] w-14 flex-shrink-0 snap-center flex-col items-center justify-center rounded-2xl border transition-all duration-200 ${
                  selected
                    ? "scale-105 border-primary bg-primary text-primary-foreground shadow-md shadow-primary/20"
                    : "border-border/50 bg-card text-muted-foreground hover:bg-secondary/60"
                }`}
              >
                <span className="mb-1.5 text-[10px] font-bold uppercase leading-none tracking-wider">{format(date, "EEE")}</span>
                <span className="text-lg font-bold leading-none">{format(date, "d")}</span>
                {!selected && (current || hasEvent || hasTask) && <div className={`mt-1.5 h-1.5 w-1.5 rounded-full ${current ? "bg-primary" : "bg-muted-foreground/40"}`} />}
                {selected && (hasEvent || hasTask) && <div className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary-foreground/80" />}
              </button>
            );
          })}
        </div>

        <div className="flex min-h-[160px] flex-col gap-4 bg-card/40 p-5 md:p-6">
          <h3 className="font-semibold text-foreground/90">{isToday(selectedDate) ? "Today's Agenda" : format(selectedDate, "EEEE, MMMM d")}</h3>
          {allItems.length === 0 ? (
            <div className="flex flex-1 items-center justify-center rounded-xl border-2 border-dashed border-border/40 py-6 text-sm text-muted-foreground">No tasks or events.</div>
          ) : (
            <div className="space-y-3">
              {visibleItems.map((item, index) => {
                if (item.type === "event") {
                  const event = item.data;
                  const subject = subjects.find((entry) => entry.id === event.subjectId);
                  return (
                    <div key={`event-${event.id}-${index}`} className="flex items-center gap-4 rounded-xl border border-border/50 bg-background p-3 shadow-sm">
                      <div className="w-12 shrink-0 text-center"><p className="text-xs font-bold text-muted-foreground">{format(new Date(event.datetime), "HH:mm")}</p></div>
                      <div className="h-8 w-1 shrink-0 rounded-full" style={{ backgroundColor: subject?.color || "hsl(var(--primary))" }} />
                      <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{event.title}</p><p className="truncate text-xs text-muted-foreground">{subject?.name}</p></div>
                    </div>
                  );
                }

                const task = item.data;
                return (
                  <SwipeableRow
                    key={`task-${task.id}-${index}`}
                    onEdit={() => checkOrRemove(task)}
                    onDelete={() => skipOrRemove(task)}
                    editAction={task.done ? REMOVE_DONE_ACTION : CHECK_ACTION}
                    deleteAction={task.didNotDo ? REMOVE_SKIPPED_ACTION : SKIP_ACTION}
                  >
                    <button
                      onClick={() => navigate(`/checklist?edit=${encodeURIComponent(task.id)}`)}
                      className={`group flex w-full items-center gap-3 rounded-xl border border-border/50 bg-background p-3 text-left shadow-sm transition-all ${task.done || task.didNotDo ? "opacity-55" : "hover:bg-secondary/40"}`}
                    >
                      <div className="flex w-12 shrink-0 justify-center">
                        {task.done ? <CheckCircle2 className="h-5 w-5 text-emerald-500" /> : task.didNotDo ? <XCircle className="h-5 w-5 text-amber-500" /> : <Circle className="h-5 w-5 text-muted-foreground transition-colors group-hover:text-primary" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className={`block break-words text-sm font-bold ${task.done || task.didNotDo ? "text-muted-foreground line-through" : "text-foreground"}`}>{task.text}</span>
                        <span className="mt-0.5 block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{task.done ? "Completed · swipe again to remove" : task.didNotDo ? "Skipped · swipe again to remove" : "Swipe left to check · right to skip"}</span>
                      </div>
                    </button>
                  </SwipeableRow>
                );
              })}
              {hiddenCount > 0 && <p className="py-2 text-center text-xs text-muted-foreground">+{hiddenCount} more</p>}
            </div>
          )}
        </div>
      </GlassCard>
    </div>
  );
}
