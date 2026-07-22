import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, RotateCcw, ShieldCheck, Sparkles, Target, Trophy } from "lucide-react";
import { GlassCard } from "@/components/shared/GlassCard";

export function ExamResultPanel({ percentage, band, correct, total, flashPoints, missedCount, reviewOnly, automatic, showMissed, onToggleMissed, onRestart, onRetryWrong, onDone, children }: { percentage: number; band: { label: string; color: string }; correct: number; total: number; flashPoints: number; missedCount: number; reviewOnly: boolean; automatic: boolean; showMissed: boolean; onToggleMissed: () => void; onRestart: () => void; onRetryWrong: () => void; onDone: () => void; children: React.ReactNode }) {
  const circumference = 2 * Math.PI * 54;
  const dash = circumference * percentage / 100;
  return <div className="space-y-4">
    {automatic && <div className="rounded-2xl border border-amber-500/25 bg-amber-500/10 p-4 text-sm font-semibold text-amber-700 dark:text-amber-300">The attempt was submitted because the exam page was left or hidden.</div>}
    {reviewOnly && <div className="flex items-center gap-3 rounded-2xl border border-primary/20 bg-primary/10 p-4 text-sm font-semibold text-primary"><ShieldCheck className="h-5 w-5 shrink-0" />Practice review only — your saved degree is protected.</div>}
    <GlassCard className="relative overflow-hidden rounded-[2rem] border-border/60 p-0 shadow-xl">
      <div className="absolute inset-0 opacity-80" style={{ backgroundImage: `radial-gradient(circle at 50% 12%, ${band.color}24, transparent 48%)` }} />
      <div className="relative p-6 text-center sm:p-8">
        <div className="relative mx-auto h-36 w-36">
          <svg viewBox="0 0 128 128" className="absolute inset-0 -rotate-90 overflow-visible"><circle cx="64" cy="64" r="54" fill="none" stroke="hsl(var(--secondary))" strokeWidth="10" /><motion.circle cx="64" cy="64" r="54" fill="none" stroke={band.color} strokeWidth="10" strokeLinecap="round" strokeDasharray={`${circumference} ${circumference}`} initial={{ strokeDashoffset: circumference }} animate={{ strokeDashoffset: circumference - dash }} transition={{ duration: .9, ease: [.4, 0, .2, 1] }} /></svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center"><span className="text-4xl font-black tabular-nums">{percentage}<span className="text-2xl">%</span></span><span className="mt-1 text-[9px] font-black uppercase tracking-[.18em] text-muted-foreground">Final score</span></div>
        </div>
        <div className="mt-4 flex items-center justify-center gap-2"><Sparkles className="h-5 w-5" style={{ color: band.color }} /><h2 className="text-3xl font-black">{band.label}</h2></div>
        <p className="mt-2 text-sm text-muted-foreground">Unanswered questions and unread flashcards count as zero.</p>
        <div className="mt-6 grid grid-cols-3 gap-2"><ResultStat label="Earned" value={`${correct}/${total}`} /><ResultStat label="Flashcards" value={`${flashPoints} pts`} /><ResultStat label="Review" value={String(missedCount)} /></div>
      </div>
    </GlassCard>
    <button onClick={onToggleMissed} className="group flex w-full items-center gap-4 rounded-3xl border border-border/60 bg-card p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"><div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary"><Target className="h-5 w-5" /></div><div className="min-w-0 flex-1"><b className="text-base">Review items</b><p className="text-sm text-muted-foreground">{missedCount} need more work</p></div><ArrowRight className={`h-5 w-5 text-muted-foreground transition-transform ${showMissed ? "rotate-90" : ""}`} /></button>
    <AnimatePresence>{showMissed && <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="space-y-3 overflow-hidden">{children}</motion.div>}</AnimatePresence>
    <div className="grid grid-cols-2 gap-3"><button onClick={onRestart} className="flex min-h-14 items-center justify-center gap-2 rounded-2xl border border-border bg-secondary font-bold"><RotateCcw className="h-5 w-5" />Retake all</button><button onClick={onDone} className="min-h-14 rounded-2xl bg-primary font-bold text-primary-foreground">Done</button></div>
    <button disabled={!missedCount} onClick={onRetryWrong} className="group relative flex min-h-24 w-full items-center gap-4 overflow-hidden rounded-3xl border border-primary/25 bg-gradient-to-br from-primary/20 via-primary/10 to-card px-5 text-left shadow-lg transition-all hover:-translate-y-1 hover:shadow-xl disabled:opacity-40"><div className="absolute -right-8 -top-10 h-28 w-28 rounded-full bg-primary/20 blur-2xl" /><div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg"><Trophy className="h-7 w-7 transition-transform group-hover:scale-110" /></div><div className="relative min-w-0 flex-1"><p className="text-lg font-black text-primary">Retry wrong only</p><p className="mt-1 text-sm text-muted-foreground">Practice the missed items without changing your saved score.</p></div><ShieldCheck className="relative h-6 w-6 shrink-0 text-primary" /></button>
  </div>;
}

function ResultStat({ label, value }: { label: string; value: string }) { return <div className="rounded-2xl border border-border/50 bg-secondary/35 px-2 py-3 text-center"><p className="text-base font-black tabular-nums">{value}</p><p className="mt-1 text-[8px] font-black uppercase tracking-wider text-muted-foreground">{label}</p></div>; }
