import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Check, ChevronLeft, ChevronRight, Clock3, RotateCcw, Sparkles, X } from "lucide-react";
import { useLocation, useRoute, useSearch } from "wouter";
import { useStudyData, getScoreBand, type ExamQuestion, type Flashcard } from "@/hooks/useStudyData";
import { GlassCard } from "@/components/shared/GlassCard";

const transition = { duration: .34, ease: [.4, 0, .2, 1] as const };
type FlashRating = "known" | "moderate" | "missed";
type ShuffledQuestion = ExamQuestion & { originalCorrectAnswer: number };
type Item = { kind: "question"; question: ShuffledQuestion } | { kind: "flashcard"; card: Flashcard };
type AnswerValue = number | FlashRating;

function shuffleQuestion(question: ExamQuestion): ShuffledQuestion {
  const correctText = question.choices[question.correctAnswer - 1];
  const choices = [...question.choices].map((value, index) => ({ value, index }));
  for (let i = choices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [choices[i], choices[j]] = [choices[j], choices[i]];
  }
  return {
    ...question,
    choices: choices.map(item => item.value) as ExamQuestion["choices"],
    correctAnswer: choices.findIndex(item => item.value === correctText) + 1,
    originalCorrectAnswer: question.correctAnswer,
  };
}

export function ExamTake() {
  const [, params] = useRoute("/subjects/:subjectId/exams/:examId/take");
  const [, setLocation] = useLocation();
  const search = useSearch();
  const { subjects, updateExam } = useStudyData();
  const subject = subjects.find(x => x.id === params?.subjectId);
  const exam = subject?.exams.find(x => x.id === params?.examId);
  const from = new URLSearchParams(search).get("from");
  const flashcards: Flashcard[] = subject && exam
    ? JSON.parse(localStorage.getItem(`studyhub:final-flashcards:${subject.id}:${exam.type}`) ?? "[]")
    : [];
  const baseItems: Item[] = useMemo(
    () => [
      ...(exam?.questions ?? []).map(question => ({ kind: "question" as const, question: shuffleQuestion(question) })),
      ...flashcards.map(card => ({ kind: "flashcard" as const, card })),
    ],
    [exam?.id, exam?.questions, subject?.id, exam?.type],
  );
  const [items, setItems] = useState<Item[]>(baseItems);
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({});
  const [confirmed, setConfirmed] = useState<Record<string, boolean>>({});
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [result, setResult] = useState<any>(null);
  const [showMissed, setShowMissed] = useState(false);
  const [sectionIntro, setSectionIntro] = useState<string | null>(null);

  useEffect(() => {
    if (result) return;
    const timer = window.setInterval(() => setSeconds(value => value + 1), 1000);
    return () => window.clearInterval(timer);
  }, [result]);

  if (!subject || !exam) return <div className="p-8 text-center text-muted-foreground">Exam not found</div>;
  const goBack = () => from
    ? setLocation(decodeURIComponent(from))
    : window.history.length > 1
      ? window.history.back()
      : setLocation(`/subjects/${subject.id}/lectures?type=${exam.type}`);
  if (!items.length) return <div className="mx-auto flex min-h-[70vh] max-w-xl items-center justify-center"><GlassCard className="w-full border-dashed border-2 bg-transparent p-10 text-center"><p className="text-xl font-bold">No exam content yet</p><button onClick={goBack} className="mt-5 rounded-xl bg-primary px-5 py-3 font-semibold text-primary-foreground">Go back</button></GlassCard></div>;

  const item = items[index];
  const key = item.kind === "question" ? item.question.id : item.card.id;
  const progress = Math.round((index + 1) / items.length * 100);
  const time = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
  const missed = items.filter(entry => entry.kind === "question"
    ? Number(answers[entry.question.id] ?? 0) !== entry.question.correctAnswer
    : answers[entry.card.id] !== "known");

  const submit = () => {
    const questionItems = items.filter((entry): entry is Extract<Item, { kind: "question" }> => entry.kind === "question");
    const qCorrect = questionItems.filter(entry => Number(answers[entry.question.id] ?? 0) === entry.question.correctAnswer).length;
    const flashPoints = flashcards.reduce((sum, card) => sum + (answers[card.id] === "known" ? 1 : answers[card.id] === "moderate" ? .5 : 0), 0);
    const total = questionItems.length + flashcards.length;
    const correct = qCorrect + flashPoints;
    const percentage = total ? Math.round(correct / total * 100) : 0;
    const score = { correct, total, percentage, takenAt: new Date().toISOString() };
    updateExam(subject.id, exam.id, { lastScore: score, checked: percentage >= 70 });
    localStorage.setItem(`studyhub:exam-history:${exam.id}`, JSON.stringify([
      { ...score, answers, missed: missed.map(entry => entry.kind === "question" ? entry.question.id : entry.card.id), elapsed: seconds },
      ...JSON.parse(localStorage.getItem(`studyhub:exam-history:${exam.id}`) ?? "[]"),
    ].slice(0, 20)));
    setResult({ score, flashPoints });
  };

  const next = () => {
    if (index >= items.length - 1) return submit();
    const nextItem = items[index + 1];
    const currentType = item.kind === "flashcard" ? "Flashcards" : item.question.questionType;
    const nextType = nextItem.kind === "flashcard" ? "Flashcards" : nextItem.question.questionType;
    if (currentType !== nextType) {
      setSectionIntro(nextType);
      window.setTimeout(() => setSectionIntro(null), 700);
    }
    setIndex(value => value + 1);
    setFlipped(false);
  };

  const restart = (wrongOnly = false) => {
    const source = wrongOnly
      ? missed
      : [
          ...(exam.questions ?? []).map(question => ({ kind: "question" as const, question: shuffleQuestion(question) })),
          ...flashcards.map(card => ({ kind: "flashcard" as const, card })),
        ];
    setItems(source);
    setAnswers({});
    setConfirmed({});
    setIndex(0);
    setSeconds(0);
    setResult(null);
    setShowMissed(false);
    setFlipped(false);
  };

  if (result) {
    const band = getScoreBand(result.score.percentage);
    const questions = items.filter((entry): entry is Extract<Item, { kind: "question" }> => entry.kind === "question");
    const mcqs = questions.filter(entry => entry.question.questionType === "MCQ");
    const cases = questions.filter(entry => entry.question.questionType === "Medical Case MCQ");
    const flashDisplay = Number.isInteger(result.flashPoints) ? String(result.flashPoints) : result.flashPoints.toFixed(1);
    return <div className="mx-auto max-w-3xl space-y-5 pb-24">
      <header className="flex items-center gap-3"><button onClick={goBack} className="flex h-11 w-11 items-center justify-center rounded-full border border-border bg-secondary"><ArrowLeft className="h-5 w-5" /></button><div><p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Exam complete</p><h1 className="text-2xl font-bold">{exam.name}</h1></div></header>
      <GlassCard className="overflow-hidden p-0"><div className="p-7 text-center"><div className="mx-auto flex h-28 w-28 items-center justify-center rounded-full text-3xl font-black text-white shadow-lg" style={{ backgroundColor: band.color }}>{result.score.percentage}%</div><h2 className="mt-4 text-2xl font-bold">{band.label}</h2><p className="text-muted-foreground">{result.score.correct} of {result.score.total} · {time}</p></div><div className="grid grid-cols-3 border-t border-border"><Stat label="MCQs" value={`${mcqs.filter(entry => answers[entry.question.id] === entry.question.correctAnswer).length}/${mcqs.length}`} /><Stat label="Medical cases" value={`${cases.filter(entry => answers[entry.question.id] === entry.question.correctAnswer).length}/${cases.length}`} /><Stat label="Flashcards" value={`${flashDisplay}/${flashcards.length}`} /></div></GlassCard>
      <button onClick={() => setShowMissed(value => !value)} className="w-full rounded-2xl border border-border bg-card p-4 text-left shadow-sm transition-all duration-200 hover:shadow-md"><b>Review items</b><p className="text-sm text-muted-foreground">{missed.length} item{missed.length === 1 ? "" : "s"} need more work</p></button>
      <AnimatePresence>{showMissed && <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={transition} className="space-y-3 overflow-hidden">{missed.map(entry => entry.kind === "question" ? <GlassCard key={entry.question.id} className="space-y-3 p-4"><b>{entry.question.text}</b><div className="rounded-xl bg-destructive/10 p-3 text-destructive">Your answer: {Number(answers[entry.question.id]) ? entry.question.choices[Number(answers[entry.question.id]) - 1] : "No answer"}</div><div className="rounded-xl bg-emerald-500/10 p-3 text-emerald-600">Correct: {entry.question.choices[entry.question.correctAnswer - 1]}</div></GlassCard> : <GlassCard key={entry.card.id} className="p-4"><b>{entry.card.front}</b><p className="mt-2 text-muted-foreground">{entry.card.back}</p><p className="mt-3 text-xs font-bold uppercase tracking-wider text-primary">Rating: {String(answers[entry.card.id] ?? "not rated")}</p></GlassCard>)}</motion.div>}</AnimatePresence>
      <div className="grid gap-3 sm:grid-cols-3"><button onClick={() => restart(false)} className="rounded-2xl bg-secondary py-4 font-semibold"><RotateCcw className="mr-2 inline h-4 w-4" />Retake all</button><button disabled={!missed.length} onClick={() => restart(true)} className="rounded-2xl border border-primary/20 bg-primary/10 py-4 font-semibold text-primary disabled:opacity-40">Retry review items</button><button onClick={goBack} className="rounded-2xl bg-primary py-4 font-semibold text-primary-foreground">Done</button></div>
    </div>;
  }

  return <div className="-mx-4 -mt-4 min-h-[calc(100vh-5rem)] bg-background px-4 pb-24 pt-4 md:-mx-6 md:px-6"><div className="mx-auto max-w-3xl space-y-5">
    <header className="flex items-center gap-3"><button onClick={goBack} className="flex h-11 w-11 items-center justify-center rounded-full border border-border bg-secondary"><ArrowLeft className="h-5 w-5" /></button><div className="min-w-0 flex-1"><p className="truncate text-lg font-bold">{exam.name}</p><p className="text-sm text-muted-foreground">Item {index + 1} of {items.length}</p></div><div className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 font-mono text-sm"><Clock3 className="h-4 w-4 text-primary" />{time}</div></header>
    <div className="h-2 overflow-hidden rounded-full bg-secondary"><motion.div className="h-full rounded-full bg-primary" animate={{ width: `${progress}%` }} transition={transition} /></div>
    <AnimatePresence>{sectionIntro && <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="rounded-2xl border border-primary/20 bg-primary/10 p-4 text-center font-bold text-primary">{sectionIntro}</motion.div>}</AnimatePresence>
    <AnimatePresence mode="wait"><motion.div key={key} initial={{ opacity: 0, x: 28 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -28 }} transition={transition}>{item.kind === "question" ? <QuestionView question={item.question} selected={Number(answers[item.question.id] ?? 0)} confirmed={!!confirmed[item.question.id]} onSelect={number => setAnswers(value => ({ ...value, [item.question.id]: number }))} /> : <FlashcardView card={item.card} flipped={flipped} onFlip={() => setFlipped(value => !value)} onMark={rating => { setAnswers(value => ({ ...value, [key]: rating })); next(); }} />}</motion.div></AnimatePresence>
    {item.kind === "question" && <div className="grid grid-cols-2 gap-3"><button disabled={index === 0} onClick={() => setIndex(value => value - 1)} className="rounded-2xl bg-secondary py-4 font-semibold disabled:opacity-30"><ChevronLeft className="mr-2 inline h-4 w-4" />Previous</button>{confirmed[item.question.id] ? <button onClick={next} className="rounded-2xl bg-primary py-4 font-semibold text-primary-foreground">{index === items.length - 1 ? "Submit" : "Next"}<ChevronRight className="ml-2 inline h-4 w-4" /></button> : <button disabled={!answers[item.question.id]} onClick={() => setConfirmed(value => ({ ...value, [item.question.id]: true }))} className="rounded-2xl bg-primary py-4 font-semibold text-primary-foreground disabled:opacity-40">Check answer</button>}</div>}
  </div></div>;
}

