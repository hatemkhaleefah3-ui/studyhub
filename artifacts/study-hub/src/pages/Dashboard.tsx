import { useStudyData } from "@/hooks/useStudyData";
import { GlassCard } from "@/components/shared/GlassCard";
import { format, isToday, isTomorrow, parseISO, differenceInDays } from "date-fns";
import { Flame, Calendar as CalendarIcon, CheckCircle2, Circle, Settings as SettingsIcon } from "lucide-react";
import { Link } from "wouter";

export function Dashboard() {
  const { subjects, schedule, checklist } = useStudyData();

  // Streak logic
  const doneItems = checklist.filter(item => item.done && item.doneAt);
  doneItems.sort((a, b) => new Date(b.doneAt!).getTime() - new Date(a.doneAt!).getTime());
  
  let currentStreak = 0;
  let checkDate = new Date();
  
  // A simple daily streak check. We see if there's an item completed today.
  // Then we go backwards day by day.
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
    // Check if yesterday is the last done to maintain streak conceptually?
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

  // Upcoming Exams
  const allExams = subjects.flatMap(s => s.exams.map(e => ({ ...e, subject: s })));
  const upcomingExams = allExams
    .filter(e => e.date && new Date(e.date) >= new Date(new Date().setHours(0,0,0,0)))
    .sort((a, b) => new Date(a.date!).getTime() - new Date(b.date!).getTime())
    .slice(0, 3);

  // Today's schedule
  const todaySchedule = schedule
    .filter(ev => isToday(new Date(ev.datetime)))
    .sort((a, b) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime());

  // Today's tasks (undone)
  const todaysTasks = checklist.filter(t => !t.done).slice(0, 5);

  const { toggleChecklistItem } = useStudyData();

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-row items-center md:items-end justify-between gap-3 md:gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl md:text-4xl font-bold tracking-tight mb-1 md:mb-2">Hello! 👋 Ready to study?</h1>
          <p className="text-muted-foreground text-sm md:text-lg truncate">{format(new Date(), "EEEE, MMMM do")}</p>
        </div>

        <div className="flex items-center gap-2 md:gap-4 shrink-0">
          <GlassCard className="flex items-center px-3 py-2 md:px-6 md:py-4 gap-2 md:gap-4 w-max">
            <div className="w-9 h-9 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-orange-500/10 flex items-center justify-center shrink-0">
              <Flame className="w-4 h-4 md:w-6 md:h-6 text-orange-500" />
            </div>
            <div>
              <p className="text-xl md:text-3xl font-bold leading-none">{currentStreak}</p>
              <p className="text-[10px] md:text-sm text-muted-foreground uppercase tracking-wider font-semibold whitespace-nowrap">Day Streak</p>
            </div>
          </GlassCard>

          <Link
            href="/settings"
            className="w-9 h-9 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-secondary/60 hover:bg-secondary flex items-center justify-center transition-colors shrink-0"
            title="Settings"
            data-testid="link-dashboard-settings"
          >
            <SettingsIcon className="w-4 h-4 md:w-5 md:h-5 text-muted-foreground" />
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        
        {/* Exams */}
        <div className="col-span-1 lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Upcoming Exams</h2>
            <Link href="/subjects" className="text-sm text-primary hover:underline">View all</Link>
          </div>
          
          {upcomingExams.length === 0 ? (
             <GlassCard className="p-8 text-center flex flex-col items-center justify-center text-muted-foreground">
               <CalendarIcon className="w-10 h-10 mb-4 opacity-50" />
               <p>No upcoming exams scheduled.</p>
             </GlassCard>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {upcomingExams.map(exam => {
                const days = differenceInDays(new Date(exam.date!), new Date());
                const isUrgent = days <= 3;
                const isCritical = days <= 1;
                
                return (
                  <GlassCard key={exam.id} className="p-5 flex flex-col gap-3 relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-1.5 h-full" style={{ backgroundColor: exam.subject.color }} />
                    <div className="pl-3">
                      <p className="text-sm font-medium text-muted-foreground mb-1" style={{ color: exam.subject.color }}>{exam.subject.name}</p>
                      <h3 className="font-bold text-lg leading-tight">{exam.name}</h3>
                      <div className="mt-4 inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-secondary text-secondary-foreground">
                        {isToday(new Date(exam.date!)) ? "Today" : isTomorrow(new Date(exam.date!)) ? "Tomorrow" : `In ${days} days`}
                        {isUrgent && <span className={`ml-2 w-2 h-2 rounded-full ${isCritical ? 'bg-destructive' : 'bg-orange-500'}`} />}
                      </div>
                    </div>
                  </GlassCard>
                )
              })}
            </div>
          )}
        </div>

        {/* Schedule & Tasks */}
        <div className="space-y-6">
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Today's Schedule</h2>
            {todaySchedule.length === 0 ? (
              <GlassCard className="p-6 text-center text-muted-foreground text-sm">
                No events today.
              </GlassCard>
            ) : (
              <div className="space-y-3">
                {todaySchedule.map(ev => {
                  const subject = subjects.find(s => s.id === ev.subjectId);
                  return (
                    <GlassCard key={ev.id} className="p-4 flex items-center gap-4">
                      <div className="w-12 text-center shrink-0">
                        <p className="text-xs font-semibold text-muted-foreground">{format(new Date(ev.datetime), "HH:mm")}</p>
                      </div>
                      <div className="w-1 h-8 rounded-full shrink-0" style={{ backgroundColor: subject?.color || 'var(--primary)' }} />
                      <div className="flex-1 truncate">
                        <p className="font-semibold text-sm truncate">{ev.title}</p>
                        <p className="text-xs text-muted-foreground truncate">{subject?.name}</p>
                      </div>
                    </GlassCard>
                  )
                })}
              </div>
            )}
          </div>

          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Quick Tasks</h2>
            {todaysTasks.length === 0 ? (
              <GlassCard className="p-6 text-center text-muted-foreground text-sm">
                All caught up!
              </GlassCard>
            ) : (
              <GlassCard className="p-2">
                {todaysTasks.map((task, i) => {
                  const subject = subjects.find(s => s.id === task.subjectId);
                  return (
                    <button
                      key={task.id}
                      onClick={() => toggleChecklistItem(task.id)}
                      className="w-full flex items-center gap-3 p-3 hover:bg-muted/50 rounded-xl transition-colors text-left group"
                    >
                      <Circle className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                      <span className="flex-1 text-sm font-medium">{task.text}</span>
                      {subject && (
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: subject.color }} />
                      )}
                    </button>
                  )
                })}
              </GlassCard>
            )}
          </div>
        </div>

      </div>

      {/* Progress rings */}
      <div className="pt-4">
        <h2 className="text-xl font-semibold mb-6">Subject Progress</h2>
        {subjects.length === 0 ? (
          <GlassCard className="p-8 text-center text-muted-foreground">
            Add subjects to see your progress.
          </GlassCard>
        ) : (
          <div className="flex flex-nowrap overflow-x-auto gap-6 pb-4 scrollbar-hide">
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
                  <div className="relative w-20 h-20 flex items-center justify-center">
                    <svg className="w-full h-full transform -rotate-90">
                      <circle cx="40" cy="40" r="30" stroke="currentColor" strokeWidth="6" fill="transparent" className="text-muted" />
                      <circle 
                        cx="40" cy="40" r="30" 
                        stroke={subject.color} 
                        strokeWidth="6" 
                        fill="transparent" 
                        strokeDasharray={circumference}
                        strokeDashoffset={offset}
                        className="transition-all duration-1000 ease-out drop-shadow-md"
                      />
                    </svg>
                    <span className="absolute font-bold text-sm">{Math.round(avg)}%</span>
                  </div>
                  <p className="text-xs font-semibold text-center w-24 truncate">{subject.name}</p>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}
