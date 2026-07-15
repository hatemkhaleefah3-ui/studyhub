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
              // ── Countdown hero card ──────────────────────────────────────────
              // Urgency palette: red (≤3 d) → amber (4–7 d) → blue (>7 d)
              const countColor =
                days <= 3 ? "#f87171" : days <= 7 ? "#fbbf24" : "#60a5fa";
              const glowColor =
                days <= 3 ? "rgba(239,68,68,0.12)" : days <= 7 ? "rgba(251,191,36,0.10)" : "rgba(96,165,250,0.10)";
              // Bar fills left → right as the exam approaches (capped at 60 days)
              const barPct = days >= 60 ? 2 : Math.round(((60 - days) / 60) * 100);

              return (
                <div
                  key={item.id}
                  className="relative rounded-3xl overflow-hidden border border-white/[0.06] shadow-xl"
                  style={{ background: "linear-gradient(145deg,#18181b 0%,#111113 100%)" }}
                >
                  {/* Radial glow blob top-right — contained by relative+overflow-hidden */}
                  <div
                    className="absolute top-0 right-0 w-56 h-56 rounded-full pointer-events-none blur-2xl"
                    style={{ background: glowColor, transform: "translate(30%,-30%)" }}
                  />

                  <div className="relative flex items-stretch gap-0 px-5 py-5">
                    {/* ── Left: badges + name + date ── */}
                    <div className="flex-1 min-w-0 flex flex-col">
                      {/* Badge row */}
                      <div className="flex items-center gap-2 flex-wrap mb-2">
                        <span
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest border"
                          style={{ color: countColor, background: countColor + "1a", borderColor: countColor + "40" }}
                        >
                          ● Next Exam
                        </span>
                        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest truncate">
                          {item.subjectName}
                        </span>
                      </div>

                      {/* Exam title */}
                      <h3 className="text-white font-bold text-lg leading-snug flex-1">
                        {item.planTitle}
                      </h3>

                      {/* Date */}
                      <p className="text-zinc-500 text-xs flex items-center gap-1.5 mt-3">
                        <CalendarIcon className="w-3 h-3 shrink-0" />
                        {format(new Date(item.date!), "EEEE, MMM d, yyyy")}
                      </p>
                    </div>

                    {/* ── Vertical divider ── */}
                    <div className="w-px bg-white/10 mx-5 self-stretch" />

                    {/* ── Right: countdown number ── */}
                    <div className="flex flex-col items-center justify-center min-w-[68px]">
                      {days === 0 ? (
                        <span className="text-sm font-black uppercase tracking-widest text-center" style={{ color: countColor }}>
                          Today!
                        </span>
                      ) : (
                        <>
                          <span
                            className="text-6xl font-black leading-none tabular-nums"
                            style={{ color: countColor }}
                          >
                            {days}
                          </span>
                          <span
                            className="text-[10px] font-black uppercase tracking-widest mt-1 text-center"
                            style={{ color: countColor + "99" }}
                          >
                            {days === 1 ? "day" : "days"}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* ── Urgency bar ── */}
                  <div className="h-[3px] bg-white/5">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${barPct}%`, background: `linear-gradient(90deg, ${countColor}66, ${countColor})` }}
                    />
                  </div>
                </div>
              );
            }

            // ── Second exam — compact companion card ────────────────────────
            const days2Color =
              days <= 3 ? "hsl(var(--destructive))" : days <= 7 ? "#f59e0b" : "hsl(var(--foreground))";
            return (
              <GlassCard
                key={item.id}
                className="p-4 flex items-center gap-4 border-l-[3px]"
                style={{ borderLeftColor: `${accentColor}80` }}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-0.5 truncate">
                    {item.subjectName}
                  </p>
                  <h3 className="font-semibold text-foreground text-sm leading-tight">{item.planTitle}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {format(new Date(item.date!), "EEE, MMM d, yyyy")}
                  </p>
                </div>
                <div className="shrink-0 flex flex-col items-center min-w-[44px]">
                  <span className="text-2xl font-black leading-none tabular-nums" style={{ color: days2Color }}>
                    {days === 0 ? "!" : String(days)}
                  </span>
                  {days > 0 && (
                    <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground mt-0.5">
                      {days === 1 ? "day" : "days"}
                    </span>
                  )}
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
          <h1 className="text-2xl md:text-4xl font-bold tracking-tight mb-1 md:mb-2">👋 Hello Fool</h1>
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
