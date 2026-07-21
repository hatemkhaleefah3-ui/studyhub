import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ChevronLeft, ChevronRight, Clock3, RotateCcw, Sparkles, Target, X } from "lucide-react";
import { useLocation, useRoute, useSearch } from "wouter";
import { useStudyData, getScoreBand, type ExamQuestion, type Flashcard } from "@/hooks/useStudyData";
import { GlassCard } from "@/components/shared/GlassCard";
import { recordExamActivity } from "@/lib/examActivity";

const transition = { duration: .34, ease: [.4, 0, .2, 1] as const };
type FlashRating = "known" | "moderate" | "missed";
type MediaFlashcard = Flashcard & { frontImage?: string; backImage?: string };
type ShuffledQuestion = ExamQuestion & { originalCorrectAnswer: number };
type Item = { kind: "question"; question: ShuffledQuestion } | { kind: "flashcard"; card: MediaFlashcard };
type AnswerValue = number | FlashRating;

function shuffleQuestion(question: ExamQuestion): ShuffledQuestion {
  const correctText = question.choices[question.correctAnswer - 1];
  const choices = [...question.choices];
  for (let i = choices.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [choices[i], choices[j]] = [choices[j], choices[i]]; }
  return { ...question, choices: choices as ExamQuestion["choices"], correctAnswer: choices.findIndex(item => item === correctText) + 1, originalCorrectAnswer: question.correctAnswer };
}

function FaceContent({ text, image, alt }: { text: string; image?: string; alt: string }) {
  const fallbackImage = /^https?:\/\//.test(text) ? text : undefined;
  const src = image || fallbackImage;
  const visibleText = fallbackImage ? "" : text;
  return <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 overflow-y-auto px-3 py-6 text-center">{src && <img src={src} alt={alt} className="max-h-44 max-w-full shrink-0 rounded-2xl object-contain shadow-sm sm:max-h-52" />}{visibleText && <p className="max-w-full break-words text-lg font-black leading-relaxed sm:text-2xl">{visibleText}</p>}</div>;
}

