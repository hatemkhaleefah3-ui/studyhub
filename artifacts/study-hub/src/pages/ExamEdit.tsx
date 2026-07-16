import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { Link, useRoute, useLocation } from "wouter";
import {
  ArrowLeft, Trash2, FileQuestion, Calendar, BarChart2, Upload, Brain,
} from "lucide-react";
import { useStudyData, StudyType } from "@/hooks/useStudyData";
import { BottomSheet } from "@/components/shared/BottomSheet";
import { ConfirmSheet } from "@/components/shared/ConfirmSheet";
import { parseExamExcel } from "@/lib/excelImport";

export function ExamEdit() {
  const [, params] = useRoute("/subjects/:subjectId/exams/:examId/edit");
  const [, setLocation] = useLocation();
  const { subjects, updateExam, deleteExam } = useStudyData();

  const subject = subjects.find(s => s.id === params?.subjectId);
  const exam = subject?.exams.find(e => e.id === params?.examId);

  const [isDeleting, setIsDeleting] = useState(false);
  const [mcqsOpen, setMcqsOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  const addMoreRef = useRef<HTMLInputElement>(null);
  const replaceAllRef = useRef<HTMLInputElement>(null);

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

  const handleMcqImport = async (
    e: React.ChangeEvent<HTMLInputElement>,
    mode: "append" | "replace",
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportError(null);
    setIsImporting(true);
    setMcqsOpen(false);
    try {
      const parsed = await parseExamExcel(file);
      const existing = mode === "append" ? (exam.questions ?? []) : [];
      updateExam(subject.id, exam.id, { questions: [...existing, ...parsed] });
    } catch {
      setImportError("Could not parse the file. Make sure it's a valid Excel with the correct columns.");
    } finally {
      setIsImporting(false);
      if (e.target) e.target.value = "";
    }
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
            href={`/subjects/${subject.id}?tab=exams&type=${exam.type}`}
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

      {/* ── Quick actions ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <button
          onClick={() => { setImportError(null); setMcqsOpen(true); }}
          className="group relative overflow-hidden rounded-2xl p-4 bg-rose-500/10 hover:bg-rose-500/15 border border-rose-500/20 hover:border-rose-500/35 transition-all text-left"
        >
          <div className="w-9 h-9 rounded-xl bg-rose-500/15 border border-rose-500/20 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
            <FileQuestion className="w-4.5 h-4.5 text-rose-600 dark:text-rose-400" />
          </div>
          <p className="font-bold text-sm text-foreground">MCQs</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {questionCount > 0 ? `${questionCount} questions` : "Import · Add"}
          </p>
        </button>

        <button
          onClick={() => setLocation(`/subjects/${subject.id}/exams/${exam.id}/take`)}
          className="group relative overflow-hidden rounded-2xl p-4 bg-emerald-500/10 hover:bg-emerald-500/15 border border-emerald-500/20 hover:border-emerald-500/35 transition-all text-left"
        >
          <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
            <Brain className="w-4.5 h-4.5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <p className="font-bold text-sm text-foreground">Take Exam</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">Start a practice session</p>
        </button>
      </div>

      {/* ── Stats strip ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-2.5 mb-5">
        <div className="bg-card border border-border/50 rounded-2xl p-3 text-center shadow-sm">
          <p className="text-xl font-bold text-foreground">{questionCount}</p>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mt-0.5">Questions</p>
        </div>
        <div className="bg-card border border-border/50 rounded-2xl p-3 text-center shadow-sm">
          <p className="text-xl font-bold text-foreground">{exam.weight ?? 1}%</p>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mt-0.5">Weight</p>
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

      {/* ── Delete ───────────────────────────────────────────────────── */}
      <button
        type="button"
        onClick={() => setIsDeleting(true)}
        className="w-full flex items-center justify-center gap-2 rounded-2xl py-3.5 font-semibold text-destructive/80 hover:text-destructive bg-destructive/6 hover:bg-destructive/12 border border-destructive/15 hover:border-destructive/30 transition-all"
      >
        <Trash2 className="w-4 h-4" /> Delete Exam
      </button>

      {/* ── MCQs bottom sheet ─────────────────────────────────────────── */}
      <BottomSheet isOpen={mcqsOpen} onClose={() => setMcqsOpen(false)} title="MCQs">
        <div className="space-y-2.5 pb-2">

          {/* 1 — Add more MCQs (append from Excel) */}
          <button
            onClick={() => addMoreRef.current?.click()}
            disabled={isImporting}
            className="w-full flex items-center gap-4 rounded-2xl p-4 bg-secondary/50 hover:bg-secondary transition-colors text-left border border-border/40 hover:border-border/60 disabled:opacity-50"
          >
            <div className="w-11 h-11 rounded-xl bg-rose-500/12 border border-rose-500/20 flex items-center justify-center shrink-0">
              <Upload className="w-5 h-5 text-rose-600 dark:text-rose-400" />
            </div>
            <div>
              <p className="font-bold text-sm text-foreground">Add more MCQs</p>
              <p className="text-xs text-muted-foreground mt-0.5">Import from Excel · keeps existing questions</p>
            </div>
          </button>

          {/* 2 — Replace all MCQs (replace from Excel) */}
          <button
            onClick={() => replaceAllRef.current?.click()}
            disabled={isImporting}
            className="w-full flex items-center gap-4 rounded-2xl p-4 bg-secondary/50 hover:bg-secondary transition-colors text-left border border-border/40 hover:border-border/60 disabled:opacity-50"
          >
            <div className="w-11 h-11 rounded-xl bg-sky-500/12 border border-sky-500/20 flex items-center justify-center shrink-0">
              <Upload className="w-5 h-5 text-sky-600 dark:text-sky-400" />
            </div>
            <div>
              <p className="font-bold text-sm text-foreground">Replace all MCQs</p>
              <p className="text-xs text-muted-foreground mt-0.5">Import from Excel · replaces all existing questions</p>
            </div>
          </button>

          {importError && (
            <p className="text-sm text-destructive font-medium bg-destructive/10 border border-destructive/20 rounded-xl px-3 py-2">
              {importError}
            </p>
          )}
        </div>
      </BottomSheet>

      {/* Hidden file inputs */}
      <input
        ref={addMoreRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        className="hidden"
        onChange={e => handleMcqImport(e, "append")}
      />
      <input
        ref={replaceAllRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        className="hidden"
        onChange={e => handleMcqImport(e, "replace")}
      />

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
