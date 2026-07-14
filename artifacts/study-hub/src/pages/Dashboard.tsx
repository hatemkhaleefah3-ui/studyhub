import { useStudyData } from "@/hooks/useStudyData";
import { GlassCard } from "@/components/shared/GlassCard";
import { MiniCalendar } from "@/components/dashboard/MiniCalendar";
import { format, isToday, isTomorrow, differenceInDays } from "date-fns";
import { Flame, Calendar as CalendarIcon, Settings as SettingsIcon } from "lucide-react";
import { Link } from "wouter";

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

  // Upcoming Exams — sourced from Exam Schedule plans
  const _now = new Date(); _now.setHours(0, 0, 0, 0);
  const upcomingExams = schedulePlans
    .filter(p => p.type === 'exam')
    .flatMap(p => p.items.map(item => ({ ...item, planTitle: p.title })))
    .filter(item => item.date && new Date(item.date) >= _now)
    .sort((a, b) => new Date(a.date!).getTime() - new Date(b.date!).getTime())
    .slice(0, 4);

  return (
    <div className="space-y-10 pb-12">
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

      {/* Weekly Schedule takes full width */}
      <MiniCalendar schedule={schedule} checklist={checklist} />

      {/* Split lower section: Exams & Progress */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Exams */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xl font-bold tracking-tight">Upcoming Exams</h2>
            <Link href="/subjects" className="text-sm text-primary hover:text-primary/80 transition-colors font-semibold">View all</Link>
          </div>
          
          {upcomingExams.length === 0 ? (
             <GlassCard className="p-8 text-center flex flex-col items-center justify-center text-muted-foreground border-dashed border-2 bg-transparent">
               <CalendarIcon className="w-8 h-8 mb-3 opacity-30" />
               <p className="font-medium">No upcoming exams.</p>
             </GlassCard>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-4">
              {upcomingExams.map(item => {
                const subject = subjects.find(s => s.name === item.subjectName || s.id === item.subjectId);
                const accentColor = subject?.color ?? '#007aff';
                const days = differenceInDays(new Date(item.date!), new Date());
                const isUrgent = days <= 3;
                const isCritical = days <= 1;
                return (
                  <GlassCard key={item.id} className="p-5 flex flex-col gap-3 relative overflow-hidden group border-border/60 hover:shadow-md transition-shadow">
                    <div className="absolute top-0 left-0 w-1.5 h-full" style={{ backgroundColor: accentColor }} />
                    <div className="pl-3">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: accentColor }} />
                        <p className="text-xs font-bold text-muted-foreground tracking-wide uppercase">{item.subjectName}</p>
                      </div>
                      <h3 className="font-bold text-lg leading-tight mt-1">{item.planTitle}</h3>
                      <div className="mt-4 inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-bold bg-secondary text-secondary-foreground border border-border/50 uppercase tracking-wide">
                        {isToday(new Date(item.date!)) ? "Today" : isTomorrow(new Date(item.date!)) ? "Tomorrow" : `In ${days} days`}
                        {isUrgent && <span className={`ml-2 w-1.5 h-1.5 rounded-full ${isCritical ? 'bg-destructive' : 'bg-orange-500'}`} />}
                      </div>
                    </div>
                  </GlassCard>
                );
              })}
            </div>
          )}
        </div>

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
    </div>
  );
}
