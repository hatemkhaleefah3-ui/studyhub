import { useState } from "react";
import { useStudyData, StudyType } from "@/hooks/useStudyData";
import { GlassCard } from "@/components/shared/GlassCard";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { motion, AnimatePresence, PanInfo } from "framer-motion";
import { TrendingUp, TrendingDown, ArrowLeft } from "lucide-react";

type TypeFilter = "all" | StudyType;

const STRONG_THRESHOLD = 70;
const SWIPE_THRESHOLD = 80;

// ── Strength badge ─────────────────────────────────────────────────────────

function StrengthBadge({ strong, compact = false }: { strong: boolean; compact?: boolean }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-black uppercase tracking-wide text-white shadow-sm"
      style={{
        background: strong
          ? "linear-gradient(135deg, #10b981, #059669)"
          : "linear-gradient(135deg, #f43f5e, #e11d48)",
      }}
    >
      {strong ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
      {compact ? (strong ? "Strong" : "Weak") : strong ? `Strong ≥${STRONG_THRESHOLD}%` : `Weak <${STRONG_THRESHOLD}%`}
    </span>
  );
}

// ── Per-subject swipeable card ─────────────────────────────────────────────

interface SubjectCardProps {
  subject: any;
  examMatchesFilter: (type: StudyType) => boolean;
}

