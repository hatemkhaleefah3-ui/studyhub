import { useState, useRef, useCallback } from "react";
import { useStudyData } from "@/hooks/useStudyData";
import { GlassCard } from "@/components/shared/GlassCard";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis,
  Tooltip, CartesianGrid,
} from "recharts";
import { motion, AnimatePresence } from "framer-motion";
import { TrendingUp, TrendingDown, Minus, ChevronRight, ChevronLeft } from "lucide-react";

// ── Threshold ──────────────────────────────────────────────────────────────────
// A subject is "strong" when its weighted exam average is ≥ 70 %.
// If no graded exams exist we fall back to checklist completion rate ≥ 70 %.
// If neither data point is available the subject is shown as neutral.
const STRONG_THRESHOLD = 70;

// ── Per-subject computed stats ────────────────────────────────────────────────
function useSubjectStats(subjects: ReturnType<typeof useStudyData>["subjects"], checklist: ReturnType<typeof useStudyData>["checklist"]) {
  return subjects.map(subject => {
    // ── Exam average (weighted) ────────────────────────────────────────────
    const gradedExams = subject.exams
      .filter(e => e.grade !== null && e.grade !== "")
      .map(e => ({ name: e.name, grade: parseFloat(e.grade!), weight: e.weight || 1, date: e.date }))
      .filter(e => !isNaN(e.grade));

    let examAvg: number | null = null;
    if (gradedExams.length > 0) {
      const totalW = gradedExams.reduce((s, e) => s + e.weight, 0);
      examAvg = gradedExams.reduce((s, e) => s + e.grade * e.weight, 0) / totalW;
    }

    // ── Checklist completion rate ──────────────────────────────────────────
    const subjectTasks = checklist.filter(c => c.subjectId === subject.id);
    const totalTasks = subjectTasks.length;
    const doneTasks  = subjectTasks.filter(c => c.done).length;
    const completionRate = totalTasks > 0 ? (doneTasks / totalTasks) * 100 : null;

    // ── Strong / weak indicator ────────────────────────────────────────────
    type Strength = "strong" | "weak" | "neutral";
    let strength: Strength = "neutral";
    let strengthBasis: "exams" | "tasks" | null = null;

    if (examAvg !== null) {
      strength = examAvg >= STRONG_THRESHOLD ? "strong" : "weak";
      strengthBasis = "exams";
    } else if (completionRate !== null) {
      strength = completionRate >= STRONG_THRESHOLD ? "strong" : "weak";
      strengthBasis = "tasks";
    }

    // ── Chart data (sorted by date if available, else by position) ────────
    const chartData = [...gradedExams]
      .sort((a, b) => {
        if (a.date && b.date) return a.date.localeCompare(b.date);
        return 0;
      })
      .map((e, i) => ({
        name: e.name.length > 12 ? e.name.slice(0, 12) + "…" : e.name,
        grade: Math.round(e.grade),
        index: i + 1,
      }));

    return { subject, gradedExams, examAvg, completionRate, totalTasks, doneTasks, chartData, strength, strengthBasis };
  });
}

// ── Swipe hook (horizontal, page-local) ──────────────────────────────────────
function useHorizontalSwipe(onSwipeLeft: () => void, onSwipeRight: () => void) {
  const startX = useRef<number | null>(null);
  const startY = useRef<number | null>(null);
  const isDragging = useRef(false);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    startX.current = e.clientX;
    startY.current = e.clientY;
    isDragging.current = true;
  }, []);

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    if (!isDragging.current || startX.current === null || startY.current === null) return;
    isDragging.current = false;
    const dx = e.clientX - startX.current;
    const dy = e.clientY - startY.current;
    if (Math.abs(dx) < 40 || Math.abs(dx) < Math.abs(dy) * 1.5) return; // not a horizontal swipe
    if (dx > 0) onSwipeRight();
    else onSwipeLeft();
    startX.current = null;
    startY.current = null;
  }, [onSwipeLeft, onSwipeRight]);

  const onPointerCancel = useCallback(() => {
    isDragging.current = false;
    startX.current = null;
    startY.current = null;
  }, []);

  return { onPointerDown, onPointerUp, onPointerCancel };
}

