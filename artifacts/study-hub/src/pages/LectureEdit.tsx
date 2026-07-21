import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { useLocation, useRoute } from "wouter";
import {
  ArrowLeft, BookOpen, Brain, ExternalLink, FileQuestion, Layers,
  Link2, Plus, Trash2, Upload, X,
} from "lucide-react";
import { useStudyData, type ExamQuestion, type Flashcard, type StudyType } from "@/hooks/useStudyData";
import { parseExamExcel, parseFlashcardExcel } from "@/lib/excelImport";

export function LectureEdit() {
  const [, params] = useRoute("/subjects/:subjectId/lectures/:lectureId");
  const [, setLocation] = useLocation();
  const {
    subjects, updateLecture, deleteLecture, addExam, updateExam,
  } = useStudyData();

  const subject = subjects.find((s) => s.id === params?.subjectId);
  const lecture = subject?.lectures.find((l) => l.id === params?.lectureId);
  const [sheet, setSheet] = useState<"flashcards" | "mcqs" | null>(null);
  const [notice, setNotice] = useState("");
  const flashcardRef = useRef<HTMLInputElement>(null);
  const mcqRef = useRef<HTMLInputElement>(null);

  const form = useForm({
    values: { name: lecture?.name ?? "", link: lecture?.link ?? "" },
  });

  if (!subject || !lecture) {
    return <div className="p-8 text-center text-muted-foreground">Lecture not found</div>;
  }

  const exam = subject.exams.find((item) => item.linkedLectureIds?.includes(lecture.id));
  const flashcardCount = lecture.flashcards?.length ?? 0;
  const mcqCount = exam?.questions?.length ?? 0;

  const save = (data: { name: string; link: string }) => {
    updateLecture(subject.id, lecture.id, { name: data.name.trim(), link: data.link.trim() });
    setNotice("Lecture details saved.");
  };

  const changeType = (type: StudyType) => {
    updateLecture(subject.id, lecture.id, { type });
    if (exam) updateExam(subject.id, exam.id, { type });
    setNotice(`Moved to ${type}.`);
  };

  const importFlashcards = async (file?: File) => {
    if (!file) return;
    const { rows, skipped } = await parseFlashcardExcel(file);
    const cards: Flashcard[] = rows.map((row) => ({ id: crypto.randomUUID(), front: row.front, back: row.back }));
    updateLecture(subject.id, lecture.id, { flashcards: [...(lecture.flashcards ?? []), ...cards] });
    setNotice(`Added ${cards.length} flashcards${skipped ? `; skipped ${skipped}` : ""}.`);
    setSheet(null);
  };

  const importMcqs = async (file?: File) => {
    if (!file) return;
    const questions: ExamQuestion[] = await parseExamExcel(file);
    if (exam) {
      updateExam(subject.id, exam.id, { questions: [...(exam.questions ?? []), ...questions] });
    } else {
      addExam(subject.id, {
        name: `${lecture.name} MCQs`, link: "", grade: null, date: null, weight: 1,
        type: lecture.type, linkedLectureIds: [lecture.id], questions,
      });
    }
    setNotice(`Added ${questions.length} MCQs.`);
    setSheet(null);
  };

  const removeFlashcards = () => {
    updateLecture(subject.id, lecture.id, { flashcards: [], readerLastPercentage: null });
    setNotice("All flashcards removed.");
    setSheet(null);
  };

  const removeMcqs = () => {
    if (exam) updateExam(subject.id, exam.id, { questions: [], lastScore: null, checked: false });
    setNotice("All MCQs removed.");
    setSheet(null);
  };

  const inputClass = "w-full rounded-2xl border border-border/60 bg-secondary/35 px-4 py-3.5 text-sm outline-none transition focus:border-primary/50 focus:ring-2 focus:ring-primary/20";

  return (
    <div className="space-y-6 pb-24">
      <div className="rounded-[30px] border border-border/60 bg-gradient-to-br from-card via-card to-primary/10 p-5 shadow-xl shadow-black/5">
        <div className="flex items-start gap-3">
          <button onClick={() => setLocation(`/subjects/${subject.id}`)} className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-border/60 bg-background/80">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-primary">Lecture settings</p>
            <h1 className="mt-1 truncate text-3xl font-black tracking-tight">{lecture.name}</h1>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs font-bold capitalize text-primary">{lecture.type}</span>
              <span className="rounded-full border border-border/60 bg-secondary/50 px-3 py-1 text-xs font-bold text-muted-foreground">{mcqCount} MCQs</span>
              <span className="rounded-full border border-border/60 bg-secondary/50 px-3 py-1 text-xs font-bold text-muted-foreground">{flashcardCount} flashcards</span>
            </div>
          </div>
          <div className="grid h-14 w-14 place-items-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
            <BookOpen className="h-7 w-7" />
          </div>
        </div>
      </div>

      {notice && (
        <div className="flex items-center justify-between rounded-2xl border border-primary/20 bg-primary/10 px-4 py-3 text-sm font-semibold">
          <span>{notice}</span><button onClick={() => setNotice("")}><X className="h-4 w-4" /></button>
        </div>
      )}

      <form onSubmit={form.handleSubmit(save)} className="space-y-4">
        <section className="rounded-[26px] border border-border/60 bg-card p-5 shadow-sm">
          <p className="mb-4 text-xs font-black uppercase tracking-[0.18em] text-muted-foreground">Lecture information</p>
          <div className="space-y-4">
            <label className="block space-y-2">
              <span className="text-sm font-bold">Name</span>
              <input {...form.register("name", { required: true })} className={inputClass} />
            </label>
            <label className="block space-y-2">
              <span className="text-sm font-bold">Link</span>
              <div className="relative">
                <Link2 className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input {...form.register("link")} className={`${inputClass} pl-11 pr-11`} placeholder="https://..." />
                {form.watch("link") && <a href={form.watch("link")} target="_blank" rel="noreferrer" className="absolute right-4 top-1/2 -translate-y-1/2 text-primary"><ExternalLink className="h-4 w-4" /></a>}
              </div>
            </label>
            <div className="space-y-2">
              <span className="text-sm font-bold">Lecture type</span>
              <div className="grid grid-cols-2 gap-2 rounded-2xl bg-secondary/45 p-1.5">
                {(["theoretical", "practical"] as StudyType[]).map((type) => (
                  <button key={type} type="button" onClick={() => changeType(type)} className={`rounded-xl py-3 text-sm font-bold capitalize transition ${lecture.type === type ? "bg-background shadow ring-1 ring-border/50" : "text-muted-foreground"}`}>{type}</button>
                ))}
              </div>
            </div>
            <button className="w-full rounded-2xl bg-primary py-3.5 font-black text-primary-foreground shadow-lg shadow-primary/15">Save changes</button>
          </div>
        </section>
      </form>

      <section className="grid grid-cols-2 gap-3">
        <button onClick={() => setSheet("flashcards")} className="rounded-[26px] border border-violet-500/25 bg-gradient-to-br from-violet-500/15 to-card p-5 text-left shadow-sm">
          <div className="mb-5 grid h-12 w-12 place-items-center rounded-2xl bg-violet-500/15 text-violet-500"><Layers className="h-6 w-6" /></div>
          <p className="text-lg font-black">Flashcards</p><p className="mt-1 text-xs text-muted-foreground">Import, clear or study · {flashcardCount} cards</p>
        </button>
        <button onClick={() => setSheet("mcqs")} className="rounded-[26px] border border-emerald-500/25 bg-gradient-to-br from-emerald-500/15 to-card p-5 text-left shadow-sm">
          <div className="mb-5 grid h-12 w-12 place-items-center rounded-2xl bg-emerald-500/15 text-emerald-500"><Brain className="h-6 w-6" /></div>
          <p className="text-lg font-black">MCQs</p><p className="mt-1 text-xs text-muted-foreground">Import, clear or examine · {mcqCount} questions</p>
        </button>
      </section>

      <button onClick={() => { deleteLecture(subject.id, lecture.id); setLocation(`/subjects/${subject.id}`); }} className="flex w-full items-center justify-center gap-2 rounded-2xl border border-destructive/25 bg-destructive/10 py-3.5 font-bold text-destructive">
        <Trash2 className="h-4 w-4" /> Delete lecture
      </button>

      <input ref={flashcardRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={(e) => { importFlashcards(e.target.files?.[0]); e.target.value = ""; }} />
      <input ref={mcqRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={(e) => { importMcqs(e.target.files?.[0]); e.target.value = ""; }} />

      {sheet && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm md:items-center md:p-5" onClick={() => setSheet(null)}>
          <div className="max-h-[88vh] w-full max-w-lg overflow-auto rounded-t-[38px] border border-border/70 bg-background px-5 pb-7 pt-3 shadow-2xl md:rounded-[38px]" onClick={(e) => e.stopPropagation()}>
            <div className="mx-auto mb-6 h-1.5 w-24 rounded-full bg-muted" />
            <div className="mb-6 flex items-start justify-between">
              <div><p className="text-[11px] font-black uppercase tracking-[0.2em] text-primary">{lecture.name}</p><h2 className="mt-1 text-3xl font-black">Organize {sheet === "mcqs" ? "MCQs" : "Flashcards"}</h2></div>
              <button onClick={() => setSheet(null)} className="grid h-11 w-11 place-items-center rounded-full bg-secondary"><X className="h-5 w-5" /></button>
            </div>
            <div className="mb-5 rounded-3xl border border-border/60 bg-secondary/30 p-4">
              <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Current content</p>
              <p className="mt-2 text-2xl font-black">{sheet === "mcqs" ? mcqCount : flashcardCount} {sheet === "mcqs" ? "questions" : "cards"}</p>
            </div>
            <div className="space-y-3">
              <button onClick={() => sheet === "mcqs" ? mcqRef.current?.click() : flashcardRef.current?.click()} className="flex w-full items-center gap-4 rounded-3xl border border-border/60 bg-card p-4 text-left">
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary"><Upload className="h-5 w-5" /></div>
                <div><p className="font-black">Add more {sheet === "mcqs" ? "MCQs" : "flashcards"}</p><p className="mt-1 text-xs text-muted-foreground">Import from the confirmed Excel format</p></div>
              </button>
              <button onClick={() => sheet === "mcqs" ? removeMcqs() : removeFlashcards()} className="flex w-full items-center gap-4 rounded-3xl border border-destructive/20 bg-destructive/10 p-4 text-left text-destructive">
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-destructive/10"><Trash2 className="h-5 w-5" /></div>
                <div><p className="font-black">Remove all {sheet === "mcqs" ? "MCQs" : "flashcards"}</p><p className="mt-1 text-xs opacity-70">Clear this lecture’s current content</p></div>
              </button>
              <button disabled={sheet === "mcqs" ? !mcqCount : !flashcardCount} onClick={() => setLocation(sheet === "mcqs" ? `/subjects/${subject.id}/exams/${exam!.id}/take` : `/subjects/${subject.id}/lectures/${lecture.id}/study`)} className="flex w-full items-center justify-center gap-2 rounded-3xl bg-primary py-4 font-black text-primary-foreground disabled:opacity-40">
                {sheet === "mcqs" ? <FileQuestion className="h-5 w-5" /> : <Layers className="h-5 w-5" />} Study {sheet === "mcqs" ? "the MCQs" : "the flashcards"}
              </button>
              {sheet === "flashcards" && <button onClick={() => setLocation(`/subjects/${subject.id}/lectures/${lecture.id}/flashcards`)} className="flex w-full items-center justify-center gap-2 rounded-3xl border border-border/60 py-4 font-black"><Plus className="h-5 w-5" /> Create flashcard manually</button>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