function SubjectSwipeCard({ subject, examMatchesFilter }: SubjectCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    if (!isExpanded && info.offset.x > SWIPE_THRESHOLD) setIsExpanded(true);
    else if (isExpanded && info.offset.x < -SWIPE_THRESHOLD) setIsExpanded(false);
  };

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
    const totalWG = gradedExams.reduce((s: number, e: any) => s + e.grade * e.weight, 0);
    const totalW = gradedExams.reduce((s: number, e: any) => s + e.weight, 0);
    subjAvg = Math.round(totalWG / totalW);
  }

  const isStrong = hasGrades && subjAvg >= STRONG_THRESHOLD;

  const chartData = gradedExams.map((e: any) => ({
    name: e.name.length > 12 ? e.name.substring(0, 12) + "…" : e.name,
    grade: e.grade,
  }));

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
            /* ── OVERVIEW ─────────────────────────────────────────────── */
            <motion.div
              key="overview"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <div
                className="rounded-2xl overflow-hidden border border-border/60 relative"
                style={{
                  background: `linear-gradient(135deg, hsl(var(--card)) 60%, ${subject.color}08)`,
                }}
              >
                {/* Left accent bar */}
                <div
                  className="absolute left-0 top-0 bottom-0 w-1"
                  style={{ backgroundColor: subject.color }}
                />

                <div className="pl-5 pr-4 py-4 flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-bold truncate mb-2">{subject.name}</h3>
                    {hasGrades ? (
                      <div className="flex items-center flex-wrap gap-2">
                        <span
                          className="text-3xl font-black tabular-nums leading-none"
                          style={{ color: subject.color }}
                        >
                          {subjAvg}%
                        </span>
                        <StrengthBadge strong={isStrong} compact />
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No graded exams yet</p>
                    )}
                  </div>
                  <div className="shrink-0 flex flex-col items-center gap-0.5 opacity-30">
                    <div className="w-1 h-1 rounded-full bg-foreground" />
                    <div className="w-1 h-1 rounded-full bg-foreground" />
                    <div className="w-1 h-1 rounded-full bg-foreground" />
                  </div>
                </div>
              </div>
            </motion.div>
          ) : (
            /* ── DETAIL ────────────────────────────────────────────────── */
            <motion.div
              key="detail"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <div
                className="rounded-2xl overflow-hidden border border-border/60"
                style={{
                  background: `linear-gradient(135deg, hsl(var(--card)) 60%, ${subject.color}08)`,
                }}
              >
                {/* Left accent bar */}
                <div
                  className="absolute left-0 top-0 bottom-0 w-1"
                  style={{ backgroundColor: subject.color }}
                />

                {/* Detail header */}
                <div
                  className="pl-5 pr-4 py-4 flex items-start justify-between gap-3"
                  style={{
                    background: `linear-gradient(90deg, ${subject.color}10, transparent)`,
                    borderBottom: "1px solid hsl(var(--border))",
                  }}
                >
                  <div>
                    <h3 className="text-base font-bold mb-1">{subject.name}</h3>
                    <div className="flex items-center flex-wrap gap-2">
                      {hasGrades && (
                        <span
                          className="text-2xl font-black tabular-nums"
                          style={{ color: subject.color }}
                        >
                          {subjAvg}%
                        </span>
                      )}
                      {hasGrades && <StrengthBadge strong={isStrong} />}
                    </div>
                  </div>
                  <button
                    onClick={() => setIsExpanded(false)}
                    className="p-1.5 rounded-lg bg-secondary/60 hover:bg-secondary transition-colors shrink-0 mt-0.5"
                    title="Back"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                </div>

                <div className="pl-5 pr-4 py-4 space-y-4">
                  {/* Stats row */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-secondary/40 rounded-xl p-3 text-center">
                      <p className="text-2xl font-black">{subject.exams.length}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 font-medium">Total exams</p>
                    </div>
                    <div className="bg-secondary/40 rounded-xl p-3 text-center">
                      <p className="text-2xl font-black">{gradedExams.length}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 font-medium">Graded</p>
                    </div>
                  </div>

                  {/* Exam list with mini progress bars */}
                  {gradedExams.length > 0 && (
                    <div className="space-y-3">
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                        Graded Exams
                      </p>
                      {gradedExams.map((exam: any, i: number) => (
                        <div key={i} className="space-y-1">
                          <div className="flex items-center justify-between text-sm">
                            <span className="font-medium truncate pr-3">{exam.name}</span>
                            <span
                              className={`font-black shrink-0 tabular-nums text-xs ${
                                exam.grade >= STRONG_THRESHOLD
                                  ? "text-emerald-500"
                                  : "text-rose-500"
                              }`}
                            >
                              {exam.grade}%
                            </span>
                          </div>
                          <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{
                                width: `${exam.grade}%`,
                                backgroundColor:
                                  exam.grade >= STRONG_THRESHOLD ? "#10b981" : "#f43f5e",
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Grade trend chart */}
                  {chartData.length >= 2 && (
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-3">
                        Grade Trend
                      </p>
                      <div className="h-44">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={chartData} margin={{ top: 5, right: 8, left: -28, bottom: 0 }}>
                            <CartesianGrid
                              strokeDasharray="3 3"
                              vertical={false}
                              stroke="hsl(var(--border))"
                            />
                            <XAxis
                              dataKey="name"
                              axisLine={false}
                              tickLine={false}
                              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                              dy={8}
                            />
                            <YAxis
                              domain={[0, 100]}
                              axisLine={false}
                              tickLine={false}
                              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                            />
                            <Tooltip
                              contentStyle={{
                                backgroundColor: "hsl(var(--card))",
                                borderRadius: "12px",
                                border: "1px solid hsl(var(--border))",
                              }}
                              itemStyle={{ color: "hsl(var(--foreground))", fontWeight: "bold" }}
                              formatter={(v: any) => [`${v}%`, "Grade"]}
                            />
                            <Line
                              type="monotone"
                              dataKey="grade"
                              stroke={subject.color}
                              strokeWidth={3}
                              dot={{ r: 4, fill: "hsl(var(--card))", strokeWidth: 2.5, stroke: subject.color }}
                              activeDot={{ r: 6 }}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}

                  {!hasGrades && (
                    <p className="text-sm text-muted-foreground text-center py-3">
                      No graded exams yet.
                    </p>
                  )}

                  <p className="text-[10px] text-muted-foreground text-right opacity-40">
                    ← swipe left to go back
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

// ── Main Progress page ─────────────────────────────────────────────────────

export function Progress() {
  const { subjects } = useStudyData();
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");

  const examMatchesFilter = (type: StudyType) => typeFilter === "all" || type === typeFilter;

  // Overall weighted average
  let totalWG = 0, totalW = 0;
  subjects.forEach(s =>
    s.exams.forEach((e: any) => {
      if (e.grade && examMatchesFilter(e.type)) {
        const g = parseFloat(e.grade);
        if (!isNaN(g)) { totalWG += g * (e.weight || 1); totalW += (e.weight || 1); }
      }
    })
  );
  const overallAvg = totalW > 0 ? (totalWG / totalW).toFixed(1) : null;
  const isOverallStrong = overallAvg !== null && parseFloat(overallAvg) >= STRONG_THRESHOLD;

  // Per-subject average helper
  const getAvg = (s: any) => {
    const graded = s.exams.filter((e: any) => e.grade && examMatchesFilter(e.type));
    if (!graded.length) return null;
    const tWG = graded.reduce((acc: number, e: any) => { const g = parseFloat(e.grade); return isNaN(g) ? acc : acc + g * (e.weight || 1); }, 0);
    const tW = graded.reduce((acc: number, e: any) => acc + (e.weight || 1), 0);
    return Math.round(tWG / tW);
  };

  const gradedSubjects = subjects.filter(s => getAvg(s) !== null);
  const strongCount = gradedSubjects.filter(s => (getAvg(s) ?? 0) >= STRONG_THRESHOLD).length;
  const weakCount = gradedSubjects.filter(s => (getAvg(s) ?? 0) < STRONG_THRESHOLD).length;

  const filterOptions: { value: TypeFilter; label: string }[] = [
    { value: "all", label: "All" },
    { value: "theoretical", label: "Theoretical" },
    { value: "practical", label: "Practical" },
  ];

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold tracking-tight mb-1">Progress</h1>
          <p className="text-muted-foreground text-sm">
            Academic overview · ≥{STRONG_THRESHOLD}% = strong
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

      {/* Overall average */}
      <div
        className="rounded-2xl p-6 flex items-center justify-between border border-border/60 overflow-hidden relative"
        style={{
          background: overallAvg
            ? `linear-gradient(135deg, hsl(var(--card)), ${isOverallStrong ? "#10b98112" : "#f43f5e12"})`
            : "hsl(var(--card))",
        }}
      >
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-1">
            Overall Average
          </p>
          <p className="text-lg font-bold mb-2">Weighted across all graded exams</p>
          {overallAvg !== null && (
            <StrengthBadge strong={isOverallStrong} />
          )}
        </div>
        <div
          className="text-5xl font-black tabular-nums"
          style={{ color: overallAvg ? (isOverallStrong ? "#10b981" : "#f43f5e") : "hsl(var(--muted-foreground))" }}
        >
          {overallAvg !== null ? `${overallAvg}%` : "—"}
        </div>
      </div>

      {/* Summary stats */}
      {subjects.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <GlassCard className="p-4 text-center">
            <p className="text-2xl font-black">{subjects.length}</p>
            <p className="text-xs text-muted-foreground mt-0.5 font-semibold">Subjects</p>
          </GlassCard>
          <div className="rounded-2xl p-4 text-center border border-emerald-500/20 bg-emerald-500/5">
            <p className="text-2xl font-black text-emerald-500">{strongCount}</p>
            <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5 font-semibold">Strong</p>
          </div>
          <div className="rounded-2xl p-4 text-center border border-rose-500/20 bg-rose-500/5">
            <p className="text-2xl font-black text-rose-500">{weakCount}</p>
            <p className="text-xs text-rose-600 dark:text-rose-400 mt-0.5 font-semibold">Weak</p>
          </div>
        </div>
      )}

      {/* Subject cards */}
      <div className="space-y-3">
        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
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
            />
          ))
        )}
      </div>
    </div>
  );
}