function Stat({ label, value }: { label: string; value: string }) {
  return <div className="border-l border-border p-4 text-center first:border-l-0"><p className="text-xl font-bold">{value}</p><p className="text-xs text-muted-foreground">{label}</p></div>;
}

function QuestionView({ question, selected, confirmed, onSelect }: { question: ShuffledQuestion; selected: number; confirmed: boolean; onSelect: (number: number) => void }) {
  return <GlassCard className="space-y-5 p-5 md:p-7"><div><span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold uppercase text-primary">{question.questionType}</span>{question.questionType === "Medical Case MCQ" && (question.labs || question.histo) && <div className="my-4 rounded-2xl border border-border bg-secondary/30 p-4 text-sm"><b>Case context</b>{question.labs && <p>Labs: {question.labs}</p>}{question.histo && <p>Histo: {question.histo}</p>}</div>}<h2 className="mt-4 text-xl font-bold">{question.text}</h2></div><div className="space-y-3">{question.choices.map((choice, optionIndex) => { const optionNumber = optionIndex + 1; const chosen = selected === optionNumber; const correct = confirmed && optionNumber === question.correctAnswer; const wrong = confirmed && chosen && !correct; return <button key={`${question.id}-${optionNumber}`} disabled={confirmed} onClick={() => onSelect(optionNumber)} className={`flex min-h-14 w-full items-center gap-3 rounded-2xl border-2 px-4 py-3 text-left transition-all duration-200 ${correct ? "border-emerald-500 bg-emerald-500/10" : wrong ? "border-destructive bg-destructive/10" : chosen ? "border-primary bg-primary/10" : "border-border"}`}><span className="flex h-8 w-8 items-center justify-center rounded-full border font-bold">{String.fromCharCode(65 + optionIndex)}</span><span className="flex-1">{choice}</span>{correct && <Check />}{wrong && <X />}</button>; })}</div></GlassCard>;
}

