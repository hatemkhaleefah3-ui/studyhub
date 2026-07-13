import { useState } from "react";
import { useStudyData, StudyType } from "@/hooks/useStudyData";
import { GlassCard } from "@/components/shared/GlassCard";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { motion, AnimatePresence, PanInfo } from "framer-motion";
import { TrendingUp, TrendingDown, ArrowLeft } from "lucide-react";

type TypeFilter = "all" | StudyType;

/**
 * Threshold for strong/weak subject classification.
 * ≥70% weighted average = Strong; below = Weak.
 * Only subjects with at least one graded exam receive a label.
 */
const STRONG_THRESHOLD = 70;
const SWIPE_THRESHOLD = 80;

// ── Per-subject swipeable card ─────────────────────────────────────────────

interface SubjectCardProps {
  subject: any;
  examMatchesFilter: (type: StudyType) => boolean;
  checklist: any[];
}

function SubjectSwipeCard({ subject, examMatchesFilter, checklist }: SubjectCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    if (!isExpanded && info.offset.x > SWIPE_THRESHOLD) setIsExpanded(true);
    else if (isExpanded && info.offset.x < -SWIPE_THRESHOLD) setIsExpanded(false);
  };

  // Compute graded exams for this subject (respects the type filter)
  const gradedExams = subject.exams
    .filter((e: any) => e.grade && examMatchesFilter(e.type))
    .map((e: any) => ({
      name: e.name,
      grade: parseFloat(e.grade),
      weight: e.weight || 1,
    }))
    .filter((e: any) => !isNaN(e.grade));

  const hasGrades = gradedExams.length > 0;

  let subjAvg = 0;
  if (hasGrades) {
    const totalWGrade = gradedExams.reduce((s: number, e: any) => s + e.grade * e.weight, 0);
    const totalWeight = gradedExams.reduce((s: number, e: any) => s + e.weight, 0);
    subjAvg = Math.round(totalWGrade / totalWeight);
  }

  const isStrong = hasGrades && subjAvg >= STRONG_THRESHOLD;
  const isWeak = hasGrades && !isStrong;

  // Task completion rate for this subject (read-only — no writes)
  const subjectTasks = checklist.filter((t: any) => t.subjectId === subject.id);
  const completionRate =
    subjectTasks.length > 0
      ? Math.round((subjectTasks.filter((t: any) => t.done).length / subjectTasks.length) * 100)
      : null;

  // Chart data (minimum 2 exams to show chart)
  const chartData = gradedExams.map((e: any, i: number) => ({
    name: e.name.length > 12 ? e.name.substring(0, 12) + "…" : e.name,
    grade: e.grade,
    index: i + 1,
  }));

  const strengthBadge = (compact = false) =>
    hasGrades ? (
      <span
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${
          isStrong
            ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
            : "bg-rose-500/15 text-rose-600 dark:text-rose-400"
        }`}
      >
        {isStrong ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
        {compact ? (isStrong ? "Strong" : "Weak") : isStrong ? `Strong (≥${STRONG_THRESHOLD}%)` : `Weak (<${STRONG_THRESHOLD}%)`}
      </span>
    ) : null;

  return (
    <div className="relative overflow-hidden rounded-2xl">
      <motion.div
        drag="x"
        dragElastic={0.14}
        dragConstraints={{ left: 0, right: 0 }}
        onDragEnd={handleDragEnd}
        style={{ touchAction: "pan-y" }}
      >
        <AnimatePresence mode="wait" initial={false}>
          {!isExpanded ? (
            /* ── OVERVIEW ──────────────────────────────────────────── */
            <motion.div
              key="overview"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <GlassCard className="p-5 overflow-hidden relative">
                <div
                  className="absolute top-0 left-0 w-1.5 h-full rounded-l-2xl"
                  style={{ backgroundColor: subject.color }}
                />
                <div className="pl-4 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-bold truncate mb-1">{subject.name}</h3>
                    {hasGrades ? (
                      <div className="flex items-center flex-wrap gap-2">
                        <p className="text-2xl font-black" style={{ color: subject.color }}>
                          {subjAvg}%
                        </p>
                        {strengthBadge(true)}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No graded exams yet</p>
                    )}
                    {completionRate !== null && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {completionRate}% tasks done
                      </p>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground opacity-50 shrink-0">swipe →</p>
                </div>
              </GlassCard>
            </motion.div>
          ) : (
            /* ── DETAIL ────────────────────────────────────────────── */
            <motion.div
              key="detail"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <GlassCard className="p-5 overflow-hidden relative">
                <div
                  className="absolute top-0 left-0 w-1.5 h-full rounded-l-2xl"
                  style={{ backgroundColor: subject.color }}
                />
                <div className="pl-4 space-y-4">
                  {/* Detail header */}
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-bold">{subject.name}</h3>
                      <div className="flex items-center flex-wrap gap-2 mt-1">
                        {hasGrades && (
                          <p className="text-2xl font-black" style={{ color: subject.color }}>
                            {subjAvg}%
                          </p>
                        )}
                        {strengthBadge(false)}
                      </div>
                    </div>
                    <button
                      onClick={() => setIsExpanded(false)}
                      className="p-1.5 rounded-lg bg-secondary/60 hover:bg-secondary transition-colors shrink-0"
                      title="Back to overview"
                    >
                      <ArrowLeft className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Stats grid */}
                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-secondary/40 rounded-xl p-3 text-center">
                      <p className="text-xl font-black">{subject.exams.length}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Exams</p>
                    </div>
                    <div className="bg-secondary/40 rounded-xl p-3 text-center">
                      <p className="text-xl font-black">{gradedExams.length}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Graded</p>
                    </div>
                    <div className="bg-secondary/40 rounded-xl p-3 text-center">
                      <p className="text-xl font-black">
                        {completionRate !== null ? `${completionRate}%` : "—"}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">Tasks done</p>
                    </div>
                  </div>

                  {/* Graded exam list */}
                  {gradedExams.length > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Graded Exams
                      </p>
                      {gradedExams.map((exam: any, i: number) => (
                        <div
                          key={i}
                          className="flex items-center justify-between text-sm bg-secondary/40 px-3 py-2.5 rounded-lg"
                        >
                          <span className="font-medium truncate pr-4">{exam.name}</span>
                          <span
                            className={`font-bold shrink-0 ${
                              exam.grade >= STRONG_THRESHOLD
                                ? "text-emerald-600 dark:text-emerald-400"
                                : "text-rose-600 dark:text-rose-400"
                            }`}
                          >
                            {exam.grade}%
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Grade trend chart */}
                  {chartData.length >= 2 && (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                        Grade Trend
                      </p>
                      <div className="h-48">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={chartData} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
                            <CartesianGrid
                              strokeDasharray="3 3"
                              vertical={false}
                              stroke="hsl(var(--border))"
                            />
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
                            />
                            <Tooltip
                              contentStyle={{
                                backgroundColor: "hsl(var(--card))",
                                borderRadius: "10px",
                                border: "1px solid hsl(var(--border))",
                                backdropFilter: "blur(16px)",
                              }}
                              itemStyle={{ color: "hsl(var(--foreground))", fontWeight: "bold" }}
                              formatter={(v: any) => [`${v}%`, "Grade"]}
                            />
                            <Line
                              type="monotone"
                              dataKey="grade"
                              stroke={subject.color}
                              strokeWidth={3}
                              dot={{ r: 5, fill: "hsl(var(--card))", strokeWidth: 2, stroke: subject.color }}
                              activeDot={{ r: 7 }}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}

                  {!hasGrades && (
                    <p className="text-sm text-muted-foreground text-center py-2">
                      No graded exams yet.
                    </p>
                  )}

                  <p className="text-xs text-muted-foreground text-right opacity-50">
                    ← swipe left to go back
                  </p>
                </div>
              </GlassCard>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

// ── Main Progress page ─────────────────────────────────────────────────────

export function Progress() {
  const { subjects, checklist } = useStudyData();
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");

  const examMatchesFilter = (type: StudyType) => typeFilter === "all" || type === typeFilter;

  // Overall weighted average across all graded exams
  let totalWeightedGrade = 0;
  let totalWeight = 0;
  subjects.forEach(subject => {
    subject.exams.forEach((exam: any) => {
      if (exam.grade && examMatchesFilter(exam.type)) {
        const num = parseFloat(exam.grade);
        if (!isNaN(num)) {
          const w = exam.weight || 1;
          totalWeightedGrade += num * w;
          totalWeight += w;
        }
      }
    });
  });
  const overallAvg = totalWeight > 0 ? (totalWeightedGrade / totalWeight).toFixed(1) : null;
  const isOverallStrong = overallAvg !== null && parseFloat(overallAvg) >= STRONG_THRESHOLD;

  // Summary counts
  const getSubjectAvg = (subject: any) => {
    const graded = subject.exams.filter((e: any) => e.grade && examMatchesFilter(e.type));
    if (graded.length === 0) return null;
    const totalWG = graded.reduce((s: number, e: any) => {
      const g = parseFloat(e.grade);
      return isNaN(g) ? s : s + g * (e.weight || 1);
    }, 0);
    const totalW = graded.reduce((s: number, e: any) => s + (e.weight || 1), 0);
    return Math.round(totalWG / totalW);
  };

  const gradedSubjects = subjects.filter(s => getSubjectAvg(s) !== null);
  const strongCount = gradedSubjects.filter(s => (getSubjectAvg(s) ?? 0) >= STRONG_THRESHOLD).length;
  const weakCount = gradedSubjects.filter(s => (getSubjectAvg(s) ?? 0) < STRONG_THRESHOLD).length;

  const filterOptions: { value: TypeFilter; label: string }[] = [
    { value: "all", label: "All" },
    { value: "theoretical", label: "Theoretical" },
    { value: "practical", label: "Practical" },
  ];

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold tracking-tight mb-1">Progress</h1>
          <p className="text-muted-foreground text-sm">
            Academic overview · ≥{STRONG_THRESHOLD}% average = strong
          </p>
        </div>
        <div className="bg-secondary/50 p-1 rounded-xl flex gap-1 w-fit">
          {filterOptions.map(opt => (
            <button
              key={opt.value}
              onClick={() => setTypeFilter(opt.value)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                typeFilter === opt.value
                  ? "bg-background shadow-sm text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Overall average card */}
      <GlassCard className="p-6 flex items-center justify-between bg-gradient-to-br from-primary/10 to-transparent">
        <div>
          <h2 className="text-xl font-semibold mb-1">Overall Average</h2>
          <p className="text-muted-foreground text-sm">Weighted across all graded exams</p>
          {overallAvg !== null && (
            <p
              className={`text-sm font-semibold mt-2 flex items-center gap-1 ${
                isOverallStrong
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-rose-600 dark:text-rose-400"
              }`}
            >
              {isOverallStrong ? (
                <TrendingUp className="w-4 h-4" />
              ) : (
                <TrendingDown className="w-4 h-4" />
              )}
              Overall {isOverallStrong ? "Strong" : "Weak"}
            </p>
          )}
        </div>
        <div className="text-5xl font-black text-primary">
          {overallAvg !== null ? `${overallAvg}%` : "—"}
        </div>
      </GlassCard>

      {/* Summary stats */}
      {subjects.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <GlassCard className="p-4 text-center">
            <p className="text-2xl font-black">{subjects.length}</p>
            <p className="text-xs text-muted-foreground mt-0.5 font-medium">Subjects</p>
          </GlassCard>
          <GlassCard className="p-4 text-center">
            <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{strongCount}</p>
            <p className="text-xs text-muted-foreground mt-0.5 font-medium">Strong</p>
          </GlassCard>
          <GlassCard className="p-4 text-center">
            <p className="text-2xl font-black text-rose-600 dark:text-rose-400">{weakCount}</p>
            <p className="text-xs text-muted-foreground mt-0.5 font-medium">Weak</p>
          </GlassCard>
        </div>
      )}

      {/* Subject cards */}
      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Subjects — swipe right on a card for detail view
        </p>
        {subjects.length === 0 ? (
          <GlassCard className="p-10 text-center text-muted-foreground border-dashed border-2 bg-transparent">
            <p className="font-medium">No subjects yet</p>
          </GlassCard>
        ) : (
          subjects.map(subject => (
            <SubjectSwipeCard
              key={subject.id}
              subject={subject}
              examMatchesFilter={examMatchesFilter}
              checklist={checklist}
            />
          ))
        )}
      </div>
    </div>
  );
}