export function ExamTake() {
  const [, params] = useRoute("/subjects/:subjectId/exams/:examId/take");
  const [, setLocation] = useLocation();
  const search = useSearch();
  const { subjects, updateExam } = useStudyData();
  const subject = subjects.find(x => x.id === params?.subjectId);
  const exam = subject?.exams.find(x => x.id === params?.examId);
  const from = new URLSearchParams(search).get("from");
  const flashcards: MediaFlashcard[] = subject && exam ? JSON.parse(localStorage.getItem(`studyhub:final-flashcards:${subject.id}:${exam.type}`) ?? "[]") : [];
  const makeItems = useCallback((): Item[] => [...(exam?.questions ?? []).map(question => ({ kind: "question" as const, question: shuffleQuestion(question) })), ...flashcards.map(card => ({ kind: "flashcard" as const, card }))], [exam?.questions, flashcards]);
  const baseItems = useMemo(makeItems, [makeItems]);
  const [items, setItems] = useState<Item[]>(baseItems);
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({});
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [result, setResult] = useState<any>(null);
  const [showMissed, setShowMissed] = useState(false);
  const [reviewOnly, setReviewOnly] = useState(false);
  const itemsRef = useRef(items), answersRef = useRef(answers), finishedRef = useRef(false), cancelledRef = useRef(false), reviewOnlyRef = useRef(false);
  useEffect(() => { itemsRef.current = items; }, [items]);
  useEffect(() => { answersRef.current = answers; }, [answers]);
  useEffect(() => { reviewOnlyRef.current = reviewOnly; }, [reviewOnly]);
  useEffect(() => { if (result) return; const timer = window.setInterval(() => setSeconds(value => value + 1), 1000); return () => window.clearInterval(timer); }, [result]);

  const goBack = useCallback(() => {
    if (from) setLocation(decodeURIComponent(from));
    else if (window.history.length > 1) window.history.back();
    else if (subject && exam) setLocation(`/subjects/${subject.id}/lectures?type=${exam.type}`);
  }, [exam, from, setLocation, subject]);

  const scoreAttempt = (sourceItems: Item[], sourceAnswers: Record<string, AnswerValue>) => {
    const qCorrect = sourceItems.filter((entry): entry is Extract<Item, { kind: "question" }> => entry.kind === "question").filter(entry => Number(sourceAnswers[entry.question.id] ?? 0) === entry.question.correctAnswer).length;
    const flashPoints = sourceItems.filter((entry): entry is Extract<Item, { kind: "flashcard" }> => entry.kind === "flashcard").reduce((sum, entry) => sum + (sourceAnswers[entry.card.id] === "known" ? 1 : sourceAnswers[entry.card.id] === "moderate" ? .5 : 0), 0);
    const total = sourceItems.length, correct = qCorrect + flashPoints, percentage = total ? Math.round(correct / total * 100) : 0;
    return { score: { correct, total, percentage, takenAt: new Date().toISOString() }, flashPoints };
  };

  const finish = useCallback((automatic = false) => {
    if (!subject || !exam || finishedRef.current || cancelledRef.current) return;
    finishedRef.current = true;
    const scored = scoreAttempt(itemsRef.current, answersRef.current);
    if (!reviewOnlyRef.current) {
      updateExam(subject.id, exam.id, { lastScore: scored.score, checked: scored.score.percentage >= 70 });
      recordExamActivity({ kind: "final", subjectId: subject.id, sourceId: exam.id, percentage: scored.score.percentage, takenAt: scored.score.takenAt });
    }
    setResult({ ...scored, automatic, reviewOnly: reviewOnlyRef.current });
  }, [exam, subject, updateExam]);

  useEffect(() => {
    const hidden = () => { if (document.visibilityState === "hidden") finish(true); };
    const pagehide = () => finish(true);
    document.addEventListener("visibilitychange", hidden); window.addEventListener("pagehide", pagehide);
    return () => { document.removeEventListener("visibilitychange", hidden); window.removeEventListener("pagehide", pagehide); };
  }, [finish]);

  if (!subject || !exam) return <div className="p-8 text-center text-muted-foreground">Exam not found</div>;
  if (!items.length) return <div className="mx-auto flex min-h-[70vh] max-w-xl items-center justify-center"><GlassCard className="w-full border-2 border-dashed bg-transparent p-10 text-center"><p className="text-xl font-bold">No exam content yet</p><button onClick={goBack} className="mt-5 rounded-xl bg-primary px-5 py-3 font-semibold text-primary-foreground">Go back</button></GlassCard></div>;

  const cancel = () => { if (!finishedRef.current) { cancelledRef.current = true; goBack(); } };
  const item = items[index], key = item.kind === "question" ? item.question.id : item.card.id;
  const progress = Math.round((index + 1) / items.length * 100);
  const time = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
  const missed = items.filter(entry => entry.kind === "question" ? Number(answers[entry.question.id] ?? 0) !== entry.question.correctAnswer : answers[entry.card.id] !== "known");
  const next = () => { if (index >= items.length - 1) finish(false); else { setIndex(value => value + 1); setFlipped(false); } };
  const restart = (wrongOnly = false) => { finishedRef.current = false; cancelledRef.current = false; setItems(wrongOnly ? missed : makeItems()); setAnswers({}); setIndex(0); setSeconds(0); setResult(null); setShowMissed(false); setFlipped(false); setReviewOnly(wrongOnly); };

  if (result) {
    const band = getScoreBand(result.score.percentage);
    return <div className="mx-auto max-w-3xl space-y-5 pb-24"><header className="flex items-center gap-3"><button onClick={goBack} className="flex h-11 w-11 items-center justify-center rounded-full border border-border bg-secondary"><ArrowLeft className="h-5 w-5" /></button><div><p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{result.reviewOnly ? "Review complete" : "Exam complete"}</p><h1 className="text-2xl font-bold">{exam.name}</h1></div></header>{result.automatic && <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm font-semibold text-amber-700 dark:text-amber-300">The attempt was submitted because the exam page was left or hidden.</div>}{result.reviewOnly && <div className="rounded-2xl border border-primary/20 bg-primary/10 p-4 text-sm font-semibold text-primary">Practice review only — this did not change your saved degree.</div>}<GlassCard className="p-7 text-center"><div className="mx-auto flex h-28 w-28 items-center justify-center rounded-full text-3xl font-black text-white" style={{ backgroundColor: band.color }}>{result.score.percentage}%</div><h2 className="mt-4 text-2xl font-bold">{band.label}</h2><p className="mt-2 font-semibold">Flashcards: {result.flashPoints} points</p><p className="mt-1 text-sm text-muted-foreground">Unanswered questions and unread flashcards count as 0</p></GlassCard><button onClick={() => setShowMissed(value => !value)} className="w-full rounded-2xl border border-border bg-card p-4 text-left"><b>Review items</b><p className="text-sm text-muted-foreground">{missed.length} need more work</p></button><AnimatePresence>{showMissed && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">{missed.map(entry => entry.kind === "question" ? <GlassCard key={entry.question.id} className="space-y-3 p-4"><b>{entry.question.text}</b><p className="text-sm text-emerald-600">Correct: {entry.question.choices[entry.question.correctAnswer - 1]}</p><p className="text-sm text-destructive">Your answer: {entry.question.choices[Number(answers[entry.question.id] ?? 0) - 1] ?? "Unanswered"}</p></GlassCard> : <GlassCard key={entry.card.id} className="p-4"><FaceContent text={entry.card.front} image={entry.card.frontImage} alt="Question" /><div className="mt-3 border-t border-border/40 pt-4"><FaceContent text={entry.card.back} image={entry.card.backImage} alt="Answer" /></div></GlassCard>)}</motion.div>}</AnimatePresence><div className="grid grid-cols-[.8fr_1.35fr_1fr] gap-3"><button onClick={() => restart(false)} aria-label="Retake full exam" className="rounded-2xl border border-border bg-secondary py-4"><RotateCcw className="mx-auto" /></button><button disabled={!missed.length} onClick={() => restart(true)} className="group flex min-h-20 flex-col items-center justify-center rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/20 via-primary/10 to-transparent px-3 font-bold text-primary shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md disabled:opacity-40"><Target className="mb-1 h-5 w-5 transition-transform group-hover:scale-110" /><span>Retry wrong only</span><small className="mt-1 font-medium opacity-70">Practice · score protected</small></button><button onClick={goBack} className="rounded-2xl bg-primary py-4 font-semibold text-primary-foreground">Done</button></div></div>;
  }

  return <div className="-mx-4 -mt-4 min-h-[calc(100vh-5rem)] bg-background px-4 pb-24 pt-4 md:-mx-6 md:px-6"><div className="mx-auto max-w-3xl space-y-4"><header className="flex items-center gap-3"><button onClick={cancel} aria-label="Cancel exam" className="flex h-11 w-11 items-center justify-center rounded-full border border-border bg-secondary"><X className="h-5 w-5" /></button><div className="min-w-0 flex-1"><p className="truncate text-lg font-bold">{exam.name}</p><p className="text-sm text-muted-foreground">Item {index + 1} of {items.length}{reviewOnly ? " · Review only" : ""}</p></div><div className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 font-mono text-sm"><Clock3 className="h-4 w-4 text-primary" />{time}</div></header><div className="flex gap-2"><button onClick={cancel} className="flex-1 rounded-xl border border-border bg-secondary/50 py-2.5 text-sm font-semibold">Cancel</button><button onClick={() => finish(false)} className="flex-1 rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground">Finish</button></div><div className="h-2 overflow-hidden rounded-full bg-secondary"><motion.div className="h-full rounded-full bg-primary" animate={{ width: `${progress}%` }} /></div><AnimatePresence mode="wait"><motion.div key={key} initial={{ opacity: 0, x: 28 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -28 }} transition={transition}>{item.kind === "question" ? <QuestionView question={item.question} selected={Number(answers[item.question.id] ?? 0)} onSelect={number => setAnswers(value => ({ ...value, [item.question.id]: number }))} /> : <FlashcardView card={item.card} flipped={flipped} onFlip={() => setFlipped(value => !value)} onMark={rating => { setAnswers(value => ({ ...value, [key]: rating })); next(); }} />}</motion.div></AnimatePresence>{item.kind === "question" && <div className="grid grid-cols-2 gap-3"><button disabled={index === 0} onClick={() => setIndex(value => value - 1)} className="rounded-2xl bg-secondary py-4 disabled:opacity-30"><ChevronLeft className="mx-auto" /></button><button disabled={!answers[item.question.id]} onClick={next} className="rounded-2xl bg-primary py-4 text-primary-foreground disabled:opacity-40">{index === items.length - 1 ? "Finish" : "Next"}<ChevronRight className="ml-2 inline" /></button></div>}</div></div>;
}

