import { useState, useRef, useEffect } from "react";
import { format, addDays, isSameDay, isToday, parseISO } from "date-fns";
import { GlassCard } from "@/components/shared/GlassCard";
import { useStudyData } from "@/hooks/useStudyData";
import { Circle, CheckCircle2, CalendarDays } from "lucide-react";
import { Link } from "wouter";

export function MiniCalendar({ schedule, checklist }: { schedule: any[], checklist: any[] }) {
  const { subjects, toggleChecklistItem } = useStudyData();
  const [selectedDate, setSelectedDate] = useState(new Date());

  const today = new Date();
  const startDate = addDays(today, -14);
  const days = Array.from({ length: 28 }).map((_, i) => addDays(startDate, i));
  
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = scrollRef.current?.querySelector('[data-today="true"]');
    if (el) {
      el.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
    }
  }, []);

  const dayEvents = schedule
    .filter(e => isSameDay(new Date(e.datetime), selectedDate))
    .sort((a, b) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime());

  const dayTasks = checklist
    .filter(c => !!c.dueDate && isSameDay(parseISO(c.dueDate), selectedDate));

  // Combine: events first (sorted by time), then tasks — cap at 3
  const allItems: Array<{ type: 'event'; data: any } | { type: 'task'; data: any }> = [
    ...dayEvents.map(ev => ({ type: 'event' as const, data: ev })),
    ...dayTasks.map(t => ({ type: 'task' as const, data: t })),
  ];
  const visibleItems = allItems.slice(0, 3);
  const hiddenCount = allItems.length - visibleItems.length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-1">
        <h2 className="text-xl font-bold tracking-tight">This Month</h2>
        <Link href="/schedule" className="text-sm text-primary hover:text-primary/80 transition-colors font-semibold inline-flex items-center gap-1.5">
          <CalendarDays className="w-4 h-4" /> Full Schedule
        </Link>
      </div>

      <GlassCard className="p-0 overflow-hidden flex flex-col border-border/60">
        {/* Day Strip */}
        <div 
          ref={scrollRef} 
          className="flex gap-2 overflow-x-auto scrollbar-hide p-4 snap-x snap-mandatory border-b border-border/40 bg-secondary/10"
        >
          {days.map((date, i) => {
            const isSelected = isSameDay(date, selectedDate);
            const isCurToday = isToday(date);
            const hasEvent = schedule.some(e => isSameDay(new Date(e.datetime), date));
            const hasTask = checklist.some(c => !!c.dueDate && isSameDay(parseISO(c.dueDate), date));
            const hasEntries = hasEvent || hasTask;

            return (
              <button
                key={i}
                data-today={isCurToday ? "true" : undefined}
                onClick={() => setSelectedDate(date)}
                className={`snap-center flex-shrink-0 flex flex-col items-center justify-center w-14 h-[4.5rem] rounded-2xl transition-all duration-200 ${
                  isSelected
                    ? "bg-primary text-primary-foreground shadow-md shadow-primary/20 scale-105"
                    : "bg-card border border-border/50 hover:bg-secondary/60 text-muted-foreground"
                }`}
              >
                <span className="text-[10px] uppercase font-bold tracking-wider leading-none mb-1.5">
                  {format(date, "EEE")}
                </span>
                <span className="text-lg font-bold leading-none">{format(date, "d")}</span>
                
                {!isSelected && (isCurToday || hasEntries) && (
                  <div className={`w-1.5 h-1.5 rounded-full mt-1.5 ${isCurToday ? "bg-primary" : "bg-muted-foreground/30"}`} />
                )}
                {isSelected && hasEntries && (
                  <div className="w-1.5 h-1.5 rounded-full mt-1.5 bg-primary-foreground/80" />
                )}
              </button>
            );
          })}
        </div>
        
        {/* Selected Day Content */}
        <div className="p-5 md:p-6 bg-card/40 flex flex-col gap-4 min-h-[160px]">
          <h3 className="font-semibold text-foreground/90">
            {isToday(selectedDate) ? "Today's Agenda" : format(selectedDate, "EEEE, MMMM d")}
          </h3>

          {allItems.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground py-6 border-2 border-dashed border-border/40 rounded-xl">
              No tasks or events.
            </div>
          ) : (
            <div className="space-y-3">
              {visibleItems.map((item, idx) => {
                if (item.type === 'event') {
                  const ev = item.data;
                  const subject = subjects.find(s => s.id === ev.subjectId);
                  return (
                    <div key={`ev-${ev.id}-${idx}`} className="flex items-center gap-4 bg-background border border-border/50 rounded-xl p-3 shadow-sm">
                      <div className="w-12 text-center shrink-0">
                        <p className="text-xs font-bold text-muted-foreground">{format(new Date(ev.datetime), "HH:mm")}</p>
                      </div>
                      <div className="w-1 h-8 rounded-full shrink-0" style={{ backgroundColor: subject?.color || 'var(--primary)' }} />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm truncate">{ev.title}</p>
                        <p className="text-xs text-muted-foreground truncate">{subject?.name}</p>
                      </div>
                    </div>
                  );
                }
                const task = item.data;
                return (
                  <button
                    key={`task-${task.id}-${idx}`}
                    onClick={() => toggleChecklistItem(task.id)}
                    className={`w-full flex items-center gap-3 bg-background border border-border/50 rounded-xl p-3 shadow-sm transition-colors text-left group ${task.done ? 'opacity-50 bg-secondary/30' : 'hover:bg-secondary/40'}`}
                  >
                    <div className="w-12 shrink-0 flex justify-center">
                      {task.done ? (
                        <CheckCircle2 className="w-5 h-5 text-primary" />
                      ) : (
                        <Circle className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                      )}
                    </div>
                    <span className={`flex-1 text-sm font-medium ${task.done ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                      {task.text}
                    </span>
                  </button>
                );
              })}
              {hiddenCount > 0 && (
                <p className="text-xs text-muted-foreground text-center py-2">+{hiddenCount} more</p>
              )}
            </div>
          )}
        </div>
      </GlassCard>
    </div>
  );
}
