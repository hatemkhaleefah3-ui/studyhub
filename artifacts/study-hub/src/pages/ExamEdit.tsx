import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useRoute, useLocation } from "wouter";
import {
  ArrowLeft, Trash2, CheckSquare, Square, AlertTriangle,
  FileQuestion, BookOpen, Calendar, BarChart2, Link2,
} from "lucide-react";
import { useStudyData, StudyType } from "@/hooks/useStudyData";
import { GlassCard } from "@/components/shared/GlassCard";
import { ConfirmSheet } from "@/components/shared/ConfirmSheet";

export function ExamEdit() {
  const [, params] = useRoute("/subjects/:subjectId/exams/:examId/edit");
  const [, setLocation] = useLocation();
  const { subjects, updateExam, deleteExam } = useStudyData();

  const subject = subjects.find(s => s.id === params?.subjectId);
  const exam = subject?.exams.find(e => e.id === params?.examId);

  const [isDeleting, setIsDeleting] = useState(false);

  const form = useForm({
    defaultValues: {
      name: exam?.name ?? "",
      date: exam?.date ?? "",
      weight: exam?.weight ?? 1,
    },
  });

  if (!subject || !exam) {
    return <div className="p-8 text-center text-muted-foreground">Exam not found</div>;
  }

  const onSave = (data: any) => {
    updateExam(subject.id, exam.id, {
      name: data.name,
      date: data.date || null,
      weight: parseFloat(data.weight) || 1,
    });
  };

  const setType = (type: StudyType) => {
    updateExam(subject.id, exam.id, { type });
  };

  const sameTypeLectures = subject.lectures.filter(l => l.type === exam.type);
  const linkedIds = new Set(exam.linkedLectureIds || []);
  const mismatchedLinks = (exam.linkedLectureIds || [])
    .map(id => subject.lectures.find(l => l.id === id))
    .filter(l => l && l.type !== exam.type);

  const toggleLink = (lectureId: string) => {
    const next = new Set(linkedIds);
    if (next.has(lectureId)) next.delete(lectureId);
    else next.add(lectureId);
    updateExam(subject.id, exam.id, { linkedLectureIds: Array.from(next) });
  };

  const handleDelete = () => {
    deleteExam(subject.id, exam.id);
    setLocation(`/subjects/${subject.id}?tab=exams`);
  };

  const questionCount = (exam.questions || []).length;

  const inputCls =
    "w-full bg-secondary/40 border border-border/60 rounded-2xl px-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 text-foreground placeholder:text-muted-foreground/50 transition-all text-sm";

  return (
    <div className="pb-24 space-y-0">

      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <div className="relative -mx-4 md:-mx-6 px-4 md:px-6 pt-2 pb-6 mb-6 bg-gradient-to-b from-rose-500/8 via-rose-500/4 to-transparent border-b border-border/30">
        <div className="flex items-start gap-3">
          <Link
            href={`/subjects/${subject.id}?tab=exams`}
            className="mt-1 p-2 rounded-full bg-background/80 hover:bg-background border border-border/50 shadow-sm transition-colors shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="flex-1 min-w-0 py-1">
            <p className="text-xs font-semibold text-rose-600/70 dark:text-rose-400/70 uppercase tracking-widest mb-1">
              {subject.name} · Exam
            </p>
            <h1 className="text-2xl font-bold tracking-tight text-foreground leading-snug">
              {exam.name}
            </h1>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <span className={`text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                exam.type === "theoretical"
                  ? "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20"
                  : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
              }`}>
                {exam.type}
              </span>
              {exam.date && (
                <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {new Date(exam.date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                </span>
              )}
              {questionCount > 0 && (
                <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                  <FileQuestion className="w-3 h-3" />
                  {questionCount} questions
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Stats strip ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-2.5 mb-5">
        <div className="bg-card border border-border/50 rounded-2xl p-3 text-center shadow-sm">
          <p className="text-xl font-bold text-foreground">{questionCount}</p>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mt-0.5">Questions</p>
        </div>
        <div className="bg-card border border-border/50 rounded-2xl p-3 text-center shadow-sm">
          <p className="text-xl font-bold text-foreground">{exam.weight ?? 1}%</p>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mt-0.5">Weight</p>
        </div>
        <div className="bg-card border border-border/50 rounded-2xl p-3 text-center shadow-sm">
          <p className="text-xl font-bold text-foreground">{linkedIds.size}</p>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mt-0.5">Linked</p>
        </div>
      </div>

      {/* ── Details form ──────────────────────────────────────────────── */}
      <form
        onSubmit={form.handleSubmit(onSave)}
        onBlur={form.handleSubmit(onSave)}
        className="space-y-3 mb-5"
      >
        <div className="bg-card border border-border/50 rounded-2xl p-4 shadow-sm space-y-4">
          <label className="block text-xs font-bold uppercase tracking-widest text-muted-foreground">
            Details
          </label>

          {/* Name */}
          <div className="space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground/80">Name</span>
            <input
              {...form.register("name", { required: true })}
              className={inputCls}
              placeholder="Exam name…"
            />
          </div>

          {/* Date + Weight row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <span className="text-xs font-medium text-muted-foreground/80 flex items-center gap-1">
                <Calendar className="w-3 h-3" /> Date
              </span>
              <input
                type="date"
                {...form.register("date")}
                className={inputCls}
              />
            </div>
            <div className="space-y-1.5">
              <span className="text-xs font-medium text-muted-foreground/80 flex items-center gap-1">
                <BarChart2 className="w-3 h-3" /> Weight %
              </span>
              <input
                type="number"
                min="0"
                max="100"
                {...form.register("weight")}
                className={inputCls}
              />
            </div>
          </div>
        </div>
      </form>

      {/* ── Type ─────────────────────────────────────────────────────── */}
      <div className="bg-card border border-border/50 rounded-2xl p-4 shadow-sm mb-5">
        <label className="block text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">
          Type
        </label>
        <div className="bg-secondary/50 p-1 rounded-xl flex gap-1">
          {(["theoretical", "practical"] as StudyType[]).map(t => (
            <button
              key={t}
              type="button"
              onClick={() => setType(t)}
              className={`flex-1 py-2.5 rounded-xl text-sm font-semibold capitalize transition-all ${
                exam.type === t
                  ? "bg-background shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* ── Linked lectures ───────────────────────────────────────────── */}
      <div className="bg-card border border-border/50 rounded-2xl p-4 shadow-sm mb-8">
        <div className="flex items-start justify-between mb-1">
          <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
            Linked Lectures
          </label>
          <span className="text-[11px] font-semibold text-muted-foreground">{exam.type} only</span>
        </div>

        {mismatchedLinks.length > 0 && (
          <div className="flex items-start gap-2 bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 mb-3 text-xs">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <span className="text-amber-700 dark:text-amber-300 font-medium">
              Some linked lectures don't match this exam's type.
            </span>
          </div>
        )}

        {sameTypeLectures.length === 0 ? (
          <div className="flex flex-col items-center py-6 text-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-muted-foreground/50" />
            </div>
            <p className="text-sm text-muted-foreground">
              No {exam.type} lectures yet
            </p>
          </div>
        ) : (
          <div className="space-y-1.5 mt-3">
            {sameTypeLectures.map(lec => {
              const isLinked = linkedIds.has(lec.id);
              return (
                <button
                  key={lec.id}
                  onClick={() => toggleLink(lec.id)}
                  className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl transition-all text-left border ${
                    isLinked
                      ? "bg-primary/6 border-primary/20 hover:bg-primary/10"
                      : "bg-secondary/30 border-transparent hover:bg-secondary/60"
                  }`}
                >
                  <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors ${
                    isLinked
                      ? "bg-primary border-primary"
                      : "border-border/60"
                  }`}>
                    {isLinked && (
                      <svg className="w-3 h-3 text-primary-foreground" fill="none" viewBox="0 0 12 12">
                        <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold truncate transition-colors ${isLinked ? "text-foreground" : "text-muted-foreground"}`}>
                      {lec.name}
                    </p>
                  </div>
                  {lec.link && (
                    <Link2 className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Delete ───────────────────────────────────────────────────── */}
      <button
        type="button"
        onClick={() => setIsDeleting(true)}
        className="w-full flex items-center justify-center gap-2 rounded-2xl py-3.5 font-semibold text-destructive/80 hover:text-destructive bg-destructive/6 hover:bg-destructive/12 border border-destructive/15 hover:border-destructive/30 transition-all"
      >
        <Trash2 className="w-4 h-4" /> Delete Exam
      </button>

      <ConfirmSheet
        isOpen={isDeleting}
        onClose={() => setIsDeleting(false)}
        onConfirm={handleDelete}
        title="Delete exam?"
        message="This exam and its results will be permanently removed."
      />
    </div>
  );
}