function QuestionView({ question, selected, onSelect }: { question: ShuffledQuestion; selected: number; onSelect: (number: number) => void }) {
  return <GlassCard className="space-y-5 p-5"><span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold uppercase text-primary">{question.questionType}</span>{question.questionType === "Medical Case MCQ" && (question.labs || question.histo) && <div className="rounded-2xl bg-secondary/30 p-4 text-sm">{question.labs && <p>Labs: {question.labs}</p>}{question.histo && <p>Histo: {question.histo}</p>}</div>}<h2 className="text-xl font-bold">{question.text}</h2><div className="space-y-3">{question.choices.map((choice, i) => { const n = i + 1, chosen = selected === n; return <button key={n} onClick={() => onSelect(n)} className={`flex min-h-14 w-full items-center gap-3 rounded-2xl border-2 px-4 py-3 text-left transition-colors ${chosen ? "border-primary bg-primary/10" : "border-border"}`}><span className="flex h-8 w-8 items-center justify-center rounded-full border font-bold">{String.fromCharCode(65 + i)}</span><span className="flex-1">{choice}</span></button>; })}</div><p className="text-center text-xs text-muted-foreground">Correct answers are revealed only after the exam ends.</p></GlassCard>;
}

function FlashcardView({ card, flipped, onFlip, onMark }: { card: MediaFlashcard; flipped: boolean; onFlip: () => void; onMark: (rating: FlashRating) => void }) {
  return <div className="space-y-3"><div className="rounded-[2rem] bg-gradient-to-br from-primary/20 via-transparent to-primary/5 p-px shadow-xl" style={{ perspective: 1400 }}><motion.button onClick={onFlip} className="relative h-[min(22rem,52vh)] min-h-[17rem] w-full rounded-[2rem] text-left" animate={{ rotateY: flipped ? 180 : 0 }} transition={{ type: "spring", stiffness: 145, damping: 24, mass: .9 }} style={{ transformStyle: "preserve-3d" }}><div className="absolute inset-0 flex min-h-0 flex-col overflow-hidden rounded-[2rem] border border-border/50 bg-card p-6 sm:p-7" style={{ backfaceVisibility: "hidden" }}><div className="flex shrink-0 justify-between"><span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">Front</span><Sparkles className="text-primary" /></div><FaceContent text={card.front} image={card.frontImage} alt="Question" /><p className="shrink-0 border-t border-border/40 pt-3 text-center text-xs text-muted-foreground">Tap to reveal</p></div><div className="absolute inset-0 flex min-h-0 flex-col overflow-hidden rounded-[2rem] border border-primary/25 bg-gradient-to-br from-primary/15 via-card to-card p-6 sm:p-7" style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}><span className="w-fit shrink-0 rounded-full bg-primary px-3 py-1 text-xs font-bold text-primary-foreground">Back</span><FaceContent text={card.back} image={card.backImage} alt="Answer" /><p className="shrink-0 border-t border-border/40 pt-3 text-center text-xs text-muted-foreground">Choose your recall level</p></div></motion.button></div><AnimatePresence>{flipped && <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-3 gap-2"><button onClick={() => onMark("missed")} className="flex min-h-16 flex-col items-center justify-center rounded-2xl bg-destructive/10 px-1 text-xs font-semibold text-destructive"><span>Didn't know</span><small className="mt-1 opacity-70">0 points</small></button><button onClick={() => onMark("moderate")} className="flex min-h-16 flex-col items-center justify-center rounded-2xl bg-amber-500/10 px-1 text-xs font-semibold text-amber-600"><span>Moderate</span><small className="mt-1 opacity-70">0.5 points</small></button><button onClick={() => onMark("known")} className="flex min-h-16 flex-col items-center justify-center rounded-2xl bg-primary px-1 text-xs font-semibold text-primary-foreground"><span>Know it</span><small className="mt-1 opacity-80">1 point</small></button></motion.div>}</AnimatePresence></div>;
}
