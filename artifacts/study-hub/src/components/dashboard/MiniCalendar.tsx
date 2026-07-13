import { Link } from "wouter";
import { GlassCard } from "@/components/shared/GlassCard";
import { CalendarDays } from "lucide-react";
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  addDays, isSameMonth, isSameDay, isToday, format, parseISO,
} from "date-fns";
import { type ScheduleEvent, type ChecklistItem } from "@/hooks/useStudyData";

const WEEKDAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

/**
 * Small month-grid preview of the current month, with a dot on any day that
 * has a schedule event or a due task. This is the only calendar entry point
 * on the main nav — the full Day/Month/Year calendar lives on /schedule.
 */
export function MiniCalendar({
  schedule,
  checklist,
}: {
  schedule: ScheduleEvent[];
  checklist: ChecklistItem[];
}) {
  const today = new Date();
  const monthStart = startOfMonth(today);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const gridEnd = endOfWeek(endOfMonth(today), { weekStartsOn: 0 });

  const days: Date[] = [];
  for (let d = gridStart; d <= gridEnd; d = addDays(d, 1)) days.push(d);

  const dayHasEntries = (date: Date) => {
    const hasEvent = schedule.some(e => isSameDay(new Date(e.datetime), date));
    const hasTask = checklist.some(c => !!c.dueDate && isSameDay(parseISO(c.dueDate), date));
    return hasEvent || hasTask;
  };

  return (
    <GlassCard className="p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold leading-none">{format(today, "MMMM yyyy")}</h2>
        </div>
        <Link
          href="/schedule"
          data-testid="link-open-calendar"
          className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
        >
          <CalendarDays className="w-3.5 h-3.5" />
          Open Calendar
        </Link>
      </div>

      <div className="grid grid-cols-7 gap-y-1 text-center">
        {WEEKDAY_LABELS.map((label, i) => (
          <span key={i} className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
            {label}
          </span>
        ))}

        {days.map((date, i) => {
          const inMonth = isSameMonth(date, today);
          const isCurrent = isToday(date);
          const hasEntries = dayHasEntries(date);

          return (
            <div key={i} className="flex flex-col items-center justify-center py-1">
              <span
                className={`w-7 h-7 flex items-center justify-center rounded-full text-xs font-medium transition-colors ${
                  isCurrent
                    ? "bg-primary text-primary-foreground font-bold"
                    : inMonth
                    ? "text-foreground"
                    : "text-muted-foreground/30"
                }`}
              >
                {format(date, "d")}
              </span>
              <div className={`w-1 h-1 rounded-full mt-0.5 ${hasEntries && inMonth ? "bg-primary" : "bg-transparent"}`} />
            </div>
          );
        })}
      </div>
    </GlassCard>
  );
}
