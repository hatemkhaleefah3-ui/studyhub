import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { useLocation, useRoute, useSearch } from "wouter";
import { ArrowLeft, BarChart2, Brain, Calendar, FileQuestion, Pencil, Trash2, Upload } from "lucide-react";
import { useStudyData, type StudyType } from "@/hooks/useStudyData";
import { BottomSheet } from "@/components/shared/BottomSheet";
import { ConfirmSheet } from "@/components/shared/ConfirmSheet";
import { parseFinalExamFiles, type FinalExamImportError } from "@/lib/finalExamImport";

export function ExamEdit() {
  const [, params] = useRoute("/subjects/:subjectId/exams/:examId/edit");
  const [, setLocation] = useLocation();
  const search = useSearch();
  const { subjects, updateExam } = useStudyData();
  const subject = subjects.find(item => item.id === params?.subjectId);
  const exam = subject?.exams.find(item => item.id === params?.examId);
  const from = new URLSearchParams(search).get("from");
  const [questionsOpen, setQuestionsOpen] = useState(false);
  const [confirmRemoveAll, setConfirmRemoveAll] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [errors, setErrors] = useState<FinalExamImportError[]>([]);
  const importRef = useRef<HTMLInputElement>(null);
  const form = useForm({ defaultValues: { name: exam?.name ?? "", date: exam?.date ?? "", weight: exam?.weight ?? 1 } });

  if (!subject || !exam) return <div className="p-8 text-center text-muted-foreground">Exam not found</div>;

  const flashKey = `studyhub:final-flashcards:${subject.id}:${exam.type}`;
  const flashcards = JSON.parse(localStorage.getItem(flashKey) ?? "[]");
  const questionCount = exam.questions?.length ?? 0;
  const total = questionCount + flashcards.length;
  const inputCls = "min-w-0 max-w-full w-full rounded-2xl border border-border/60 bg-secondary/40 px-3 py-3.5 text-sm text-foreground outline-none transition-all duration-200 focus:border-primary/40 focus:ring-2 focus:ring-primary/20";
  const goBack = () => from ? setLocation(decodeURIComponent(from)) : window.history.length > 1 ? window.history.back() : setLocation(`/subjects/${subject.id}/lectures?type=${exam.type}`);
  const importFiles = async (files: File[]) => { if (!files.length) return; setIsImporting(true); setErrors([]); try { const parsed = await parseFinalExamFiles(files); if (parsed.questions.length) updateExam(subject.id, exam.id, { questions: [...(exam.questions ?? []), ...parsed.questions] }); if (parsed.flashcards.length) localStorage.setItem(flashKey, JSON.stringify([...flashcards, ...parsed.flashcards])); setErrors(parsed.errors); setQuestionsOpen(false); } finally { setIsImporting(false); } };
  const removeAll = () => { updateExam(subject.id, exam.id, { questions: [], lastScore: null, checked: false }); localStorage.setItem(flashKey, "[]"); setConfirmRemoveAll(false); setQuestionsOpen(false); };
  const onSave = (data: any) => updateExam(subject.id, exam.id, { name: data.name, date: data.date || null, weight: parseFloat(data.weight) || 1 });
  const editPath = `/subjects/${subject.id}/exams/${exam.id}/questions?from=${encodeURIComponent(`${window.location.pathname}${window.location.search}`)}`;

  return <div className="space-y-5 pb-24">
    <div className="relative -mx-4 border-b border-border/30 bg-gradient-to-b from-primary/10 via-primary/5 to-transparent px-4 pb-6 pt-2 md:-mx-6 md:px-6"><div className="flex items-start gap-3"><button onClick={goBack} className="mt-1 flex h-10 w-10 items-center justify-center rounded-full border border-border/50 bg-background/80 shadow-sm"><ArrowLeft className="h-4 w-4" /></button><div className="min-w-0 flex-1 py-1"><p className="mb-1 text-xs font-semibold uppercase tracking-widest text-primary/75">{subject.name} · Exam</p><h1 className="text-2xl font-bold">{exam.name}</h1><p className="mt-2 text-xs text-muted-foreground">{questionCount} MCQs · {flashcards.length} flashcards</p></div></div></div>
    <div className="grid grid-cols-2 gap-3"><button onClick={() => setQuestionsOpen(true)} className="group rounded-2xl border border-primary/20 bg-primary/10 p-4 text-left transition-all duration-200 hover:bg-primary/15"><div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl border border-primary/20 bg-primary/10"><FileQuestion className="h-4 w-4 text-primary" /></div><p className="text-sm font-bold">Questions</p><p className="mt-0.5 text-[11px] text-muted-foreground">{total ? `${total} total items` : "Add exam content"}</p></button><button disabled={!total} onClick={() => setLocation(`/subjects/${subject.id}/exams/${exam.id}/take?from=${encodeURIComponent(from ? decodeURIComponent(from) : `/subjects/${subject.id}/lectures?type=${exam.type}`)}`)} className="group rounded-2xl border border-primary/20 bg-primary/10 p-4 text-left transition-all duration-200 hover:bg-primary/15 disabled:opacity-40"><div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl border border-primary/20 bg-primary/10"><Brain className="h-4 w-4 text-primary" /></div><p className="text-sm font-bold">Take Exam</p><p className="mt-0.5 text-[11px] text-muted-foreground">Start unified session</p></button></div>
    {errors.length > 0 && <div className="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">{errors.map(error => <p key={error.filename}><b>{error.filename}:</b> {error.reason}</p>)}</div>}
    <form onSubmit={form.handleSubmit(onSave)} onBlur={form.handleSubmit(onSave)} className="space-y-3"><div className="space-y-4 rounded-2xl border border-border/50 bg-card p-4 shadow-sm"><label className="block text-xs font-bold uppercase tracking-widest text-muted-foreground">Details</label><input {...form.register("name", { required: true })} className={inputCls} placeholder="Exam name" /><div className="grid min-w-0 grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-3"><div className="min-w-0"><label className="mb-1 block truncate text-xs text-muted-foreground"><Calendar className="mr-1 inline h-3 w-3" />Date</label><input type="date" {...form.register("date")} className={inputCls} /></div><div className="min-w-0"><label className="mb-1 block truncate text-xs text-muted-foreground"><BarChart2 className="mr-1 inline h-3 w-3" />Weight %</label><input type="number" inputMode="decimal" min="0" max="100" {...form.register("weight")} className={inputCls} /></div></div></div></form>
    <div className="rounded-2xl border border-border/50 bg-card p-4 shadow-sm"><label className="mb-3 block text-xs font-bold uppercase tracking-widest text-muted-foreground">Type</label><div className="flex gap-1 rounded-xl bg-secondary/50 p-1">{(["theoretical", "practical"] as StudyType[]).map(type => <button key={type} onClick={() => updateExam(subject.id, exam.id, { type })} className={`flex-1 rounded-xl py-2.5 text-sm font-semibold capitalize transition-all duration-200 ${exam.type === type ? "bg-background shadow-sm" : "text-muted-foreground"}`}>{type}</button>)}</div></div>
    <BottomSheet isOpen={questionsOpen} onClose={() => setQuestionsOpen(false)} title="Questions"><div className="space-y-2.5 pb-2"><button onClick={() => importRef.current?.click()} disabled={isImporting} className="flex w-full items-center gap-4 rounded-2xl border border-border/40 bg-secondary/50 p-4 text-left transition-colors duration-200 hover:bg-secondary disabled:opacity-50"><Upload className="h-5 w-5 text-primary" /><div><p className="font-bold">Add questions</p><p className="text-xs text-muted-foreground">Select multiple MCQ and flashcard Excel files</p></div></button><button onClick={() => setLocation(editPath)} className="flex w-full items-center gap-4 rounded-2xl border border-border/40 bg-secondary/50 p-4 text-left transition-colors duration-200 hover:bg-secondary"><Pencil className="h-5 w-5 text-primary" /><div><p className="font-bold">Edit questions</p><p className="text-xs text-muted-foreground">Manage flashcards and MCQs</p></div></button><button onClick={() => setConfirmRemoveAll(true)} disabled={!total} className="flex w-full items-center gap-4 rounded-2xl border border-destructive/20 bg-destructive/10 p-4 text-left text-destructive transition-colors duration-200 hover:bg-destructive/15 disabled:opacity-40"><Trash2 className="h-5 w-5" /><div><p className="font-bold">Remove all questions</p><p className="text-xs opacity-70">Clear flashcards, MCQs, and Medical Cases</p></div></button></div></BottomSheet>
    <input ref={importRef} type="file" accept=".xlsx,.xls" multiple className="hidden" onChange={event => { importFiles(Array.from(event.target.files ?? [])); event.target.value = ""; }} />
    <ConfirmSheet isOpen={confirmRemoveAll} onClose={() => setConfirmRemoveAll(false)} onConfirm={removeAll} title="Remove all questions?" message="This clears every Final Exam flashcard, MCQ, and Medical Case question while keeping the exam and its settings." confirmLabel="Remove All Questions" />
  </div>;
}
