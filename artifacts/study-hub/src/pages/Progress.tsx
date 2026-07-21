import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "wouter";
import {
  Award, BookOpen, Brain, ChevronRight, Gauge, GraduationCap,
  Sparkles, Target, TrendingUp,
} from "lucide-react";
import { useStudyData, type StudyType } from "@/hooks/useStudyData";
import { GlassCard } from "@/components/shared/GlassCard";

type Filter = "all" | StudyType;

function scoreBand(value?: number | null) {
  if (value == null) return "Not attempted";
  if (value === 100) return "Incredible";
  if (value >= 90) return "Great";
  if (value >= 80) return "Good";
  if (value >= 70) return "Bad";
  if (value >= 60) return "Very bad";
  if (value >= 50) return "WTF";
  return "Fuck yourself";
}

function percentage(done: number, total: number) {
  return total ? Math.round(done / total * 100) : 0;
}

export function Progress() {
  const { subjects } = useStudyData();
  const [filter, setFilter] = useState<Filter>("all");

  const rows = useMemo(() => subjects.map(subject => {
    const theoretical = subject.lectures.filter(item => item.type === "theoretical");
    const practical = subject.lectures.filter(item => item.type === "practical");
    const theoryLecture = percentage(theoretical.filter(item => item.checked).length, theoretical.length);
    const practicalLecture = percentage(practical.filter(item => item.checked).length, practical.length);
    const theoryExam = subject.exams.find(item => item.type === "theoretical" && item.name === "Final Exam")?.lastScore?.percentage ?? null;
    const practicalExam = subject.exams.find(item => item.type === "practical" && item.name === "Final Exam")?.lastScore?.percentage ?? null;
    const theoryProgress = Math.round((theoryLecture + (theoryExam ?? 0)) / 2);
    const practicalProgress = Math.round((practicalLecture + (practicalExam ?? 0)) / 2);
    const overall = Math.round((theoryProgress + practicalProgress) / 2);
    return { subject, theoretical, practical, theoryLecture, practicalLecture, theoryExam, practicalExam, theoryProgress, practicalProgress, overall };
  }), [subjects]);

  const visibleRows = rows.filter(row => filter === "all" || (filter === "theoretical" ? row.theoretical.length > 0 || row.theoryExam != null : row.practical.length > 0 || row.practicalExam != null));
  const overall = visibleRows.length ? Math.round(visibleRows.reduce((sum, row) => sum + (filter === "theoretical" ? row.theoryProgress : filter === "practical" ? row.practicalProgress : row.overall), 0) / visibleRows.length) : 0;
  const completedLectures = subjects.reduce((sum, subject) => sum + subject.lectures.filter(item => item.checked && (filter === "all" || item.type === filter)).length, 0);
  const totalLectures = subjects.reduce((sum, subject) => sum + subject.lectures.filter(item => filter === "all" || item.type === filter).length, 0);
  const attemptedFinals = subjects.reduce((sum, subject) => sum + subject.exams.filter(item => item.name === "Final Exam" && item.lastScore && (filter === "all" || item.type === filter)).length, 0);
  const strongest = [...visibleRows].sort((a, b) => (filter === "theoretical" ? b.theoryProgress - a.theoryProgress : filter === "practical" ? b.practicalProgress - a.practicalProgress : b.overall - a.overall))[0];

  return <div className="space-y-6 pb-24">
    <header>
      <div className="mb-2 flex items-center gap-2 text-primary"><Sparkles className="h-5 w-5" /><span className="text-xs font-black uppercase tracking-[.2em]">Study intelligence</span></div>
      <h1 className="text-4xl font-black tracking-tight md:text-5xl">Progress command center</h1>
      <p className="mt-3 max-w-2xl text-muted-foreground">A live view of lecture completion and Final Exam performance across every subject.</p>
    </header>

    <div className="grid grid-cols-3 gap-1 rounded-2xl border border-border/50 bg-secondary/40 p-1.5">
      {(["all", "theoretical", "practical"] as Filter[]).map(item => <button key={item} onClick={() => setFilter(item)} className={`min-h-11 rounded-xl text-sm font-bold capitalize transition-all duration-200 ${filter === item ? "bg-card text-foreground shadow-sm ring-1 ring-border/50" : "text-muted-foreground hover:text-foreground"}`}>{item}</button>)}
    </div>

    <GlassCard className="relative overflow-hidden rounded-[2rem] border-border/50 p-6 shadow-xl md:p-8">
      <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-primary/15 blur-3xl" />
      <div className="relative grid items-center gap-8 lg:grid-cols-[auto_1fr]">
        <div className="relative mx-auto flex h-44 w-44 items-center justify-center rounded-full bg-secondary/50 shadow-inner">
          <div className="absolute inset-3 rounded-full border-[12px] border-secondary" />
          <motion.div initial={{ rotate: -90 }} animate={{ rotate: -90 + overall * 3.6 }} transition={{ duration: .9, ease: [.4, 0, .2, 1] }} className="absolute inset-3 rounded-full border-[12px] border-transparent border-t-primary motion-reduce:transition-none" />
          <div className="text-center"><p className="text-5xl font-black tabular-nums">{overall}%</p><p className="mt-1 text-xs font-black uppercase tracking-[.16em] text-muted-foreground">Overall power</p></div>
        </div>
        <div>
          <p className="text-sm font-bold text-primary">{filter === "all" ? "All study modes" : `${filter[0].toUpperCase()}${filter.slice(1)} focus`}</p>
          <h2 className="mt-2 text-3xl font-black">{overall >= 90 ? "You are dominating." : overall >= 70 ? "Strong momentum." : overall >= 50 ? "The foundation is forming." : "Time to build your streak."}</h2>
          <p className="mt-3 max-w-xl leading-7 text-muted-foreground">Each mode combines lecture completion and its Final Exam score equally, giving you a clear signal instead of a misleading single number.</p>
          {strongest && <div className="mt-5 inline-flex items-center gap-3 rounded-2xl border border-primary/20 bg-primary/10 px-4 py-3"><TrendingUp className="h-5 w-5 text-primary" /><div><p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Leading subject</p><p className="font-bold">{strongest.subject.name}</p></div></div>}
        </div>
      </div>
    </GlassCard>

    <div className="grid gap-3 sm:grid-cols-3">
      <Metric icon={BookOpen} label="Lectures completed" value={`${completedLectures}/${totalLectures}`} />
      <Metric icon={Award} label="Finals attempted" value={String(attemptedFinals)} />
      <Metric icon={Target} label="Subjects tracked" value={String(visibleRows.length)} />
    </div>

    <section className="space-y-4">
      <div className="flex items-end justify-between"><div><p className="text-xs font-black uppercase tracking-[.18em] text-muted-foreground">Subject performance</p><h2 className="mt-1 text-2xl font-black">Your study map</h2></div><Gauge className="h-6 w-6 text-primary" /></div>
      {visibleRows.length ? <div className="grid gap-4 xl:grid-cols-2">{visibleRows.map((row, index) => {
        const value = filter === "theoretical" ? row.theoryProgress : filter === "practical" ? row.practicalProgress : row.overall;
        return <motion.div key={row.subject.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(index * .04, .28), duration: .28 }}>
          <Link href={`/subjects/${row.subject.id}/progress`} className="group block rounded-[1.75rem] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <GlassCard className="relative overflow-hidden rounded-[1.75rem] border-border/50 p-5 transition-all duration-200 group-hover:-translate-y-1 group-hover:shadow-xl motion-reduce:transform-none">
              <div className="absolute left-5 right-5 top-0 h-1 rounded-b-full" style={{ backgroundColor: row.subject.color }} />
              <div className="flex items-start justify-between gap-4"><div className="min-w-0"><h3 className="truncate text-xl font-black">{row.subject.name}</h3><p className="mt-1 text-xs text-muted-foreground">{row.subject.lectures.length} lectures · {row.subject.attachments?.length ?? 0} attachments</p></div><div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-border/50 bg-secondary/50"><GraduationCap className="h-6 w-6" /></div></div>
              <div className="mt-5 flex items-center justify-between"><span className="text-sm font-bold text-muted-foreground">Current power</span><span className="text-3xl font-black tabular-nums">{value}%</span></div>
              <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-secondary"><motion.div initial={{ width: 0 }} animate={{ width: `${value}%` }} transition={{ duration: .6 }} className="h-full rounded-full" style={{ backgroundColor: row.subject.color }} /></div>
              <div className="mt-5 grid grid-cols-2 gap-3"><Degree title="Theoretical final" score={row.theoryExam} /><Degree title="Practical final" score={row.practicalExam} /></div>
              <div className="mt-4 flex items-center justify-end gap-1 text-xs font-bold text-primary opacity-70 transition-opacity group-hover:opacity-100">Open details <ChevronRight className="h-4 w-4" /></div>
            </GlassCard>
          </Link>
        </motion.div>;
      })}</div> : <GlassCard className="rounded-3xl border-2 border-dashed bg-transparent p-12 text-center"><Brain className="mx-auto mb-4 h-8 w-8 text-primary" /><h3 className="text-xl font-bold">No progress data yet</h3><p className="mt-2 text-muted-foreground">Add lectures and complete a Final Exam to activate this dashboard.</p></GlassCard>}
    </section>
  </div>;
}

function Metric({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return <GlassCard className="rounded-3xl border-border/50 p-5"><div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary"><Icon className="h-5 w-5" /></div><p className="mt-4 text-3xl font-black tabular-nums">{value}</p><p className="mt-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">{label}</p></GlassCard>;
}

function Degree({ title, score }: { title: string; score?: number | null }) {
  return <div className="rounded-2xl border border-border/40 bg-secondary/35 p-3"><p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">{title}</p><p className="mt-2 truncate text-sm font-black">{scoreBand(score)}</p></div>;
}
