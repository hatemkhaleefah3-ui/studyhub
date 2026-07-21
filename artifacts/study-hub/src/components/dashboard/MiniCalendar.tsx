import { useState, useRef, useEffect } from "react";
import { format, addDays, isSameDay, isToday, parseISO } from "date-fns";
import { GlassCard } from "@/components/shared/GlassCard";
import { useStudyData, type SchedulePlan, type SchedulePlanItem } from "@/hooks/useStudyData";
import { Circle, CheckCircle2, CalendarDays } from "lucide-react";
import { Link } from "wouter";

function isStudyPlanDay(plan: SchedulePlan, date: Date): boolean {
  if (plan.type !== "study") return false;
  const value = format(date, "yyyy-MM-dd");
  if (value < plan.startDate || value > plan.endDate) return false;
  return plan.items.some(item => {
    if (!item.repeatPattern || item.repeatPattern === "daily") return true;
    if (item.repeatPattern === "weekly") return (item.weekDays ?? []).includes(date.getDay());
    return false;
  });
}

function activeReviewSubject(plans: SchedulePlan[], now: Date): SchedulePlanItem | null {
  const today = format(now, "yyyy-MM-dd");
  const items = plans.filter(plan => plan.type === "review" && plan.startDate <= today && plan.endDate >= today).flatMap(plan => plan.items);
  return items.find(item => item.reviewStartDate && item.reviewEndDate && item.reviewStartDate <= today && item.reviewEndDate >= today) ?? null;
}

export function MiniCalendar({ schedule, checklist }: { schedule: any[], checklist: any[] }) {
  const { subjects, schedulePlans, toggleChecklistItem } = useStudyData();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const today = new Date();
  const startDate = addDays(today, -14);
  const days = Array.from({ length: 28 }).map((_, i) => addDays(startDate, i));
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current?.querySelector('[data-today="true"]');
    el?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, []);

  const review = activeReviewSubject(schedulePlans, new Date());
  const topPlan = schedulePlans.filter(plan => plan.type !== "exam").sort((a, b) => (a.importance ?? 2) - (b.importance ?? 2))[0];
  const dayColor = (date: Date): string | undefined => {
    const value = format(date, "yyyy-MM-dd");
    if (schedulePlans.some(plan => plan.type === "exam" && plan.items.some(item => item.date === value))) return "rgba(239,68,68,0.18)";
    if (review?.reviewStartDate && review.reviewEndDate && value >= review.reviewStartDate && value <= review.reviewEndDate) return "rgba(34,197,94,0.18)";
    if (topPlan?.type === "review" && value >= topPlan.startDate && value <= topPlan.endDate) return "rgba(234,179,8,0.18)";
    if (topPlan?.type === "study" && isStudyPlanDay(topPlan, date)) return "rgba(59,130,246,0.15)";
    return undefined;
  };

  const dayEvents = schedule.filter(event => isSameDay(new Date(event.datetime), selectedDate)).sort((a, b) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime());
  const dayTasks = checklist.filter(item => !!item.dueDate && isSameDay(parseISO(item.dueDate), selectedDate));
  const allItems: Array<{ type: "event"; data: any } | { type: "task"; data: any }> = [
    ...dayEvents.map(data => ({ type: "event" as const, data })),
    ...dayTasks.map(data => ({ type: "task" as const, data })),
  ];
  const visibleItems = allItems.slice(0, 3), hiddenCount = allItems.length - visibleItems.length;

  return <div className="space-y-4">
    <div className="flex items-center justify-between px-1"><h2 className="text-xl font-bold tracking-tight">This Month</h2><Link href="/schedule" className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary transition-colors hover:text-primary/80"><CalendarDays className="h-4 w-4" />Full Schedule</Link></div>
    <GlassCard className="flex flex-col overflow-hidden border-border/60 p-0">
      <div ref={scrollRef} className="flex snap-x snap-mandatory gap-2 overflow-x-auto border-b border-border/40 bg-secondary/10 p-4 scrollbar-hide">
        {days.map((date, index) => { const selected = isSameDay(date, selectedDate), current = isToday(date), hasEvent = schedule.some(event => isSameDay(new Date(event.datetime), date)), hasTask = checklist.some(item => !!item.dueDate && isSameDay(parseISO(item.dueDate), date)), color = !selected && !current ? dayColor(date) : undefined; return <button key={index} data-today={current ? "true" : undefined} onClick={() => setSelectedDate(date)} style={color ? { backgroundColor: color } : undefined} className={`flex h-[4.5rem] w-14 flex-shrink-0 snap-center flex-col items-center justify-center rounded-2xl border transition-all duration-200 ${selected ? "scale-105 border-primary bg-primary text-primary-foreground shadow-md shadow-primary/20" : "border-border/50 bg-card text-muted-foreground hover:bg-secondary/60"}`}><span className="mb-1.5 text-[10px] font-bold uppercase leading-none tracking-wider">{format(date, "EEE")}</span><span className="text-lg font-bold leading-none">{format(date, "d")}</span>{!selected && (current || hasEvent || hasTask) && <div className={`mt-1.5 h-1.5 w-1.5 rounded-full ${current ? "bg-primary" : "bg-muted-foreground/40"}`} />}{selected && (hasEvent || hasTask) && <div className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary-foreground/80" />}</button>; })}
      </div>
      <div className="flex min-h-[160px] flex-col gap-4 bg-card/40 p-5 md:p-6"><h3 className="font-semibold text-foreground/90">{isToday(selectedDate) ? "Today's Agenda" : format(selectedDate, "EEEE, MMMM d")}</h3>{allItems.length === 0 ? <div className="flex flex-1 items-center justify-center rounded-xl border-2 border-dashed border-border/40 py-6 text-sm text-muted-foreground">No tasks or events.</div> : <div className="space-y-3">{visibleItems.map((item, index) => item.type === "event" ? (() => { const event = item.data, subject = subjects.find(subject => subject.id === event.subjectId); return <div key={`event-${event.id}-${index}`} className="flex items-center gap-4 rounded-xl border border-border/50 bg-background p-3 shadow-sm"><div className="w-12 shrink-0 text-center"><p className="text-xs font-bold text-muted-foreground">{format(new Date(event.datetime), "HH:mm")}</p></div><div className="h-8 w-1 shrink-0 rounded-full" style={{ backgroundColor: subject?.color || "hsl(var(--primary))" }} /><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{event.title}</p><p className="truncate text-xs text-muted-foreground">{subject?.name}</p></div></div>; })() : <button key={`task-${item.data.id}-${index}`} onClick={() => toggleChecklistItem(item.data.id)} className={`group flex w-full items-center gap-3 rounded-xl border border-border/50 bg-background p-3 text-left shadow-sm transition-colors ${item.data.done ? "bg-secondary/30 opacity-50" : "hover:bg-secondary/40"}`}><div className="flex w-12 shrink-0 justify-center">{item.data.done ? <CheckCircle2 className="h-5 w-5 text-primary" /> : <Circle className="h-5 w-5 text-muted-foreground transition-colors group-hover:text-primary" />}</div><span className={`flex-1 text-sm font-medium ${item.data.done ? "text-muted-foreground line-through" : "text-foreground"}`}>{item.data.text}</span></button>)}{hiddenCount > 0 && <p className="py-2 text-center text-xs text-muted-foreground">+{hiddenCount} more</p>}</div>}</div>
    </GlassCard>
  </div>;
}
