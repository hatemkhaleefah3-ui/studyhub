import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Check, Minus, RotateCcw, X } from "lucide-react";
import { useLocation, useRoute } from "wouter";
import { useStudyData, getScoreBand, type Flashcard } from "@/hooks/useStudyData";
import { GlassCard } from "@/components/shared/GlassCard";
import { playFlipSound } from "@/lib/sound";

const pageTransition = { duration: 0.34, ease: [0.4, 0, 0.2, 1] as const };
type Rating = "known" | "moderate" | "missed";
type MediaFlashcard = Flashcard & { frontImage?: string; backImage?: string };

function FaceContent({ text, image, alt }: { text: string; image?: string; alt: string }) {
  const fallbackImage = /^https?:\/\//.test(text) ? text : undefined;
  const visibleText = fallbackImage ? "" : text;
  const src = image || fallbackImage;
  return <div className="flex h-full w-full flex-col items-center justify-center gap-5 px-3 pt-7 text-center">{src && <img src={src} alt={alt} className="max-h-56 max-w-full rounded-2xl object-contain shadow-sm" />}{visibleText && <p className="text-2xl font-bold leading-relaxed">{visibleText}</p>}</div>;
}

const ratingPoints = (rating: Rating) => rating === "known" ? 1 : rating === "moderate" ? .5 : 0;

