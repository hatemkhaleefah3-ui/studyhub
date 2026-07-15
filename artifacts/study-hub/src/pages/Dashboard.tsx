import { useStudyData } from "@/hooks/useStudyData";
import { type SchedulePlan } from "@/hooks/useStudyData";
import { GlassCard } from "@/components/shared/GlassCard";
import { MiniCalendar } from "@/components/dashboard/MiniCalendar";
import { format, differenceInDays } from "date-fns";
import { Flame, Calendar as CalendarIcon, Settings as SettingsIcon } from "lucide-react";
import { Link } from "wouter";

// ─── Next Exams Section ───────────────────────────────────────────────────────

function NextExamsSection({ plans, subjects }: { plans: SchedulePlan[]; subjects: any[] }) {
  const now = new Date(); now.setHours(0, 0, 0, 0);

  const upcomingExams = plans
    .filter((p) => p.type === "exam")
    .flatMap((p) => p.items.map((item) => ({ ...item, planTitle: p.title })))
    .filter((item) => item.date && new Date(item.date) >= now && !item.checked)
    .sort((a, b) => new Date(a.date!).getTime() - new Date(b.date!).getTime())
    .slice(0, 2);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-1">
        <h2 className="text-xl font-bold tracking-tight">Next Exams</h2>
        <Link href="/schedule" className="text-sm text-primary hover:text-primary/80 transition-colors font-semibold">
          View all
        </Link>
      </div>

      {upcomingExams.length === 0 ? (
        <GlassCard className="p-8 text-center flex flex-col items-center justify-center text-muted-foreground border-dashed border-2 bg-transparent">
          <CalendarIcon className="w-8 h-8 mb-3 opacity-30" />
          <p className="font-medium">No upcoming exams.</p>
        </GlassCard>
      ) : (
        <div className="space-y-3">
          {upcomingExams.map((item, idx) => {
            const subject = subjects.find((s: any) => s.name === item.subjectName || s.id === item.subjectId);
            const accentColor = subject?.color ?? "hsl(var(--destructive))";
            const days = differenceInDays(new Date(item.date!), new Date());
            const isFirst = idx === 0;

            if (isFirst) {
              // Featured card — red left border accent, "NEXT" badge, larger name
              return (
                <GlassCard key={item.id} className="p-5 relative overflow-hidden border-l-4 border-destructive/70">
                  <div className="absolute inset-0 opacity-[0.02] bg-destructive pointer-events-none" />
                  <div className="relative z-10 flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-destructive/10 text-destructive border border-destructive/20 uppercase tracking-wider">
                          NEXT
                        </span>
                        <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider truncate">
                          {item.subjectName}
                        </span>
                      </div>
                      <h3 className="font-bold text-foreground text-base leading-tight">{item.planTitle}</h3>
                      <p className="text-xs text-muted-foreground mt-1">
                        {format(new Date(item.date!), "EEEE, MMM d, yyyy")}
                      </p>
                    </div>
                    <div className="shrink-0 text-center min-w-[56px]">
                      <p
                        className="text-2xl font-black leading-none"
                        style={{ color: days <= 3 ? "hsl(var(--destructive))" : "hsl(var(--primary))" }}
                      >
                        {days === 0 ? "Today" : days === 1 ? "1" : String(days)}
                      </p>
                      {days > 1 && (
                        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mt-0.5">
                          days
                        </p>
                      )}
                    </div>
                  </div>
                </GlassCard>
              );
            }

            // Second card — standard styling
            return (
              <GlassCard key={item.id} className="p-5 relative overflow-hidden border-l-4" style={{ borderLeftColor: `${accentColor}60` }}>
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1 truncate">
                      {item.subjectName}
                    </p>
                    <h3 className="font-bold text-foreground text-sm leading-tight">{item.planTitle}</h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      {format(new Date(item.date!), "EEE, MMM d, yyyy")}
                    </p>
                  </div>
                  <div className="shrink-0 text-center min-w-[48px]">
                    <p className="text-lg font-black text-foreground leading-none">
                      {days === 0 ? "Today" : String(days)}
                    </p>
                    {days > 0 && (
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        days
                      </p>
                    )}
                  </div>
                </div>
              </GlassCard>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export function Dashboard() {
  const { subjects, schedule, checklist, schedulePlans } = useStudyData();

  // Streak logic
  const doneItems = checklist.filter(item => item.done && item.doneAt);
  doneItems.sort((a, b) => new Date(b.doneAt!).getTime() - new Date(a.doneAt!).getTime());

  let currentStreak = 0;

  const hasCompletedOnDate = (d: Date) => {
    return doneItems.some(item => {
      const itemDate = new Date(item.doneAt!);
      return itemDate.toDateString() === d.toDateString();
    });
  };

  if (hasCompletedOnDate(new Date())) {
    currentStreak++;
    let d = new Date();
    d.setDate(d.getDate() - 1);
    while (hasCompletedOnDate(d)) {
      currentStreak++;
      d.setDate(d.getDate() - 1);
    }
  } else {
    let d = new Date();
    d.setDate(d.getDate() - 1);
    if (hasCompletedOnDate(d)) {
      currentStreak++;
      d.setDate(d.getDate() - 1);
      while (hasCompletedOnDate(d)) {
        currentStreak++;
        d.setDate(d.getDate() - 1);
      }
    }
  }

  return (
    <div className="space-y-10 pb-12">
      {/* Greeting header */}
      <div className="flex flex-row items-center md:items-end justify-between gap-3 md:gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl md:text-4xl font-bold tracking-tight mb-1 md:mb-2">👋 Hello failed student 🤣</h1>
          <p className="text-muted-foreground font-medium text-sm md:text-lg truncate">{format(new Date(), "EEEE, MMMM do")}</p>
        </div>

        <div className="flex items-center gap-2 md:gap-4 shrink-0">
          <GlassCard className="flex items-center px-3 py-2 md:px-5 md:py-3.5 gap-2 md:gap-4 w-max border-border/50">
            <div className="w-9 h-9 md:w-11 md:h-11 rounded-xl bg-orange-500/10 flex items-center justify-center shrink-0 border border-orange-500/20 shadow-sm">
              <Flame className="w-4 h-4 md:w-5 md:h-5 text-orange-500" />
            </div>
            <div>
              <p className="text-xl md:text-2xl font-bold leading-none">{currentStreak}</p>
              <p className="text-[10px] md:text-xs text-muted-foreground uppercase tracking-wider font-bold whitespace-nowrap mt-0.5">Day Streak</p>
            </div>
          </GlassCard>

          <Link
            href="/settings"
            className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-secondary/80 hover:bg-secondary border border-border/50 shadow-sm flex items-center justify-center transition-colors shrink-0"
            title="Settings"
            data-testid="link-dashboard-settings"
          >
            <SettingsIcon className="w-4 h-4 md:w-5 md:h-5 text-muted-foreground" />
          </Link>
        </div>
      </div>

      {/* Next Exams — 2 cards */}
      <NextExamsSection plans={schedulePlans} subjects={subjects} />

      {/* Mini Calendar (below exams) */}
      <MiniCalendar schedule={schedule} checklist={checklist} />

      {/* Progress rings */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-xl font-bold tracking-tight">Progress</h2>
        </div>

        {subjects.length === 0 ? (
          <GlassCard className="p-8 text-center text-muted-foreground border-dashed border-2 bg-transparent">
            <p className="font-medium">Add subjects to see progress.</p>
          </GlassCard>
        ) : (
          <GlassCard className="p-6 border-border/60">
            <div className="flex flex-wrap gap-6 justify-center">
              {subjects.map(subject => {
                const gradedExams = subject.exams.filter(e => e.grade);
                let avg = 0;
                if (gradedExams.length > 0) {
                  const total = gradedExams.reduce((acc, curr) => acc + (parseFloat(curr.grade!) || 0), 0);
                  avg = total / gradedExams.length;
                }
                const circumference = 2 * Math.PI * 30;
                const offset = circumference - (avg / 100) * circumference;

                return (
                  <div key={subject.id} className="flex flex-col items-center gap-3 shrink-0">
                    <div className="relative w-[72px] h-[72px] flex items-center justify-center">
                      <svg className="w-full h-full transform -rotate-90">
                        <circle cx="36" cy="36" r="30" stroke="currentColor" strokeWidth="5" fill="transparent" className="text-secondary" />
                        <circle
                          cx="36" cy="36" r="30"
                          stroke={subject.color}
                          strokeWidth="5"
                          strokeLinecap="round"
                          fill="transparent"
                          strokeDasharray={circumference}
                          strokeDashoffset={offset}
                          className="transition-all duration-1000 ease-out drop-shadow-sm"
                        />
                      </svg>
                      <span className="absolute font-bold text-sm">{Math.round(avg)}%</span>
                    </div>
                    <p className="text-[11px] font-bold text-center w-20 truncate text-muted-foreground uppercase tracking-wider">{subject.name}</p>
                  </div>
                );
              })}
            </div>
          </GlassCard>
        )}
      </div>
    </div>
  );
}
