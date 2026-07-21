import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Check, CheckCircle2, ChevronLeft, ChevronRight, Clock3, RotateCcw, X } from "lucide-react";
import { useLocation, useRoute } from "wouter";
import { useStudyData, getScoreBand, type ExamQuestion } from "@/hooks/useStudyData";
import { GlassCard } from "@/components/shared/GlassCard";

const transition = { duration: 0.34, ease: [0.4, 0, 0.2, 1] as const };

export function ExamTake() {
  const [, params] = useRoute("/subjects/:subjectId/exams/:examId/take");
  const [, setLocation] = useLocation();
  const { subjects, submitExamAttempt } = useStudyData();
  const subject = subjects.find((item) => item.id === params?.subjectId);
  const exam = subject?.exams.find((item) => item.id === params?.examId);
  const allQuestions = exam?.questions ?? [];
  const [questions, setQuestions] = useState<ExamQuestion[]>(allQuestions);
  const [answers, setAnswers] = useState<number[]>(Array(allQuestions.length).fill(0));
  const [confirmed, setConfirmed] = useState<boolean[]>(Array(allQuestions.length).fill(false));
  const [index, setIndex] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [result, setResult] = useState<{ correct: number; total: number; percentage: number } | null>(null);
  const [showMissed, setShowMissed] = useState(false);

  useEffect(() => {
    if (result) return;
    const timer = window.setInterval(() => setSeconds((value) => value + 1), 1000);
    return () => window.clearInterval(timer);
  }, [result]);

  if (!subject || !exam) return <div className="p-8 text-center text-muted-foreground">Exam not found</div>;
  const goBack = () => window.history.length > 1 ? window.history.back() : setLocation(`/subjects/${subject.id}/lectures?type=${exam.type}`);

  if (!questions.length) return <div className="mx-auto flex min-h-[70vh] max-w-xl items-center justify-center"><GlassCard className="w-full border-dashed border-2 bg-transparent p-10 text-center"><p className="text-xl font-bold">No questions yet</p><p className="mt-2 text-sm text-muted-foreground">Return to the exam settings and import an Excel question file.</p><button onClick={goBack} className="mt-5 rounded-xl bg-primary px-5 py-3 font-semibold text-primary-foreground">Go back</button></GlassCard></div>;

  const question = questions[index];
  const selected = answers[index];
  const isConfirmed = confirmed[index];
  const progress = Math.round(((index + 1) / questions.length) * 100);
  const time = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
  const missed = questions.map((item, itemIndex) => ({ item, itemIndex, answer: answers[itemIndex] })).filter(({ item, answer }) => answer !== item.correctAnswer);
  const medicalCount = questions.filter((item) => item.questionType === "Medical Case MCQ").length;
  const mcqCount = questions.length - medicalCount;

  const confirmAnswer = () => {
    if (!selected) return;
    setConfirmed((current) => current.map((value, itemIndex) => itemIndex === index ? true : value));
  };
  const next = () => {
    if (!isConfirmed) { confirmAnswer(); return; }
    if (index < questions.length - 1) setIndex((value) => value + 1);
  };
  const submit = () => {
    const score = submitExamAttempt(subject.id, exam.id, answers);
    setResult(score);
    const historyKey = `studyhub:exam-history:${exam.id}`;
    const previous = JSON.parse(localStorage.getItem(historyKey) ?? "[]");
    localStorage.setItem(historyKey, JSON.stringify([{ ...score, answers, missed: missed.map(({ itemIndex }) => itemIndex), takenAt: new Date().toISOString() }, ...previous].slice(0, 20)));
  };
  const retryWrong = () => {
    const wrong = missed.map(({ item }) => item);
    setQuestions(wrong); setAnswers(Array(wrong.length).fill(0)); setConfirmed(Array(wrong.length).fill(false)); setIndex(0); setSeconds(0); setResult(null); setShowMissed(false);
  };
  const restart = () => { setQuestions(allQuestions); setAnswers(Array(allQuestions.length).fill(0)); setConfirmed(Array(allQuestions.length).fill(false)); setIndex(0); setSeconds(0); setResult(null); setShowMissed(false); };

  if (result) {
    const band = getScoreBand(result.percentage);
    const mcqCorrect = questions.filter((item, i) => item.questionType === "MCQ" && answers[i] === item.correctAnswer).length;
    const caseCorrect = questions.filter((item, i) => item.questionType === "Medical Case MCQ" && answers[i] === item.correctAnswer).length;
    return <div className="mx-auto max-w-3xl space-y-5 pb-24">
      <header className="flex items-center gap-3"><button onClick={goBack} className="flex h-11 w-11 items-center justify-center rounded-full border border-border bg-secondary"><ArrowLeft className="h-5 w-5" /></button><div><p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Exam complete</p><h1 className="text-2xl font-bold">{exam.name}</h1></div></header>
      <GlassCard className="overflow-hidden p-0"><div className="p-7 text-center"><div className="mx-auto flex h-28 w-28 items-center justify-center rounded-full text-3xl font-black text-white shadow-lg" style={{ backgroundColor: band.color }}>{result.percentage}%</div><h2 className="mt-4 text-2xl font-bold" style={{ color: band.color }}>{band.label}</h2><p className="mt-1 text-muted-foreground">{result.correct} of {result.total} correct · {time}</p></div><div className="grid grid-cols-2 border-t border-border"><div className="p-4 text-center"><p className="text-xl font-bold">{mcqCorrect}/{mcqCount}</p><p className="text-xs text-muted-foreground">MCQs</p></div><div className="border-l border-border p-4 text-center"><p className="text-xl font-bold">{caseCorrect}/{medicalCount}</p><p className="text-xs text-muted-foreground">Medical cases</p></div></div></GlassCard>
      <button onClick={() => setShowMissed((value) => !value)} className="w-full rounded-2xl border border-border bg-card p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"><div className="flex items-center justify-between"><div><p className="font-bold">Missed Items</p><p className="text-sm text-muted-foreground">{missed.length} question{missed.length === 1 ? "" : "s"}</p></div><ChevronRight className={`h-5 w-5 transition ${showMissed ? "rotate-90" : ""}`} /></div></button>
      <AnimatePresence>{showMissed && <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={transition} className="space-y-3 overflow-hidden">{missed.map(({ item, itemIndex, answer }) => <GlassCard key={`${item.id}-${itemIndex}`} className="space-y-3 p-4"><div className="flex items-start gap-2"><span className="rounded-md bg-primary px-2 py-1 text-xs font-bold text-primary-foreground">Q{itemIndex + 1}</span><p className="font-semibold">{item.text}</p></div><div className="rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive"><span className="font-bold">Your answer: </span>{answer ? item.choices[answer - 1] : "No answer"}</div><div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm text-emerald-600 dark:text-emerald-400"><span className="font-bold">Correct: </span>{item.choices[item.correctAnswer - 1]}</div></GlassCard>)}</motion.div>}</AnimatePresence>
      <div className="grid gap-3 sm:grid-cols-3"><button onClick={restart} className="flex items-center justify-center gap-2 rounded-2xl bg-secondary py-4 font-semibold"><RotateCcw className="h-4 w-4" />Retake all</button><button disabled={!missed.length} onClick={retryWrong} className="rounded-2xl border border-primary/20 bg-primary/10 py-4 font-semibold text-primary disabled:opacity-40">Retry wrong only</button><button onClick={goBack} className="rounded-2xl bg-primary py-4 font-semibold text-primary-foreground">Done</button></div>
    </div>;
  }

  return <div className="-mx-4 -mt-4 min-h-[calc(100vh-5rem)] bg-background px-4 pb-24 pt-4 md:-mx-6 md:px-6">
    <div className="mx-auto max-w-3xl space-y-5">
      <header className="flex items-center gap-3"><button onClick={goBack} className="flex h-11 w-11 items-center justify-center rounded-full border border-border bg-secondary"><ArrowLeft className="h-5 w-5" /></button><div className="min-w-0 flex-1"><p className="truncate text-lg font-bold">{exam.name}</p><p className="text-sm text-muted-foreground">Question {index + 1} of {questions.length}</p></div><div className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 font-mono text-sm"><Clock3 className="h-4 w-4 text-primary" />{time}</div></header>
      <div className="h-2 overflow-hidden rounded-full bg-secondary"><motion.div className="h-full rounded-full bg-primary" animate={{ width: `${progress}%` }} transition={transition} /></div>
      <AnimatePresence mode="wait"><motion.div key={index} initial={{ opacity: 0, x: 28 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -28 }} transition={transition}><GlassCard className="space-y-5 p-5 md:p-7"><div><div className="mb-3 flex items-center gap-2"><span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-primary">{question.questionType}</span></div>{question.questionType === "Medical Case MCQ" && (question.labs || question.histo) && <div className="mb-4 rounded-2xl border border-border bg-secondary/30 p-4 text-sm"><p className="mb-2 font-bold">Case context</p>{question.labs && <p><span className="font-semibold">Labs:</span> {question.labs}</p>}{question.histo && <p className="mt-1"><span className="font-semibold">Histo:</span> {question.histo}</p>}</div>}<h2 className="text-xl font-bold leading-relaxed">{question.text}</h2></div><div className="space-y-3">{question.choices.map((choice, choiceIndex) => {const number=choiceIndex+1;const chosen=selected===number;const correct=isConfirmed&&number===question.correctAnswer;const wrong=isConfirmed&&chosen&&number!==question.correctAnswer;return <button key={choiceIndex} disabled={isConfirmed} onClick={()=>setAnswers((current)=>current.map((value,itemIndex)=>itemIndex===index?number:value))} className={`flex min-h-14 w-full items-center gap-3 rounded-2xl border-2 px-4 py-3 text-left transition ${correct?"border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400":wrong?"border-destructive bg-destructive/10 text-destructive":chosen?"border-primary bg-primary/10":"border-border hover:border-primary/40 hover:bg-secondary/30"}`}><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-sm font-bold">{String.fromCharCode(65+choiceIndex)}</span><span className="flex-1">{choice}</span>{correct&&<Check className="h-5 w-5"/>}{wrong&&<X className="h-5 w-5"/>}</button>})}</div></GlassCard></motion.div></AnimatePresence>
      <div className="grid grid-cols-2 gap-3"><button disabled={index===0} onClick={()=>setIndex((value)=>value-1)} className="flex items-center justify-center gap-2 rounded-2xl bg-secondary py-4 font-semibold disabled:opacity-30"><ChevronLeft className="h-4 w-4"/>Previous</button>{index===questions.length-1&&isConfirmed?<button onClick={submit} className="flex items-center justify-center gap-2 rounded-2xl bg-primary py-4 font-semibold text-primary-foreground"><CheckCircle2 className="h-4 w-4"/>Submit</button>:<button disabled={!selected} onClick={next} className="flex items-center justify-center gap-2 rounded-2xl bg-primary py-4 font-semibold text-primary-foreground disabled:opacity-40">{isConfirmed?"Next":"Check answer"}<ChevronRight className="h-4 w-4"/></button>}</div>
    </div>
  </div>;
}