export function FlashcardsReader() {
  const [, params] = useRoute("/subjects/:subjectId/lectures/:lectureId/study");
  const [, setLocation] = useLocation();
  const { subjects, recordReaderSession } = useStudyData();
  const subject = subjects.find(item => item.id === params?.subjectId);
  const lecture = subject?.lectures.find(item => item.id === params?.lectureId);
  const cards = (lecture?.flashcards ?? []) as MediaFlashcard[];
  const [index, setIndex] = useState(0), [flipped, setFlipped] = useState(false), [results, setResults] = useState<Rating[]>([]), [done, setDone] = useState(false);

  if (!subject || !lecture) return <div className="p-8 text-center text-muted-foreground">Lecture not found</div>;
  const goBack = () => window.history.length > 1 ? window.history.back() : setLocation(`/subjects/${subject.id}/lectures?type=${lecture.type}`);
  if (!cards.length) return <div className="mx-auto flex min-h-[70vh] max-w-xl items-center"><GlassCard className="w-full border-dashed border-2 bg-transparent p-10 text-center"><p className="text-xl font-bold">No flashcards yet</p><p className="mt-2 text-sm text-muted-foreground">Import a Flashcards spreadsheet from this lecture’s settings.</p><button onClick={goBack} className="mt-5 rounded-xl bg-primary px-5 py-3 font-semibold text-primary-foreground">Go back</button></GlassCard></div>;

  const mark = (rating: Rating) => {
    if (!flipped) return;
    const next = [...results, rating];
    if (index === cards.length - 1) {
      const points = next.reduce((sum, item) => sum + ratingPoints(item), 0);
      recordReaderSession(subject.id, lecture.id, Math.round(points / next.length * 1000) / 10);
      setResults(next); setDone(true);
    } else { setResults(next); setIndex(value => value + 1); setFlipped(false); }
  };
  const restart = () => { setIndex(0); setFlipped(false); setResults([]); setDone(false); };

  if (done) {
    const points = results.reduce((sum, item) => sum + ratingPoints(item), 0);
    const percentage = Math.round(points / results.length * 1000) / 10;
    const band = getScoreBand(percentage);
    const review = cards.filter((_, itemIndex) => results[itemIndex] !== "known");
    const pointDisplay = Number.isInteger(points) ? String(points) : points.toFixed(1);
    return <div className="mx-auto max-w-3xl space-y-5 pb-24"><header className="flex items-center gap-3"><button onClick={goBack} className="flex h-11 w-11 items-center justify-center rounded-full border border-border bg-secondary"><ArrowLeft className="h-5 w-5" /></button><div><p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Session complete</p><h1 className="text-2xl font-bold">{lecture.name}</h1></div></header><GlassCard className="p-7 text-center"><div className="mx-auto flex h-28 w-28 items-center justify-center rounded-full text-3xl font-black text-white shadow-lg" style={{ backgroundColor: band.color }}>{percentage}%</div><h2 className="mt-4 text-2xl font-bold" style={{ color: band.color }}>{band.label}</h2><p className="mt-2 font-semibold">{pointDisplay} of {results.length} points</p><p className="mt-1 text-muted-foreground">{results.filter(item => item === "known").length} full degree · {results.filter(item => item === "moderate").length} half degree · {results.filter(item => item === "missed").length} no degree</p></GlassCard>{review.length > 0 && <div className="space-y-3">{review.map(card => <GlassCard key={card.id} className="p-4"><FaceContent text={card.front} image={card.frontImage} alt="Question" /><div className="mt-3 border-t border-border/40 pt-4"><FaceContent text={card.back} image={card.backImage} alt="Answer" /></div></GlassCard>)}</div>}<div className="grid grid-cols-2 gap-3"><button onClick={restart} className="flex items-center justify-center gap-2 rounded-2xl bg-secondary py-4 font-semibold"><RotateCcw className="h-4 w-4" />Study again</button><button onClick={goBack} className="rounded-2xl bg-primary py-4 font-semibold text-primary-foreground">Done</button></div></div>;
  }

  const card = cards[index], progress = Math.round((index + 1) / cards.length * 100);
  const flip = () => { playFlipSound(); setFlipped(value => !value); };
  return <div className="-mx-4 -mt-4 min-h-[calc(100vh-5rem)] bg-background px-4 pb-24 pt-4 md:-mx-6 md:px-6"><div className="mx-auto flex min-h-[calc(100vh-8rem)] max-w-3xl flex-col gap-5"><header className="flex items-center gap-3"><button onClick={goBack} className="flex h-11 w-11 items-center justify-center rounded-full border border-border bg-secondary"><ArrowLeft className="h-5 w-5" /></button><div className="min-w-0 flex-1"><p className="truncate text-lg font-bold">{lecture.name}</p><p className="text-sm text-muted-foreground">Card {index + 1} of {cards.length}</p></div></header><div className="h-2 overflow-hidden rounded-full bg-secondary"><motion.div className="h-full rounded-full bg-primary" animate={{ width: `${progress}%` }} transition={pageTransition} /></div><div className="flex flex-1 items-center justify-center" style={{ perspective: 1400 }}><AnimatePresence mode="wait"><motion.div key={index} initial={{ opacity: 0, x: 28 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -28 }} transition={pageTransition} className="w-full"><motion.button onClick={flip} className="relative h-[420px] w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" style={{ transformStyle: "preserve-3d" }} animate={{ rotateY: flipped ? 180 : 0 }} transition={{ type: "spring", stiffness: 150, damping: 24, mass: .9 }}><div className="absolute inset-0 flex flex-col rounded-[2rem] border border-border bg-card p-7 shadow-xl" style={{ backfaceVisibility: "hidden" }}><div className="flex items-center justify-between"><span className="text-xs font-black uppercase tracking-widest text-primary">Question</span><span className="text-xs text-muted-foreground">Tap to reveal</span></div><FaceContent text={card.front} image={card.frontImage} alt="Question" /></div><div className="absolute inset-0 flex flex-col rounded-[2rem] border border-primary/30 bg-primary p-7 text-primary-foreground shadow-xl" style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}><div className="flex items-center justify-between"><span className="text-xs font-black uppercase tracking-widest opacity-80">Answer</span><span className="text-xs opacity-70">Tap to hide</span></div><FaceContent text={card.back} image={card.backImage} alt="Answer" /></div></motion.button></motion.div></AnimatePresence></div><AnimatePresence>{flipped && <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 12 }} transition={pageTransition} className="grid grid-cols-3 gap-2"><button onClick={() => mark("missed")} className="flex min-h-16 flex-col items-center justify-center rounded-2xl border border-destructive/20 bg-destructive/10 px-2 text-destructive"><span className="flex items-center gap-1 text-sm font-semibold"><X className="h-4 w-4" />Didn't know it</span><span className="mt-1 text-[10px] font-bold uppercase tracking-wide opacity-70">0 points</span></button><button onClick={() => mark("moderate")} className="flex min-h-16 flex-col items-center justify-center rounded-2xl border border-amber-500/25 bg-amber-500/10 px-2 text-amber-600 dark:text-amber-400"><span className="flex items-center gap-1 text-sm font-semibold"><Minus className="h-4 w-4" />Moderate</span><span className="mt-1 text-[10px] font-bold uppercase tracking-wide opacity-70">0.5 point</span></button><button onClick={() => mark("known")} className="flex min-h-16 flex-col items-center justify-center rounded-2xl bg-primary px-2 text-primary-foreground"><span className="flex items-center gap-1 text-sm font-semibold"><Check className="h-4 w-4" />Know it</span><span className="mt-1 text-[10px] font-bold uppercase tracking-wide opacity-80">1 point</span></button></motion.div>}</AnimatePresence></div></div>;
}
