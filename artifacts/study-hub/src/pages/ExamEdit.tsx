import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useLocation, useRoute } from "wouter";
import { ArrowLeft, BarChart2, Brain, Calendar, FileQuestion, Upload, XCircle } from "lucide-react";
import { useStudyData, StudyType } from "@/hooks/useStudyData";
import { BottomSheet } from "@/components/shared/BottomSheet";
import { ConfirmSheet } from "@/components/shared/ConfirmSheet";
import { parseExamExcel } from "@/lib/excelImport";

export function ExamEdit() {
  const [, params] = useRoute("/subjects/:subjectId/exams/:examId/edit");
  const [, setLocation] = useLocation();
  const { subjects, updateExam } = useStudyData();
  const subject = subjects.find((item) => item.id === params?.subjectId);
  const exam = subject?.exams.find((item) => item.id === params?.examId);
  const [confirmRemoveAll, setConfirmRemoveAll] = useState(false);
  const [mcqsOpen, setMcqsOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const addMoreRef = useRef<HTMLInputElement>(null);
  const replaceAllRef = useRef<HTMLInputElement>(null);

  const form = useForm({
    defaultValues: { name: exam?.name ?? "", date: exam?.date ?? "", weight: exam?.weight ?? 1 },
  });

  if (!subject || !exam) return <div className="p-8 text-center text-muted-foreground">Exam not found</div>;

  const questionCount = exam.questions?.length ?? 0;
  const inputCls = "w-full rounded-2xl border border-border/60 bg-secondary/40 px-4 py-3.5 text-sm text-foreground placeholder:text-muted-foreground/50 transition-all focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/40";

  const onSave = (data: any) => {
    updateExam(subject.id, exam.id, {
      name: data.name,
      date: data.date || null,
      weight: parseFloat(data.weight) || 1,
    });
  };

  const setType = (type: StudyType) => updateExam(subject.id, exam.id, { type });

  const handleMcqImport = async (event: React.ChangeEvent<HTMLInputElement>, mode: "append" | "replace") => {
    const file = event.target.files?.[0];
    if (!file) return;
    setImportError(null);
    setIsImporting(true);
    setMcqsOpen(false);
    try {
      const parsed = await parseExamExcel(file);
      const existing = mode === "append" ? (exam.questions ?? []) : [];
      updateExam(subject.id, exam.id, { questions: [...existing, ...parsed] });
    } catch {
      setImportError("Could not parse the file. Make sure it uses the expected Exam spreadsheet columns.");
    } finally {
      setIsImporting(false);
      event.target.value = "";
    }
  };

  const removeAllQuestions = () => {
    updateExam(subject.id, exam.id, { questions: [], lastScore: null, checked: false });
    setConfirmRemoveAll(false);
    setMcqsOpen(false);
  };

  return (
    <div className="space-y-5 pb-24">
      <div className="relative -mx-4 border-b border-border/30 bg-gradient-to-b from-destructive/10 via-destructive/5 to-transparent px-4 pb-6 pt-2 md:-mx-6 md:px-6">
        <div className="flex items-start gap-3">
          <Link href={`/subjects/${subject.id}/lectures?type=${exam.type}`} className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border/50 bg-background/80 shadow-sm transition-colors hover:bg-background">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="min-w-0 flex-1 py-1">
            <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-destructive/75">{subject.name} · Exam</p>
            <h1 className="text-2xl font-bold leading-snug tracking-tight text-foreground">{exam.name}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-border/50 bg-secondary/50 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{exam.type}</span>
              {exam.date && <span className="flex items-center gap-1 text-[11px] font-semibold text-muted-foreground"><Calendar className="h-3 w-3" />{new Date(exam.date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>}
              <span className="flex items-center gap-1 text-[11px] font-semibold text-muted-foreground"><FileQuestion className="h-3 w-3" />{questionCount} questions</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button onClick={() => { setImportError(null); setMcqsOpen(true); }} className="group rounded-2xl border border-destructive/20 bg-destructive/10 p-4 text-left transition-all hover:bg-destructive/15">
          <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl border border-destructive/20 bg-destructive/10"><FileQuestion className="h-4 w-4 text-destructive" /></div>
          <p className="text-sm font-bold text-foreground">MCQs</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">{questionCount ? `${questionCount} questions` : "Import questions"}</p>
        </button>
        <button disabled={!questionCount} onClick={() => setLocation(`/subjects/${subject.id}/exams/${exam.id}/take`)} className="group rounded-2xl border border-primary/20 bg-primary/10 p-4 text-left transition-all hover:bg-primary/15 disabled:cursor-not-allowed disabled:opacity-40">
          <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl border border-primary/20 bg-primary/10"><Brain className="h-4 w-4 text-primary" /></div>
          <p className="text-sm font-bold text-foreground">Take Exam</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">Start a practice session</p>
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        <div className="rounded-2xl border border-border/50 bg-card p-3 text-center shadow-sm"><p className="text-xl font-bold text-foreground">{questionCount}</p><p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Questions</p></div>
        <div className="rounded-2xl border border-border/50 bg-card p-3 text-center shadow-sm"><p className="text-xl font-bold text-foreground">{exam.weight ?? 1}%</p><p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Weight</p></div>
      </div>

      {questionCount === 0 && <div className="rounded-2xl border-2 border-dashed border-border bg-secondary/20 p-8 text-center"><FileQuestion className="mx-auto mb-3 h-7 w-7 text-muted-foreground/50" /><p className="font-semibold text-foreground">No questions attached</p><p className="mt-1 text-sm text-muted-foreground">Open MCQs to import the exam spreadsheet.</p></div>}

      <form onSubmit={form.handleSubmit(onSave)} onBlur={form.handleSubmit(onSave)} className="space-y-3">
        <div className="space-y-4 rounded-2xl border border-border/50 bg-card p-4 shadow-sm">
          <label className="block text-xs font-bold uppercase tracking-widest text-muted-foreground">Details</label>
          <div className="space-y-1.5"><span className="text-xs font-medium text-muted-foreground/80">Name</span><input {...form.register("name", { required: true })} className={inputCls} placeholder="Exam name…" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><span className="flex items-center gap-1 text-xs font-medium text-muted-foreground/80"><Calendar className="h-3 w-3" /> Date</span><input type="date" {...form.register("date")} className={inputCls} /></div>
            <div className="space-y-1.5"><span className="flex items-center gap-1 text-xs font-medium text-muted-foreground/80"><BarChart2 className="h-3 w-3" /> Weight %</span><input type="number" min="0" max="100" {...form.register("weight")} className={inputCls} /></div>
          </div>
        </div>
      </form>

      <div className="rounded-2xl border border-border/50 bg-card p-4 shadow-sm">
        <label className="mb-3 block text-xs font-bold uppercase tracking-widest text-muted-foreground">Type</label>
        <div className="flex gap-1 rounded-xl bg-secondary/50 p-1">{(["theoretical", "practical"] as StudyType[]).map((type) => <button key={type} type="button" onClick={() => setType(type)} className={`flex-1 rounded-xl py-2.5 text-sm font-semibold capitalize transition-all ${exam.type === type ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>{type}</button>)}</div>
      </div>

      <button type="button" onClick={() => setConfirmRemoveAll(true)} disabled={!questionCount} className="flex w-full items-center justify-center gap-2 rounded-2xl border border-destructive/20 bg-destructive/10 py-3.5 font-semibold text-destructive transition-all hover:bg-destructive/15 disabled:cursor-not-allowed disabled:opacity-40"><XCircle className="h-4 w-4" /> Remove All Questions</button>

      <BottomSheet isOpen={mcqsOpen} onClose={() => setMcqsOpen(false)} title="MCQs">
        <div className="space-y-2.5 pb-2">
          <button onClick={() => addMoreRef.current?.click()} disabled={isImporting} className="flex w-full items-center gap-4 rounded-2xl border border-border/40 bg-secondary/50 p-4 text-left transition-colors hover:bg-secondary disabled:opacity-50"><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-destructive/20 bg-destructive/10"><Upload className="h-5 w-5 text-destructive" /></div><div><p className="text-sm font-bold text-foreground">Add more MCQs</p><p className="mt-0.5 text-xs text-muted-foreground">Import from Excel · keeps existing questions</p></div></button>
          <button onClick={() => replaceAllRef.current?.click()} disabled={isImporting} className="flex w-full items-center gap-4 rounded-2xl border border-border/40 bg-secondary/50 p-4 text-left transition-colors hover:bg-secondary disabled:opacity-50"><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10"><Upload className="h-5 w-5 text-primary" /></div><div><p className="text-sm font-bold text-foreground">Replace all MCQs</p><p className="mt-0.5 text-xs text-muted-foreground">Import from Excel · replaces existing questions</p></div></button>
          <button onClick={() => setConfirmRemoveAll(true)} disabled={!questionCount} className="flex w-full items-center gap-4 rounded-2xl border border-destructive/20 bg-destructive/10 p-4 text-left transition-colors hover:bg-destructive/15 disabled:opacity-40"><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-destructive/20 bg-destructive/10"><XCircle className="h-5 w-5 text-destructive" /></div><div><p className="text-sm font-bold text-destructive">Remove All Questions</p><p className="mt-0.5 text-xs text-muted-foreground">Keeps the exam and clears only its question bank</p></div></button>
          {importError && <p className="rounded-xl border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">{importError}</p>}
        </div>
      </BottomSheet>

      <input ref={addMoreRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={(event) => handleMcqImport(event, "append")} />
      <input ref={replaceAllRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={(event) => handleMcqImport(event, "replace")} />

      <ConfirmSheet
        isOpen={confirmRemoveAll}
        onClose={() => setConfirmRemoveAll(false)}
        onConfirm={removeAllQuestions}
        title="Remove all questions?"
        message="This clears the entire question bank and the last score, but keeps the exam title, date, type, weight, and other settings."
        confirmLabel="Remove All Questions"
      />
    </div>
  );
}
