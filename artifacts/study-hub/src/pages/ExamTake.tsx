import { useState } from "react";
import { Link, useRoute, useLocation } from "wouter";
import { ArrowLeft, CheckCircle2, XCircle, RotateCcw } from "lucide-react";
import { useStudyData } from "@/hooks/useStudyData";
import { GlassCard } from "@/components/shared/GlassCard";
import { getScoreBand } from "@/hooks/useStudyData";

/**
 * Exam-taking flow: renders MCQ and Medical Case MCQ questions, lets the
 * user pick one answer per question, then scores the attempt on submit.
 * >=70% checks the exam and cascade-checks any same-type linked lectures
 * (handled inside submitExamAttempt).
 */
export function ExamTake() {
  const [, params] = useRoute("/subjects/:subjectId/exams/:examId/take");
  const [, setLocation] = useLocation();
  const { subjects, submitExamAttempt } = useStudyData();

  const subject = subjects.find(s => s.id === params?.subjectId);
  const exam = subject?.exams.find(e => e.id === params?.examId);

  const questions = exam?.questions || [];
  const [answers, setAnswers] = useState<number[]>(Array(questions.length).fill(0));
  const [result, setResult] = useState<{ correct: number; total: number; percentage: number } | null>(null);

  if (!subject || !exam) {
    return <div className="p-8 text-center text-muted-foreground">Exam not found</div>;
  }

  const accentColor = subject.color;

  if (questions.length === 0) {
    return (
      <div className="space-y-6 pb-20">
        <div className="flex items-center gap-3">
          <Link href={`/subjects/${subject.id}`} className="p-2 rounded-full bg-secondary hover:bg-secondary/80 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-2xl font-bold" style={{ color: accentColor }}>{exam.name}</h1>
        </div>
        <GlassCard className="p-10 text-center text-muted-foreground border-dashed border-2 bg-transparent">
          <p className="font-medium">No questions yet</p>
          <p className="text-sm mt-1 opacity-70">Import questions from the exam's edit page first.</p>
          <button
            onClick={() => setLocation(`/subjects/${subject.id}/exams/${exam.id}/edit`)}
            className="mt-4 text-white font-semibold rounded-xl px-5 py-2.5"
            style={{ backgroundColor: accentColor }}
          >
            Go to Edit
          </button>
        </GlassCard>
      </div>
    );
  }

  const setAnswer = (qIndex: number, choice: number) => {
    setAnswers(prev => prev.map((a, i) => (i === qIndex ? choice : a)));
  };

  const handleSubmit = () => {
    const score = submitExamAttempt(subject.id, exam.id, answers);
    setResult(score);
  };

  const retake = () => {
    setAnswers(Array(questions.length).fill(0));
    setResult(null);
  };

  if (result) {
    const band = getScoreBand(result.percentage);
    return (
      <div className="space-y-6 pb-20">
        <div className="flex items-center gap-3">
          <Link href={`/subjects/${subject.id}`} className="p-2 rounded-full bg-secondary hover:bg-secondary/80 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-2xl font-bold" style={{ color: accentColor }}>Results</h1>
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
            <p className="text-muted-foreground mt-1">
              {result.correct} / {result.total} correct
            </p>
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
              className="flex-1 rounded-xl py-3 font-semibold text-white"
              style={{ backgroundColor: accentColor }}
            >
              Done
            </button>
          </div>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center gap-3">
        <Link href={`/subjects/${subject.id}`} className="p-2 rounded-full bg-secondary hover:bg-secondary/80 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold truncate" style={{ color: accentColor }}>{exam.name}</h1>
          <p className="text-sm text-muted-foreground">{questions.length} questions</p>
        </div>
      </div>

      <div className="space-y-4">
        {questions.map((q, i) => (
          <GlassCard key={q.id} className="p-5 space-y-3">
            <div className="flex items-start gap-2">
              <span
                className="px-2 py-0.5 rounded-md text-xs font-bold text-white shrink-0 mt-0.5"
                style={{ backgroundColor: accentColor }}
              >
                Q{i + 1}
              </span>
              <div className="flex-1">
                <p className="font-medium">{q.text}</p>
                {q.questionType === "Medical Case MCQ" && (q.labs || q.histo) && (
                  <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                    {q.labs && <p><span className="font-semibold">Labs:</span> {q.labs}</p>}
                    {q.histo && <p><span className="font-semibold">Histo:</span> {q.histo}</p>}
                  </div>
                )}
              </div>
            </div>
            <div className="space-y-2">
              {q.choices.map((choice, cIdx) => {
                const choiceNum = cIdx + 1;
                const selected = answers[i] === choiceNum;
                return (
                  <button
                    key={cIdx}
                    onClick={() => setAnswer(i, choiceNum)}
                    className={`w-full text-left px-4 py-3 rounded-xl border transition-all text-sm ${
                      selected ? "border-transparent text-white" : "border-border hover:bg-secondary/50"
                    }`}
                    style={selected ? { backgroundColor: accentColor } : {}}
                  >
                    {choice}
                  </button>
                );
              })}
            </div>
          </GlassCard>
        ))}
      </div>

      <button
        onClick={handleSubmit}
        disabled={answers.some(a => a === 0)}
        className="w-full flex items-center justify-center gap-2 text-white font-semibold rounded-2xl py-4 transition-opacity hover:opacity-90 disabled:opacity-40"
        style={{ backgroundColor: accentColor }}
      >
        <CheckCircle2 className="w-5 h-5" /> Submit Exam
      </button>
    </div>
  );
}
