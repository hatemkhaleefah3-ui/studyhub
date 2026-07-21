import { useMemo, useRef, useState } from "react";
import { useLocation, useRoute } from "wouter";
import { BookOpen, Brain, FileQuestion, Layers, Pencil, Plus, Sparkles, Trash2, Upload, X } from "lucide-react";
import { GlassCard } from "@/components/shared/GlassCard";
import { SwipeRow } from "@/components/shared/SwipeRow";
import { useStudyData, type Exam, type ExamQuestion, type StudyType } from "@/hooks/useStudyData";
import { parseExamExcel, parseFlashcardExcel, parseLectureExcel } from "@/lib/excelImport";

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
  const { subjects, addLecture, addExam, updateExam, addFlashcard } = useStudyData();
  const subject = subjects.find((s) => s.id === params?.id);
  const [type, setType] = useState<StudyType>("theoretical");
  const [examSheetOpen, setExamSheetOpen] = useState(false);
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
      return;
    }
    const lecture = target.lectureId ? subject.lectures.find((l) => l.id === target.lectureId) : null;
    addExam(subject.id, { name: lecture ? `${lecture.name} MCQs` : "Final Exam", link: "", grade: null, date: null, weight: 1, type: target.type, linkedLectureIds: lecture ? [lecture.id] : [], questions });
  };

  const openQuestionUpload = (exam?: Exam, lectureId?: string) => {
    setQuestionTarget({ examId: exam?.id, lectureId, type });
    questionImportRef.current?.click();
  };

  const studyMcqs = (lectureId: string) => {
    const exam = lectureExam(lectureId);
    exam?.questions?.length ? setLocation(`/subjects/${subject.id}/exams/${exam.id}/take`) : openQuestionUpload(exam, lectureId);
  };

  return (
    <div className="space-y-6 pb-20">
      <div>
        <button onClick={() => setLocation("/subjects")} className="text-sm text-muted-foreground hover:text-foreground">← Subjects</button>
        <h1 className="mt-1 text-3xl font-black tracking-tight">{subject.name}</h1>
      </div>

      {notice && <div className="flex justify-between gap-3 rounded-2xl border border-border bg-secondary/40 px-4 py-3 text-sm"><span>{notice}</span><button onClick={() => setNotice("")}><X className="h-4 w-4" /></button></div>}

      <div className="grid grid-cols-2 gap-2 rounded-2xl border border-border/50 bg-secondary/40 p-1.5">
        {(["theoretical", "practical"] as StudyType[]).map((item) => <button key={item} onClick={() => setType(item)} className={`rounded-xl py-2.5 font-semibold capitalize ${type === item ? "bg-background shadow-sm ring-1 ring-border/50" : "text-muted-foreground"}`}>{item}</button>)}
      </div>

      <SwipeRow onSwipeRight={() => setExamSheetOpen(true)} rightLabel="Edit" rightIcon={Pencil} rightColor="#6366f1" onSwipeLeft={() => finalExam?.questions?.length ? setLocation(`/subjects/${subject.id}/exams/${finalExam.id}/take`) : openQuestionUpload(finalExam)} leftLabel={finalExam?.questions?.length ? "Examine" : "Add questions"} leftIcon={FileQuestion} leftColor="#10b981">
        <GlassCard className="relative overflow-hidden border-primary/20 bg-gradient-to-br from-primary/15 via-card to-card p-0 shadow-xl">
          <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-primary/10 blur-3xl" />
          <div className="relative p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex min-w-0 items-center gap-4"><div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary"><Sparkles className="h-7 w-7" /></div><div><div className="mb-1 flex gap-2"><span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-widest text-primary">Pinned</span><span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{type}</span></div><p className="text-xl font-black">Final Exam</p><p className="mt-1 text-xs text-muted-foreground">Swipe left to examine · right to edit</p></div></div>
              <div className="rounded-2xl border border-border/60 bg-background/70 px-3 py-2 text-right"><p className="text-sm font-black">{scoreBand(finalExam?.lastScore?.percentage)}</p><p className="text-[10px] font-bold uppercase text-muted-foreground">{finalExam?.lastScore?.total ?? 0} answered</p></div>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3"><div className="rounded-2xl border border-border/50 bg-background/55 p-3"><p className="text-[10px] font-bold uppercase text-muted-foreground">Question bank</p><p className="mt-1 text-2xl font-black">{finalExam?.questions?.length ?? 0}</p></div><div className="rounded-2xl border border-border/50 bg-background/55 p-3"><p className="text-[10px] font-bold uppercase text-muted-foreground">Last score</p><p className="mt-1 text-2xl font-black">{finalExam?.lastScore ? `${finalExam.lastScore.percentage}%` : "—"}</p></div></div>
          </div>
        </GlassCard>
      </SwipeRow>

      <div className="space-y-3">
        {lectures.map((lecture, index) => {
          const exam = lectureExam(lecture.id); const flashcards = lecture.flashcards ?? []; const mastered = lecture.readerLastPercentage ?? 0;
          return <SwipeRow key={lecture.id} onTap={() => setLocation(`/subjects/${subject.id}/lectures/${lecture.id}`)} onSwipeRight={() => flashcards.length ? setLocation(`/subjects/${subject.id}/lectures/${lecture.id}/study`) : (() => { setFlashcardLectureId(lecture.id); flashcardImportRef.current?.click(); })()} rightLabel="Study Flashcards" rightIcon={Layers} rightColor="#6366f1" onSwipeLeft={() => studyMcqs(lecture.id)} leftLabel="Study MCQs" leftIcon={Brain} leftColor="#10b981">
            <GlassCard className="overflow-hidden border-border/60 bg-card p-0 hover:border-primary/25 hover:shadow-md"><div className="flex items-center gap-4 p-4"><div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-border/50 bg-secondary/70 text-xs font-black">{String(index + 1).padStart(2, "0")}</div><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold">{lecture.name}</p><div className="mt-2 flex gap-2"><span className="rounded-full bg-emerald-500/10 px-2 py-1 text-[10px] font-bold text-emerald-600">{exam?.questions?.length ?? 0} MCQs</span><span className="rounded-full bg-indigo-500/10 px-2 py-1 text-[10px] font-bold text-indigo-600">{flashcards.length} cards</span></div></div><div className="flex h-14 w-14 items-center justify-center rounded-full border-4 border-primary/20 text-xs font-black">{mastered}%</div></div><div className="grid grid-cols-3 border-t border-border/50 bg-secondary/20 px-4 py-2 text-[10px] font-bold uppercase text-muted-foreground"><span>→ Flashcards</span><span className="text-center">Tap edit page</span><span className="text-right">MCQs ←</span></div></GlassCard>
          </SwipeRow>;
        })}
        <div className="grid grid-cols-2 gap-3 pt-2"><button onClick={() => addLecture(subject.id, { name: `New ${type} lecture`, link: "", type })} className="min-h-24 rounded-2xl border-2 border-dashed border-border bg-secondary/20 p-4 text-muted-foreground"><Plus className="mx-auto mb-2 h-5 w-5" /><span className="block text-sm font-bold">Add Lecture</span></button><button onClick={() => lectureImportRef.current?.click()} className="min-h-24 rounded-2xl border-2 border-dashed border-border bg-secondary/20 p-4 text-muted-foreground"><Upload className="mx-auto mb-2 h-5 w-5" /><span className="block text-sm font-bold">Import Lectures</span></button></div>
      </div>

      <input ref={lectureImportRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={async (e) => { const file=e.target.files?.[0]; if(file){const {names,skipped}=await parseLectureExcel(file); names.forEach(name=>addLecture(subject.id,{name,link:"",type})); setNotice(`Imported ${names.length} lectures${skipped?`; skipped ${skipped}`:""}.`);} e.target.value=""; }} />
      <input ref={questionImportRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={async (e) => { const file=e.target.files?.[0]; if(file&&questionTarget){const questions=await parseExamExcel(file); ensureExam(questionTarget,questions); setNotice(`Added ${questions.length} questions.`);} setQuestionTarget(null); e.target.value=""; }} />
      <input ref={flashcardImportRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={async (e) => { const file=e.target.files?.[0]; if(file&&flashcardLectureId){const {rows}=await parseFlashcardExcel(file); rows.forEach(row=>addFlashcard(subject.id,flashcardLectureId,row)); setNotice(`Added ${rows.length} flashcards.`);} setFlashcardLectureId(null); e.target.value=""; }} />

      {examSheetOpen && <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm" onClick={() => setExamSheetOpen(false)}><div className="w-full max-w-lg rounded-t-[2.5rem] border border-white/10 bg-zinc-950 px-5 pb-8 pt-3 text-white shadow-2xl" onClick={(e)=>e.stopPropagation()}><div className="mx-auto mb-6 h-1.5 w-24 rounded-full bg-white/10" /><div className="flex items-start justify-between"><div><p className="text-xs font-black uppercase tracking-[0.2em] text-red-400">Final exam settings</p><h2 className="mt-2 text-3xl font-black">{subject.name}</h2><p className="mt-2 text-zinc-400">{type} · {finalExam?.questions?.length ?? 0} questions</p></div><button onClick={()=>setExamSheetOpen(false)} className="rounded-full bg-white/5 p-3 text-zinc-300"><X /></button></div><div className="mt-7 rounded-3xl border border-white/10 bg-white/[0.03] p-5"><p className="text-xs font-black uppercase tracking-widest text-zinc-500">Question bank</p><div className="mt-4 grid gap-3"><button onClick={()=>openQuestionUpload(finalExam)} className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-left"><Upload className="text-blue-400"/><div><p className="font-bold">Add more questions</p><p className="text-sm text-zinc-500">Import MCQ / Medical Case MCQ Excel</p></div></button><button disabled={!finalExam?.questions?.length} onClick={()=>{if(finalExam)updateExam(subject.id,finalExam.id,{questions:[],lastScore:null,checked:false});setExamSheetOpen(false);setNotice("All final exam questions removed.");}} className="flex items-center gap-4 rounded-2xl border border-red-500/20 bg-red-500/5 p-4 text-left text-red-400 disabled:opacity-40"><Trash2/><div><p className="font-bold">Remove all questions</p><p className="text-sm text-red-300/50">Clears the complete final exam bank</p></div></button></div></div></div></div>}
    </div>
  );
}
