import { useMemo, useRef, useState } from "react";
import { useLocation, useRoute } from "wouter";
import { BookOpen, Brain, FileQuestion, Layers, Pencil, Plus, Sparkles, Trash2, Upload, X } from "lucide-react";
import { GlassCard } from "@/components/shared/GlassCard";
import { SwipeRow } from "@/components/shared/SwipeRow";
import { useStudyData, type Exam, type ExamQuestion, type StudyType } from "@/hooks/useStudyData";
import { parseExamExcel, parseFlashcardExcel, parseLectureExcel } from "@/lib/excelImport";

type Panel = null | { kind: "final"; type: StudyType } | { kind: "lecture"; lectureId: string };

const scoreBand = (percentage?: number) => {
  if (percentage == null) return "Not taken";
  if (percentage === 100) return "Incredible";
  if (percentage >= 90) return "Great";
  if (percentage >= 80) return "Very Good";
  if (percentage >= 70) return "Good";
  if (percentage >= 60) return "Needs work";
  if (percentage >= 50) return "Bad";
  if (percentage >= 40) return "You are falling bro";
  return "WTF";
};

export function SubjectStudyHub() {
  const [, params] = useRoute("/subjects/:id");
  const [, setLocation] = useLocation();
  const { subjects, addLecture, addExam, updateExam, addFlashcard, deleteFlashcard } = useStudyData();
  const subject = subjects.find((s) => s.id === params?.id);
  const [type, setType] = useState<StudyType>("theoretical");
  const [panel, setPanel] = useState<Panel>(null);
  const [notice, setNotice] = useState("");
  const lectureImportRef = useRef<HTMLInputElement>(null);
  const questionImportRef = useRef<HTMLInputElement>(null);
  const flashcardImportRef = useRef<HTMLInputElement>(null);
  const [questionTarget, setQuestionTarget] = useState<{ examId?: string; lectureId?: string; type: StudyType } | null>(null);
  const [flashcardLectureId, setFlashcardLectureId] = useState<string | null>(null);

  const lectures = useMemo(() => subject?.lectures.filter((l) => l.type === type) ?? [], [subject, type]);
  const finalExam = useMemo(() => subject?.exams.find((e) => e.type === type && e.name === "Final Exam"), [subject, type]);

  if (!subject) return <div className="p-8 text-center text-muted-foreground">Subject not found</div>;

  const lectureExam = (lectureId: string) => subject.exams.find((e) => e.type === type && e.linkedLectureIds?.includes(lectureId));

  const ensureExam = (target: { examId?: string; lectureId?: string; type: StudyType }, questions: ExamQuestion[]) => {
    if (target.examId) {
      const exam = subject.exams.find((e) => e.id === target.examId);
      updateExam(subject.id, target.examId, { questions: [...(exam?.questions ?? []), ...questions] });
      return target.examId;
    }
    const lecture = target.lectureId ? subject.lectures.find((l) => l.id === target.lectureId) : null;
    addExam(subject.id, {
      name: lecture ? `${lecture.name} MCQs` : "Final Exam",
      link: "",
      grade: null,
      date: null,
      weight: 1,
      type: target.type,
      linkedLectureIds: lecture ? [lecture.id] : [],
      questions,
    });
    return null;
  };

  const importLectures = async (file?: File) => {
    if (!file) return;
    const { names, skipped } = await parseLectureExcel(file);
    names.forEach((name) => addLecture(subject.id, { name, link: "", type }));
    setNotice(`Imported ${names.length} lecture${names.length === 1 ? "" : "s"}${skipped ? `; skipped ${skipped}` : ""}.`);
  };

  const importQuestions = async (file?: File) => {
    if (!file || !questionTarget) return;
    const questions = await parseExamExcel(file);
    ensureExam(questionTarget, questions);
    setNotice(`Added ${questions.length} question${questions.length === 1 ? "" : "s"}.`);
    setQuestionTarget(null);
    setPanel(null);
  };

  const importFlashcards = async (file?: File) => {
    if (!file || !flashcardLectureId) return;
    const { rows, skipped } = await parseFlashcardExcel(file);
    rows.forEach((row) => addFlashcard(subject.id, flashcardLectureId, row));
    setNotice(`Added ${rows.length} flashcard${rows.length === 1 ? "" : "s"}${skipped ? `; skipped ${skipped}` : ""}.`);
    setFlashcardLectureId(null);
    setPanel(null);
  };

  const openQuestionUpload = (exam: Exam | undefined, lectureId?: string) => {
    setQuestionTarget({ examId: exam?.id, lectureId, type });
    questionImportRef.current?.click();
  };

  const removeAllQuestions = (exam?: Exam) => {
    if (!exam) return;
    updateExam(subject.id, exam.id, { questions: [], lastScore: null, checked: false });
    setNotice("All questions removed. You can add them again from the edit panel.");
    setPanel(null);
  };

  const removeAllFlashcards = (lectureId: string) => {
    const lecture = subject.lectures.find((l) => l.id === lectureId);
    (lecture?.flashcards ?? []).forEach((card) => deleteFlashcard(subject.id, lectureId, card.id));
    setNotice("All flashcards removed.");
    setPanel(null);
  };

  const studyMcqs = (lectureId: string) => {
    const exam = lectureExam(lectureId);
    if (exam?.questions?.length) setLocation(`/subjects/${subject.id}/exams/${exam.id}/take`);
    else openQuestionUpload(exam, lectureId);
  };

  return (
    <div className="space-y-6 pb-20">
      <div>
        <button onClick={() => setLocation("/subjects")} className="text-sm text-muted-foreground hover:text-foreground">← Subjects</button>
        <h1 className="text-3xl font-bold mt-1">{subject.name}</h1>
      </div>

      {notice && <div className="rounded-xl border border-border bg-secondary/40 px-4 py-3 text-sm flex justify-between gap-3"><span>{notice}</span><button onClick={() => setNotice("")}><X className="w-4 h-4" /></button></div>}

      <div className="grid grid-cols-2 gap-2 rounded-2xl bg-secondary/40 border border-border/50 p-1.5">
        {(["theoretical", "practical"] as StudyType[]).map((item) => (
          <button key={item} onClick={() => setType(item)} className={`rounded-xl py-2.5 font-semibold capitalize transition-all ${type === item ? "bg-background shadow-sm ring-1 ring-border/50" : "text-muted-foreground hover:text-foreground"}`}>{item}</button>
        ))}
      </div>

      <SwipeRow
        onSwipeRight={() => setPanel({ kind: "final", type })}
        rightLabel="Edit" rightIcon={Pencil} rightColor="#6366f1"
        onSwipeLeft={() => finalExam?.questions?.length ? setLocation(`/subjects/${subject.id}/exams/${finalExam.id}/take`) : openQuestionUpload(finalExam)}
        leftLabel={finalExam?.questions?.length ? "Examine" : "Add questions"} leftIcon={FileQuestion} leftColor="#10b981"
      >
        <GlassCard className="relative overflow-hidden border-primary/20 bg-gradient-to-br from-primary/15 via-card to-card p-0 shadow-lg">
          <div className="absolute -right-10 -top-10 h-36 w-36 rounded-full bg-primary/10 blur-2xl" />
          <div className="relative p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex min-w-0 items-center gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary shadow-sm">
                  <Sparkles className="h-7 w-7" />
                </div>
                <div className="min-w-0">
                  <div className="mb-1 flex items-center gap-2">
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-widest text-primary">Pinned</span>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{type}</span>
                  </div>
                  <p className="text-xl font-black tracking-tight">Final Exam</p>
                  <p className="mt-1 text-xs text-muted-foreground">Swipe left to {finalExam?.questions?.length ? "start" : "add questions"} · swipe right to edit</p>
                </div>
              </div>
              <div className="shrink-0 rounded-2xl border border-border/60 bg-background/70 px-3 py-2 text-right shadow-sm backdrop-blur">
                <p className="text-sm font-black">{scoreBand(finalExam?.lastScore?.percentage)}</p>
                <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{finalExam?.lastScore?.total ?? 0} answered</p>
              </div>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-border/50 bg-background/55 p-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Question bank</p>
                <p className="mt-1 text-2xl font-black">{finalExam?.questions?.length ?? 0}</p>
              </div>
              <div className="rounded-2xl border border-border/50 bg-background/55 p-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Last score</p>
                <p className="mt-1 text-2xl font-black">{finalExam?.lastScore ? `${finalExam.lastScore.percentage}%` : "—"}</p>
              </div>
            </div>
          </div>
        </GlassCard>
      </SwipeRow>

      <div className="space-y-3">
        {lectures.map((lecture, index) => {
          const exam = lectureExam(lecture.id);
          const flashcards = lecture.flashcards ?? [];
          const mastered = lecture.readerLastPercentage ?? 0;
          return (
            <SwipeRow
              key={lecture.id}
              onTap={() => setPanel({ kind: "lecture", lectureId: lecture.id })}
              onSwipeRight={() => flashcards.length ? setLocation(`/subjects/${subject.id}/lectures/${lecture.id}/study`) : (() => { setFlashcardLectureId(lecture.id); flashcardImportRef.current?.click(); })()}
              rightLabel="Study Flashcards" rightIcon={Layers} rightColor="#6366f1"
              onSwipeLeft={() => studyMcqs(lecture.id)}
              leftLabel="Study MCQs" leftIcon={Brain} leftColor="#10b981"
            >
              <GlassCard className="group overflow-hidden border-border/60 bg-card p-0 transition-all hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-md">
                <div className="flex items-center gap-4 p-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-border/50 bg-secondary/70 text-muted-foreground transition-colors group-hover:text-primary">
                    <span className="text-xs font-black">{String(index + 1).padStart(2, "0")}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-foreground">{lecture.name}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <span className="rounded-full bg-emerald-500/10 px-2 py-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">{exam?.questions?.length ?? 0} MCQs</span>
                      <span className="rounded-full bg-indigo-500/10 px-2 py-1 text-[10px] font-bold text-indigo-600 dark:text-indigo-400">{flashcards.length} cards</span>
                    </div>
                  </div>
                  <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-secondary/60">
                    <div className="absolute inset-1 rounded-full border-4 border-primary/20" />
                    <span className="relative text-xs font-black">{mastered}%</span>
                  </div>
                </div>
                <div className="grid grid-cols-3 border-t border-border/50 bg-secondary/20 px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  <span>→ Flashcards</span>
                  <span className="text-center">Tap settings</span>
                  <span className="text-right">MCQs ←</span>
                </div>
              </GlassCard>
            </SwipeRow>
          );
        })}

        <div className="grid grid-cols-2 gap-3 pt-2">
          <button onClick={() => addLecture(subject.id, { name: `New ${type} lecture`, link: "", type })} className="min-h-24 rounded-2xl border-2 border-dashed border-border bg-secondary/20 p-4 text-muted-foreground transition-all hover:border-primary/40 hover:bg-primary/5 hover:text-primary">
            <span className="mx-auto mb-2 flex h-9 w-9 items-center justify-center rounded-xl bg-background shadow-sm"><Plus className="h-4 w-4" /></span>
            <span className="block text-sm font-bold">Add Lecture</span>
            <span className="mt-1 block text-[10px] font-medium">Create one empty card</span>
          </button>
          <button onClick={() => lectureImportRef.current?.click()} className="min-h-24 rounded-2xl border-2 border-dashed border-border bg-secondary/20 p-4 text-muted-foreground transition-all hover:border-primary/40 hover:bg-primary/5 hover:text-primary">
            <span className="mx-auto mb-2 flex h-9 w-9 items-center justify-center rounded-xl bg-background shadow-sm"><Upload className="h-4 w-4" /></span>
            <span className="block text-sm font-bold">Import Lectures</span>
            <span className="mt-1 block text-[10px] font-medium">Upload Name-column Excel</span>
          </button>
        </div>
      </div>

      <input ref={lectureImportRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={(e) => { importLectures(e.target.files?.[0]); e.target.value = ""; }} />
      <input ref={questionImportRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={(e) => { importQuestions(e.target.files?.[0]); e.target.value = ""; }} />
      <input ref={flashcardImportRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={(e) => { importFlashcards(e.target.files?.[0]); e.target.value = ""; }} />

      {panel && <div className="fixed inset-0 z-50 bg-black/50 flex items-end md:items-center justify-center p-4" onClick={() => setPanel(null)}>
        <div className="w-full max-w-md rounded-3xl bg-background border border-border p-5 space-y-3" onClick={(e) => e.stopPropagation()}>
          <div className="flex justify-between items-center"><h2 className="text-xl font-bold">{panel.kind === "final" ? "Final Exam settings" : "Lecture settings"}</h2><button onClick={() => setPanel(null)}><X /></button></div>
          {panel.kind === "final" ? <>
            <button onClick={() => openQuestionUpload(finalExam)} className="w-full rounded-xl bg-primary text-primary-foreground p-3 font-semibold">Add more questions</button>
            <button onClick={() => removeAllQuestions(finalExam)} disabled={!finalExam?.questions?.length} className="w-full rounded-xl bg-destructive/10 text-destructive p-3 font-semibold disabled:opacity-40">Remove all questions</button>
          </> : (() => {
            const lecture = subject.lectures.find((l) => l.id === panel.lectureId)!;
            const exam = lectureExam(lecture.id);
            return <>
              <div className="rounded-2xl border border-border p-4 space-y-2"><p className="font-bold">Organize MCQs</p><button onClick={() => openQuestionUpload(exam, lecture.id)} className="w-full rounded-xl bg-secondary p-3 font-semibold">Add more MCQs</button><button onClick={() => removeAllQuestions(exam)} className="w-full rounded-xl bg-secondary p-3 font-semibold">Remove all MCQs</button><button onClick={() => studyMcqs(lecture.id)} className="w-full rounded-xl bg-primary text-primary-foreground p-3 font-semibold">Study the MCQs</button></div>
              <div className="rounded-2xl border border-border p-4 space-y-2"><p className="font-bold">Organize Flashcards</p><button onClick={() => { setFlashcardLectureId(lecture.id); flashcardImportRef.current?.click(); }} className="w-full rounded-xl bg-secondary p-3 font-semibold">Add more flashcards</button><button onClick={() => removeAllFlashcards(lecture.id)} className="w-full rounded-xl bg-secondary p-3 font-semibold">Remove all flashcards</button><button onClick={() => setLocation(`/subjects/${subject.id}/lectures/${lecture.id}/study`)} className="w-full rounded-xl bg-primary text-primary-foreground p-3 font-semibold">Study the flashcards</button></div>
            </>;
          })()}
        </div>
      </div>}
    </div>
  );
}