// ── Strength badge ────────────────────────────────────────────────────────────
function StrengthBadge({ strength, basis }: { strength: "strong" | "weak" | "neutral"; basis: "exams" | "tasks" | null }) {
  if (strength === "neutral") return null;
  const isStrong = strength === "strong";
  return (
    <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
      isStrong ? "bg-emerald-500/15 text-emerald-500" : "bg-rose-500/15 text-rose-500"
    }`}>
      {isStrong ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
      {isStrong ? "Strong" : "Needs work"}
      {basis && <span className="opacity-60 font-medium">· {basis === "exams" ? "exams" : "tasks"}</span>}
    </div>
  );
}

// ── Subject card — normal (overview) view ─────────────────────────────────────
function SubjectOverview({
  stats,
  onSwipeLeft,
}: {
  stats: ReturnType<typeof useSubjectStats>[number];
  onSwipeLeft: () => void;
}) {
  const { subject, examAvg, completionRate, totalTasks, doneTasks, strength, strengthBasis } = stats;
  const swipe = useHorizontalSwipe(onSwipeLeft, () => {});

  return (
    <motion.div
      key="overview"
      initial={{ x: 60, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: -60, opacity: 0 }}
      transition={{ type: "spring", stiffness: 340, damping: 32 }}
      className="w-full touch-pan-y"
      {...swipe}
    >
      <GlassCard className="p-6 overflow-hidden relative select-none">
        <div className="absolute top-0 left-0 w-1.5 h-full" style={{ backgroundColor: subject.color }} />
        <div className="pl-4">
          {/* Title row */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 flex-wrap">
              <h3 className="text-xl font-bold">{subject.name}</h3>
              <StrengthBadge strength={strength} basis={strengthBasis} />
            </div>
            <button
              onClick={onSwipeLeft}
              className="shrink-0 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-lg hover:bg-secondary/60"
              title="See detailed progress"
            >
              Details <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Stats row */}
          <div className="flex gap-3 mt-4 flex-wrap">
            <div className="bg-secondary/50 rounded-xl px-4 py-3">
              <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider mb-1">Exam avg</p>
              <p className="text-2xl font-black" style={{ color: examAvg !== null ? subject.color : undefined }}>
                {examAvg !== null ? `${Math.round(examAvg)}%` : "—"}
              </p>
            </div>
            <div className="bg-secondary/50 rounded-xl px-4 py-3">
              <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider mb-1">Tasks done</p>
              <p className="text-2xl font-black">
                {totalTasks > 0 ? `${doneTasks}/${totalTasks}` : "—"}
              </p>
            </div>
            {completionRate !== null && (
              <div className="bg-secondary/50 rounded-xl px-4 py-3">
                <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider mb-1">Completion</p>
                <p className="text-2xl font-black">{Math.round(completionRate)}%</p>
              </div>
            )}
          </div>

          {/* Swipe hint */}
          <p className="text-xs text-muted-foreground/50 mt-3 select-none">Swipe right → for detailed breakdown</p>
        </div>
      </GlassCard>
    </motion.div>
  );
}

// ── Subject card — detail (progress) view ─────────────────────────────────────
function SubjectDetail({
  stats,
  onSwipeRight,
}: {
  stats: ReturnType<typeof useSubjectStats>[number];
  onSwipeRight: () => void;
}) {
  const { subject, gradedExams, examAvg, completionRate, totalTasks, doneTasks, chartData, strength, strengthBasis } = stats;
  const swipe = useHorizontalSwipe(() => {}, onSwipeRight);

  const hasExams = gradedExams.length > 0;

  // Grade trend: last 2 exams
  let trend: "up" | "down" | "flat" | null = null;
  if (gradedExams.length >= 2) {
    const last = gradedExams[gradedExams.length - 1].grade;
    const prev = gradedExams[gradedExams.length - 2].grade;
    const delta = last - prev;
    trend = delta > 2 ? "up" : delta < -2 ? "down" : "flat";
  }

  return (
    <motion.div
      key="detail"
      initial={{ x: -60, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 60, opacity: 0 }}
      transition={{ type: "spring", stiffness: 340, damping: 32 }}
      className="w-full touch-pan-y"
      {...swipe}
    >
      <GlassCard className="p-6 overflow-hidden relative select-none">
        <div className="absolute top-0 left-0 w-1.5 h-full" style={{ backgroundColor: subject.color }} />
        <div className="pl-4 space-y-5">

          {/* Header */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 flex-wrap">
              <button
                onClick={onSwipeRight}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-lg hover:bg-secondary/60"
              >
                <ChevronLeft className="w-3.5 h-3.5" /> Back
              </button>
              <h3 className="text-xl font-bold">{subject.name}</h3>
            </div>
            <div className="flex items-center gap-2">
              {trend && (
                <span className={`text-xs font-semibold flex items-center gap-1 ${
                  trend === "up" ? "text-emerald-500" : trend === "down" ? "text-rose-500" : "text-muted-foreground"
                }`}>
                  {trend === "up" ? <TrendingUp className="w-3.5 h-3.5" /> : trend === "down" ? <TrendingDown className="w-3.5 h-3.5" /> : <Minus className="w-3.5 h-3.5" />}
                  {trend === "up" ? "Improving" : trend === "down" ? "Declining" : "Steady"}
                </span>
              )}
              <StrengthBadge strength={strength} basis={strengthBasis} />
            </div>
          </div>

          {/* Exam grade list */}
          {hasExams && (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Exam Grades</p>
              <div className="space-y-1.5">
                {gradedExams.map((exam, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-sm text-muted-foreground flex-1 truncate">{exam.name}</span>
                    {/* Grade bar */}
                    <div className="w-24 h-1.5 rounded-full bg-secondary overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${Math.min(exam.grade, 100)}%`, backgroundColor: subject.color }}
                      />
                    </div>
                    <span className="text-sm font-bold w-10 text-right">{Math.round(exam.grade)}%</span>
                  </div>
                ))}
              </div>

              {/* Weighted average */}
              <div className="flex items-center justify-between pt-1 border-t border-border/40 mt-2">
                <span className="text-sm font-semibold">Weighted average</span>
                <span
                  className="text-xl font-black"
                  style={{ color: examAvg !== null && examAvg >= STRONG_THRESHOLD ? "#22c55e" : "#f43f5e" }}
                >
                  {examAvg !== null ? `${Math.round(examAvg)}%` : "—"}
                </span>
              </div>
            </div>
          )}

          {/* Grade trend chart */}
          {chartData.length >= 2 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Grade Trend</p>
              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis
                      dataKey="name"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                      dy={8}
                    />
                    <YAxis
                      domain={[0, 100]}
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                      tickFormatter={v => `${v}%`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        borderRadius: "12px",
                        border: "1px solid hsl(var(--border))",
                        backdropFilter: "blur(16px)",
                      }}
                      formatter={(v: number) => [`${v}%`, "Grade"]}
                    />
                    {/* Threshold line */}
                    <Line
                      type="monotone"
                      dataKey={() => STRONG_THRESHOLD}
                      stroke="hsl(var(--muted-foreground))"
                      strokeWidth={1}
                      strokeDasharray="4 4"
                      dot={false}
                      legendType="none"
                    />
                    <Line
                      type="monotone"
                      dataKey="grade"
                      stroke={subject.color}
                      strokeWidth={3}
                      dot={{ r: 5, fill: "hsl(var(--card))", strokeWidth: 2.5, stroke: subject.color }}
                      activeDot={{ r: 7 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <p className="text-xs text-muted-foreground/50 mt-1">Dashed line = {STRONG_THRESHOLD}% threshold</p>
            </div>
          )}

          {/* Checklist completion */}
          {totalTasks > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Task Completion</p>
              <div className="flex items-center gap-3">
                <div className="flex-1 h-2.5 rounded-full bg-secondary overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ backgroundColor: subject.color }}
                    initial={{ width: 0 }}
                    animate={{ width: `${completionRate ?? 0}%` }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                  />
                </div>
                <span className="text-sm font-bold w-16 text-right">
                  {doneTasks}/{totalTasks} ({Math.round(completionRate ?? 0)}%)
                </span>
              </div>
            </div>
          )}

          {/* No data fallback */}
          {!hasExams && totalTasks === 0 && (
            <p className="text-sm text-muted-foreground">No exams or tasks recorded yet.</p>
          )}

          {/* Swipe hint */}
          <p className="text-xs text-muted-foreground/50 select-none">Swipe left → to return</p>
        </div>
      </GlassCard>
    </motion.div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export function Progress() {
  const { subjects, checklist } = useStudyData();
  const stats = useSubjectStats(subjects, checklist);

  // Track which subjects are in "detail" view (swipe left-to-right reveals detail)
  const [detailSet, setDetailSet] = useState<Set<string>>(new Set());
  const showDetail  = (id: string) => setDetailSet(s => new Set([...s, id]));
  const hideDetail  = (id: string) => setDetailSet(s => { const n = new Set(s); n.delete(id); return n; });

  // ── Overall GPA ────────────────────────────────────────────────────────────
  let totalWG = 0, totalW = 0;
  subjects.forEach(sub =>
    sub.exams.forEach(e => {
      if (e.grade) {
        const g = parseFloat(e.grade);
        if (!isNaN(g)) { totalWG += g * (e.weight || 1); totalW += e.weight || 1; }
      }
    })
  );
  const overallAvg = totalW > 0 ? (totalWG / totalW).toFixed(1) : null;

  // ── Summary counts ─────────────────────────────────────────────────────────
  const strongCount  = stats.filter(s => s.strength === "strong").length;
  const weakCount    = stats.filter(s => s.strength === "weak").length;

  return (
    <div className="space-y-8 pb-20">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold tracking-tight mb-1">Progress</h1>
        <p className="text-muted-foreground text-lg">Academic overview</p>
      </div>

      {/* Overall average */}
      <GlassCard className="p-8 flex items-center justify-between bg-gradient-to-br from-primary/10 to-transparent">
        <div>
          <h2 className="text-xl font-semibold mb-1">Overall Average</h2>
          <p className="text-muted-foreground text-sm">Weighted across all graded exams</p>
          {/* Strong / weak summary */}
          {(strongCount > 0 || weakCount > 0) && (
            <div className="flex gap-3 mt-3">
              {strongCount > 0 && (
                <span className="inline-flex items-center gap-1.5 text-xs font-bold bg-emerald-500/15 text-emerald-500 px-2.5 py-1 rounded-full">
                  <TrendingUp className="w-3 h-3" /> {strongCount} strong
                </span>
              )}
              {weakCount > 0 && (
                <span className="inline-flex items-center gap-1.5 text-xs font-bold bg-rose-500/15 text-rose-500 px-2.5 py-1 rounded-full">
                  <TrendingDown className="w-3 h-3" /> {weakCount} need work
                </span>
              )}
            </div>
          )}
        </div>
        <div className="text-5xl font-black text-primary">
          {overallAvg !== null ? `${overallAvg}%` : "—"}
        </div>
      </GlassCard>

      {/* Per-subject cards */}
      <div className="space-y-4">
        {subjects.length === 0 && (
          <GlassCard className="p-12 text-center border-dashed border-2 bg-transparent text-muted-foreground">
            Add subjects to see your progress here.
          </GlassCard>
        )}

        {stats.map(s => (
          <div key={s.subject.id} className="overflow-hidden">
            <AnimatePresence mode="wait" initial={false}>
              {detailSet.has(s.subject.id) ? (
                <SubjectDetail
                  key="detail"
                  stats={s}
                  onSwipeRight={() => hideDetail(s.subject.id)}
                />
              ) : (
                <SubjectOverview
                  key="overview"
                  stats={s}
                  onSwipeLeft={() => showDetail(s.subject.id)}
                />
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>
    </div>
  );
}
