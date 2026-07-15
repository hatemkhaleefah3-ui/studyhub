import { useState } from "react";
import { Link, useRoute, useLocation } from "wouter";
import { ArrowLeft, CheckCircle2, RotateCcw, ChevronLeft, ChevronRight } from "lucide-react";
import { useStudyData } from "@/hooks/useStudyData";
import { GlassCard } from "@/components/shared/GlassCard";
import { getScoreBand } from "@/hooks/useStudyData";
import { motion, AnimatePresence } from "framer-motion";

/**
 * Exam-taking flow: one question at a time with Previous / Next / Submit.
 * The question navigator at the bottom lets the user jump to any question.
 * >=70% checks the exam and cascade-checks any same-type linked lectures.
 */
export function ExamTake() {
  const [, params] = useRoute("/subjects/:subjectId/exams/:examId/take");
  const [, setLocation] = useLocation();
  const { subjects, submitExamAttempt } = useStudyData();

  const subject = subjects.find(s => s.id === params?.subjectId);
  const exam = subject?.exams.find(e => e.id === params?.examId);

  const questions = exam?.questions || [];
  const [answers, setAnswers] = useState<number[]>(Array(questions.length).fill(0));
  const [currentQ, setCurrentQ] = useState(0);
  const [result, setResult] = useState<{ correct: number; total: number; percentage: number } | null>(null);

  if (!subject || !exam) {
    return <div className="p-8 text-center text-muted-foreground">Exam not found</div>;
  }

  // No per-subject color theming anymore

  if (questions.length === 0) {
    return (
      <div className="space-y-6 pb-20">
        <div className="flex items-center gap-3">
          <Link
            href={`/subjects/${subject.id}`}
            className="p-2 rounded-full bg-secondary hover:bg-secondary/80 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-2xl font-bold text-primary">{exam.name}</h1>
        </div>
        <GlassCard className="p-10 text-center text-muted-foreground border-dashed border-2 bg-transparent">
          <p className="font-medium">No questions yet</p>
          <p className="text-sm mt-1 opacity-70">Import questions from the exam's edit page first.</p>
          <button
            onClick={() => setLocation(`/subjects/${subject.id}/exams/${exam.id}/edit`)}
            className="mt-4 text-primary-foreground bg-primary hover:bg-primary/90 transition-colors font-semibold rounded-xl px-5 py-2.5"
          >
            Go to Edit
          </button>
        </GlassCard>
      </div>
    );
  }

  const setAnswer = (choice: number) => {
    setAnswers(prev => prev.map((a, i) => (i === currentQ ? choice : a)));
  };

  const handleSubmit = () => {
    const score = submitExamAttempt(subject.id, exam.id, answers);
    setResult(score);
  };

  const retake = () => {
    setAnswers(Array(questions.length).fill(0));
    setCurrentQ(0);
    setResult(null);
  };

  // ── Results screen ─────────────────────────────────────────────────────────
  if (result) {
    const band = getScoreBand(result.percentage);
    return (
      <div className="space-y-6 pb-20">
        <div className="flex items-center gap-3">
          <Link
            href={`/subjects/${subject.id}`}
            className="p-2 rounded-full bg-secondary hover:bg-secondary/80 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-2xl font-bold text-primary">Results</h1>
        </div>
        <GlassCard className="p-8 text-center space-y-4">
          <div
            className="w-24 h-24 rounded-full mx-auto flex items-center justify-center text-3xl font-bold text-white"
            style={{ backgroundColor: band.color }}
          >
            {result.percentage}%
          </div>
          <div>
            <p className="text-xl font-bold" style={{ color: band.color }}>{band.label}</p>
            <p className="text-muted-foreground mt-1">{result.correct} / {result.total} correct</p>
          </div>
          {result.percentage >= 70 ? (
            <p className="text-sm text-muted-foreground">
              Passed — this exam and its linked lectures are now checked.
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">Below 70% — try again to check this exam.</p>
          )}
          <div className="flex gap-3 pt-2">
            <button
              onClick={retake}
              className="flex-1 flex items-center justify-center gap-2 rounded-xl py-3 font-semibold bg-secondary hover:bg-secondary/80 transition-colors"
            >
              <RotateCcw className="w-4 h-4" /> Retake
            </button>
            <button
              onClick={() => setLocation(`/subjects/${subject.id}`)}
              className="flex-1 rounded-xl py-3 font-semibold text-primary-foreground bg-primary hover:bg-primary/90 transition-colors"
            >
              Done
            </button>
          </div>
        </GlassCard>

        {/* Wrong answers breakdown */}
        {questions.some((_: any, i: number) => answers[i] !== questions[i].correctAnswer) && (
          <div className="space-y-3">
            <h2 className="text-lg font-bold tracking-tight px-1">Review Wrong Answers</h2>
            {questions.map((q: any, i: number) => {
              const userAnswer = answers[i];
              const correct = q.correctAnswer;
              if (userAnswer === correct) return null;
              const label = (n: number) => String.fromCharCode(64 + n);
              return (
                <GlassCard key={i} className="p-4 space-y-3">
                  <div className="flex items-start gap-2">
                    <span className="px-2 py-0.5 rounded-md text-xs font-bold text-primary-foreground bg-primary shrink-0 mt-0.5">
                      Q{i + 1}
                    </span>
                    <p className="font-medium text-sm leading-relaxed">{q.text}</p>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-destructive/10 border border-destructive/20">
                      <span className="text-xs font-bold text-destructive shrink-0 mt-0.5 whitespace-nowrap">✗ Your answer</span>
                      <p className="text-sm text-destructive">{label(userAnswer)}. {q.choices[userAnswer - 1]}</p>
                    </div>
                    <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                      <span className="text-xs font-bold text-emerald-600 shrink-0 mt-0.5 whitespace-nowrap">✓ Correct</span>
                      <p className="text-sm text-emerald-700 dark:text-emerald-400">{label(correct)}. {q.choices[correct - 1]}</p>
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

  // ── Taking the exam ────────────────────────────────────────────────────────
  const isFirst = currentQ === 0;
  const isLast = currentQ === questions.length - 1;
  const allAnswered = answers.every(a => a !== 0);
  const answeredCount = answers.filter(a => a !== 0).length;
  const q = questions[currentQ];
  const progressPct = Math.round(((currentQ + 1) / questions.length) * 100);

  return (
    <div className="space-y-5 pb-20">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href={`/subjects/${subject.id}`}
          className="p-2 rounded-full bg-secondary hover:bg-secondary/80 transition-colors shrink-0"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold truncate text-primary">{exam.name}</h1>
          <p className="text-sm text-muted-foreground">
            Question {currentQ + 1} of {questions.length}
            {answeredCount > 0 && (
              <span className="ml-2 opacity-70">· {answeredCount} answered</span>
            )}
          </p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
        <motion.div
          className="h-full rounded-full bg-primary"
          animate={{ width: `${progressPct}%` }}
          transition={{ duration: 0.3, ease: "easeOut" }}
        />
      </div>

      {/* Question card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentQ}
          initial={{ opacity: 0, x: 32 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -32 }}
          transition={{ duration: 0.18, ease: "easeInOut" }}
        >
          <GlassCard className="p-5 space-y-4">
            <div className="flex items-start gap-2">
              <span
                className="px-2 py-0.5 rounded-md text-xs font-bold text-primary-foreground bg-primary shrink-0 mt-0.5"
              >
                Q{currentQ + 1}
              </span>
              <div className="flex-1">
                <p className="font-medium leading-relaxed">{q.text}</p>
                {q.questionType === "Medical Case MCQ" && (q.labs || q.histo) && (
                  <div className="mt-2 space-y-1 text-sm text-muted-foreground bg-secondary/40 rounded-lg p-3">
                    {q.labs && <p><span className="font-semibold">Labs:</span> {q.labs}</p>}
                    {q.histo && <p><span className="font-semibold">Histo:</span> {q.histo}</p>}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2.5">
              {q.choices.map((choice: string, cIdx: number) => {
                const choiceNum = cIdx + 1;
                const selected = answers[currentQ] === choiceNum;
                const label = String.fromCharCode(65 + cIdx);
                return (
                  <button
                    key={cIdx}
                    onClick={() => setAnswer(choiceNum)}
                    className={`w-full text-left px-4 py-3.5 rounded-xl border-2 transition-all text-sm flex items-center gap-3 ${
                      selected
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border hover:border-border/50 hover:bg-secondary/40"
                    }`}
                  >
                    <span
                      className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-bold shrink-0 ${
                        selected ? "border-white/50 text-white" : "border-border text-muted-foreground"
                      }`}
                    >
                      {label}
                    </span>
                    <span className="flex-1">{choice}</span>
                  </button>
                );
              })}
            </div>
          </GlassCard>
        </motion.div>
      </AnimatePresence>

      {/* Navigation buttons */}
      <div className="flex gap-3">
        <button
          onClick={() => setCurrentQ(q => q - 1)}
          disabled={isFirst}
          className="flex-1 py-4 rounded-2xl font-semibold bg-secondary hover:bg-secondary/80 transition-colors disabled:opacity-30 flex items-center justify-center gap-2 text-sm"
        >
          <ChevronLeft className="w-4 h-4" /> Previous
        </button>
        {isLast ? (
          <button
            onClick={handleSubmit}
            disabled={!allAnswered}
            className="flex-1 py-4 rounded-2xl font-semibold text-primary-foreground bg-primary hover:bg-primary/90 flex items-center justify-center gap-2 text-sm transition-opacity disabled:opacity-40"
          >
            <CheckCircle2 className="w-4 h-4" /> Submit Exam
          </button>
        ) : (
          <button
            onClick={() => setCurrentQ(q => q + 1)}
            className="flex-1 py-4 rounded-2xl font-semibold text-primary-foreground bg-primary hover:bg-primary/90 flex items-center justify-center gap-2 text-sm"
          >
            Next <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Question navigator */}
      <div className="flex gap-1.5 flex-wrap justify-center pt-1">
        {questions.map((_: any, i: number) => {
          const isAnswered = answers[i] !== 0;
          const isCurrent = i === currentQ;
          return (
            <button
              key={i}
              onClick={() => setCurrentQ(i)}
              title={`Q${i + 1}${isAnswered ? " — answered" : " — not answered"}`}
              className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${
                isCurrent
                  ? "bg-primary text-primary-foreground shadow-sm scale-110"
                  : isAnswered
                  ? "bg-secondary text-foreground"
                  : "bg-secondary/40 text-muted-foreground"
              }`}
            >
              {i + 1}
            </button>
          );
        })}
      </div>

      {/* Submit hint */}
      {isLast && !allAnswered && (
        <p className="text-xs text-center text-muted-foreground">
          {answers.filter(a => a === 0).length} question{answers.filter(a => a === 0).length !== 1 ? "s" : ""} still unanswered
        </p>
      )}
    </div>
  );
}