function FlashcardView({ card, flipped, onFlip, onMark }: { card: Flashcard; flipped: boolean; onFlip: () => void; onMark: (rating: FlashRating) => void }) {
  return <div className="space-y-4">
    <div className="rounded-[2rem] bg-gradient-to-br from-primary/20 via-transparent to-primary/5 p-[1px] shadow-xl" style={{ perspective: 1400 }}>
      <motion.button onClick={onFlip} className="relative h-[22rem] w-full rounded-[calc(2rem-1px)] text-left" animate={{ rotateY: flipped ? 180 : 0 }} transition={{ type: "spring", stiffness: 135, damping: 22, mass: .95 }} style={{ transformStyle: "preserve-3d" }}>
        <div className="absolute inset-0 flex flex-col rounded-[calc(2rem-1px)] border border-border/50 bg-card p-7 shadow-inner" style={{ backfaceVisibility: "hidden" }}>
          <div className="flex items-center justify-between"><span className="rounded-full bg-primary/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-primary">Front</span><Sparkles className="h-5 w-5 text-primary/70" /></div>
          <div className="mt-8 flex flex-1 items-center justify-center px-3 pb-10 text-center text-2xl font-black leading-relaxed">{card.front}</div>
          <p className="mt-4 border-t border-border/40 pt-4 text-center text-xs font-semibold text-muted-foreground">Tap to reveal the answer</p>
        </div>
        <div className="absolute inset-0 flex flex-col rounded-[calc(2rem-1px)] border border-primary/25 bg-gradient-to-br from-primary/15 via-card to-card p-7" style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}>
          <div className="flex items-center justify-between"><span className="rounded-full bg-primary px-3 py-1 text-[10px] font-black uppercase tracking-widest text-primary-foreground">Back</span><Check className="h-5 w-5 text-primary" /></div>
          <div className="mt-8 flex flex-1 items-center justify-center px-3 pb-10 text-center text-2xl font-black leading-relaxed">{card.back}</div>
          <p className="mt-4 border-t border-border/40 pt-4 text-center text-xs font-semibold text-muted-foreground">Choose how well you remembered it</p>
        </div>
      </motion.button>
    </div>
    <AnimatePresence>{flipped && <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }} transition={{ duration: .24, ease: [.4, 0, .2, 1] }} className="grid grid-cols-3 gap-2"><button onClick={() => onMark("missed")} className="min-h-14 rounded-2xl border border-destructive/20 bg-destructive/10 px-2 text-sm font-semibold text-destructive">Didn't know it</button><button onClick={() => onMark("moderate")} className="min-h-14 rounded-2xl border border-amber-500/25 bg-amber-500/10 px-2 text-sm font-semibold text-amber-600 dark:text-amber-400">Moderate</button><button onClick={() => onMark("known")} className="min-h-14 rounded-2xl bg-primary px-2 text-sm font-semibold text-primary-foreground">Know it</button></motion.div>}</AnimatePresence>
  </div>;
}
