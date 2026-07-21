import { useStudyData, type SchedulePlan } from "@/hooks/useStudyData";
import { GlassCard } from "@/components/shared/GlassCard";
import { MiniCalendar } from "@/components/dashboard/MiniCalendar";
import { format } from "date-fns";
import { ArrowRight, BookOpen, Calendar as CalendarIcon, Flame, Settings as SettingsIcon, Target, Trophy } from "lucide-react";
import { Link } from "wouter";

function daysUntil(dateStr: string) {
  const target = new Date(dateStr); target.setHours(0, 0, 0, 0);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}

function NextExamsSection({ plans, subjects }: { plans: SchedulePlan[]; subjects: any[] }) {
  const now = new Date(); now.setHours(0, 0, 0, 0);
  const direct = subjects.flatMap(subject => (subject.exams ?? []).filter((exam: any) => exam.date && !exam.checked).map((exam: any) => ({ id: exam.id, name: exam.name, subjectName: subject.name, date: exam.date })));
  const planned = plans.filter(plan => plan.type === "exam").flatMap(plan => plan.items.filter(item => item.date && !item.checked).map(item => ({ id: item.id, name: item.subjectName, subjectName: item.subjectName, date: item.date! })));
  const exams = [...direct, ...planned].filter(item => new Date(item.date) >= now).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).slice(0, 2);
  return <section className="space-y-4"><div className="flex items-center justify-between px-1"><h2 className="text-xl font-bold tracking-tight">Next Exams</h2><Link href="/schedule" className="text-sm font-semibold text-primary">View all</Link></div>{!exams.length ? <GlassCard className="flex flex-col items-center justify-center border-2 border-dashed bg-transparent p-8 text-center text-muted-foreground"><CalendarIcon className="mb-3 h-8 w-8 opacity-30" /><p className="font-medium">No upcoming exams.</p></GlassCard> : <div className="space-y-3">{exams.map((exam, index) => { const days = daysUntil(exam.date), urgent = days <= 3, color = urgent ? "#f87171" : days <= 7 ? "#fbbf24" : "#60a5fa"; return index === 0 ? <GlassCard key={exam.id} className="relative overflow-hidden rounded-3xl border-border/60 p-5 shadow-lg"><div className="pointer-events-none absolute inset-4 overflow-hidden rounded-[1.4rem]"><div className="absolute -right-12 -top-12 h-40 w-40 rounded-full blur-3xl" style={{ backgroundColor: `${color}18` }} /></div><div className="relative flex items-center gap-5"><div className="min-w-0 flex-1"><p className="text-[10px] font-black uppercase tracking-widest" style={{ color }}>Next Exam · {exam.subjectName}</p><h3 className="mt-2 text-lg font-bold">{exam.name}</h3><p className="mt-3 text-xs text-muted-foreground">{format(new Date(exam.date), "EEEE, MMM d, yyyy")}</p></div><div className="text-center"><p className="text-5xl font-black" style={{ color }}>{days === 0 ? "!" : days}</p><p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">{days === 0 ? "Today" : days === 1 ? "day" : "days"}</p></div></div></GlassCard> : <GlassCard key={exam.id} className="flex items-center gap-4 p-4"><div className="min-w-0 flex-1"><p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{exam.subjectName}</p><p className="truncate font-semibold">{exam.name}</p><p className="text-xs text-muted-foreground">{format(new Date(exam.date), "EEE, MMM d")}</p></div><b style={{ color }}>{days === 0 ? "Today" : `${days}d`}</b></GlassCard>; })}</div>}</section>;
}

function DashboardProgress({ subjects }: { subjects: any[] }) {
  const rows = subjects.map(subject => {
    const lectureTotal = subject.lectures.length;
    const lectureDone = subject.lectures.filter((lecture: any) => lecture.checked).length;
    const finals = subject.exams.filter((exam: any) => exam.name === "Final Exam" && exam.lastScore);
    const finalAverage = finals.length ? finals.reduce((sum: number, exam: any) => sum + exam.lastScore.percentage, 0) / finals.length : 0;
    const lectureProgress = lectureTotal ? lectureDone / lectureTotal * 100 : 0;
    const score = Math.round((lectureProgress + finalAverage) / 2);
    return { subject, score, lectureDone, lectureTotal, finals: finals.length };
  });
  const overall = rows.length ? Math.round(rows.reduce((sum, row) => sum + row.score, 0) / rows.length) : 0;
  const leader = [...rows].sort((a, b) => b.score - a.score)[0];
  const complete = rows.reduce((sum, row) => sum + row.lectureDone, 0), total = rows.reduce((sum, row) => sum + row.lectureTotal, 0), finals = rows.reduce((sum, row) => sum + row.finals, 0);
  return <section className="space-y-4"><div className="flex items-center justify-between px-1"><div><p className="text-xs font-black uppercase tracking-[.18em] text-muted-foreground">Performance</p><h2 className="mt-1 text-2xl font-black">Your progress</h2></div><Link href="/progress" className="flex h-10 w-10 items-center justify-center rounded-full border border-primary/20 bg-primary/10 text-primary"><ArrowRight className="h-5 w-5" /></Link></div>{!subjects.length ? <GlassCard className="border-2 border-dashed bg-transparent p-8 text-center text-muted-foreground">Add subjects to see progress.</GlassCard> : <GlassCard className="overflow-hidden rounded-3xl border-border/60 p-0 shadow-lg"><div className="relative p-5"><div className="pointer-events-none absolute inset-4 overflow-hidden rounded-[1.4rem]"><div className="absolute -right-10 -top-12 h-36 w-36 rounded-full bg-primary/12 blur-3xl" /></div><div className="relative flex items-center gap-5"><div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full border-[9px] border-primary/20 bg-secondary/40"><div className="text-center"><p className="text-3xl font-black">{overall}%</p><p className="text-[9px] font-black uppercase tracking-wider text-muted-foreground">Overall</p></div></div><div className="min-w-0"><p className="text-xs font-bold text-primary">Study command center</p><h3 className="mt-1 text-2xl font-black leading-tight">{overall >= 80 ? "Excellent momentum" : overall >= 50 ? "Keep building" : "Ready to grow"}</h3><p className="mt-2 truncate text-sm text-muted-foreground">{leader ? <>Leading: <b className="text-foreground">{leader.subject.name}</b></> : "Start your first subject"}</p></div></div><div className="relative mt-5 h-3 overflow-hidden rounded-full bg-secondary"><div className="h-full rounded-full bg-primary transition-all duration-700" style={{ width: `${overall}%` }} /></div></div><div className="grid grid-cols-3 border-t border-border/40"><Metric icon={BookOpen} value={`${complete}/${total}`} label="Lectures" /><Metric icon={Trophy} value={String(finals)} label="Finals" /><Metric icon={Target} value={String(subjects.length)} label="Subjects" /></div></GlassCard>}</section>;
}

function Metric({ icon: Icon, value, label }: { icon: any; value: string; label: string }) { return <div className="border-r border-border/40 p-4 text-center last:border-r-0"><Icon className="mx-auto h-5 w-5 text-primary" /><p className="mt-2 text-lg font-black">{value}</p><p className="text-[9px] font-black uppercase tracking-wider text-muted-foreground">{label}</p></div>; }

export function Dashboard() {
  const { subjects, schedule, checklist, schedulePlans } = useStudyData();
  const doneItems = checklist.filter(item => item.done && item.doneAt);
  const completedOn = (date: Date) => doneItems.some(item => new Date(item.doneAt!).toDateString() === date.toDateString());
  let streak = 0, cursor = new Date(); if (!completedOn(cursor)) cursor.setDate(cursor.getDate() - 1); while (completedOn(cursor)) { streak++; cursor.setDate(cursor.getDate() - 1); }
  return <div className="space-y-10 pb-12"><header className="flex items-center justify-between gap-3"><div className="min-w-0"><h1 className="text-2xl font-bold tracking-tight md:text-4xl">👋 Hello StudyHub</h1><p className="mt-1 truncate text-sm font-medium text-muted-foreground md:text-lg">{format(new Date(), "EEEE, MMMM do")}</p></div><div className="flex items-center gap-2"><GlassCard className="flex items-center gap-3 px-3 py-2"><div className="flex h-9 w-9 items-center justify-center rounded-xl border border-orange-500/20 bg-orange-500/10"><Flame className="h-4 w-4 text-orange-500" /></div><div><p className="text-xl font-bold leading-none">{streak}</p><p className="mt-1 text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Day streak</p></div></GlassCard><Link href="/settings" className="flex h-11 w-11 items-center justify-center rounded-xl border border-border/50 bg-secondary/80"><SettingsIcon className="h-5 w-5 text-muted-foreground" /></Link></div></header><NextExamsSection plans={schedulePlans} subjects={subjects} /><MiniCalendar schedule={schedule} checklist={checklist} /><DashboardProgress subjects={subjects} /></div>;
}
