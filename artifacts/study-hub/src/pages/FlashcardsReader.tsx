import { useState } from "react";
import { Link, useRoute, useLocation } from "wouter";
import { ArrowLeft, RotateCcw, Check, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useStudyData, getScoreBand } from "@/hooks/useStudyData";
import { GlassCard } from "@/components/shared/GlassCard";
import { playFlipSound } from "@/lib/sound";

/**
 * Flashcards Reader — immersive flip-card study session.
 * Tap the card to flip · Got it / Missed it to mark · results show per-card breakdown.
 * Only writes `readerLastPercentage` on the lecture; never touches exam/progress data.
 */
export function FlashcardsReader() {
  const [, params] = useRoute("/subjects/:subjectId/lectures/:lectureId/study");
  const [, setLocation] = useLocation();
  const { subjects, recordReaderSession } = useStudyData();

  const subject = subjects.find(s => s.id === params?.subjectId);
  const lecture = subject?.lectures.find(l => l.id === params?.lectureId);

  const cards = lecture?.flashcards || [];
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [results, setResults] = useState<boolean[]>([]);
  const [done, setDone] = useState(false);

  if (!subject || !lecture) {
    return <div className="p-8 text-center text-muted-foreground">Lecture not found</div>;
  }

  const accentColor = subject.color;

  // ── No cards ────────────────────────────────────────────────────────────────
  if (cards.length === 0) {
    return (
      <div className="space-y-6 pb-20">
        <div className="flex items-center gap-3">
          <Link
            href={`/subjects/${subject.id}/lectures/${lecture.id}`}
            className="p-2 rounded-full bg-secondary hover:bg-secondary/80 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-2xl font-bold" style={{ color: accentColor }}>{lecture.name}</h1>
        </div>
        <GlassCard className="p-10 text-center text-muted-foreground border-dashed border-2 bg-transparent">
          <p className="font-medium">No flashcards yet</p>
          <button
            onClick={() => setLocation(`/subjects/${subject.id}/lectures/${lecture.id}/flashcards`)}
            className="mt-4 text-white font-semibold rounded-xl px-5 py-2.5"
            style={{ backgroundColor: accentColor }}
          >
            Make some
          </button>
        </GlassCard>
      </div>
    );
  }

  const handleFlip = () => {
    playFlipSound();
    setFlipped(f => !f);
  };

  const mark = (gotIt: boolean) => {
    const nextResults = [...results, gotIt];
    if (index + 1 >= cards.length) {
      const percentage = Math.round((nextResults.filter(Boolean).length / nextResults.length) * 1000) / 10;
      recordReaderSession(subject.id, lecture.id, percentage);
      setResults(nextResults);
      setDone(true);
    } else {
      setResults(nextResults);
      setIndex(i => i + 1);
      setFlipped(false);
    }
  };

  const restart = () => {
    setIndex(0);
    setFlipped(false);
    setResults([]);
    setDone(false);
  };

  // ── Results screen ──────────────────────────────────────────────────────────
  if (done) {
    const correct = results.filter(Boolean).length;
    const percentage = Math.round((correct / results.length) * 1000) / 10;
    const band = getScoreBand(percentage);

    return (
      <div className="space-y-5 pb-20">
        <div className="flex items-center gap-3">
          <Link
            href={`/subjects/${subject.id}/lectures/${lecture.id}`}
            className="p-2 rounded-full bg-secondary hover:bg-secondary/80 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold" style={{ color: accentColor }}>Session Results</h1>
            <p className="text-sm text-muted-foreground">{lecture.name}</p>
          </div>
        </div>

        {/* Score card */}
        <GlassCard className="p-7 text-center space-y-4">
          <div
            className="w-28 h-28 rounded-full mx-auto flex items-center justify-center text-3xl font-black text-white shadow-lg"
            style={{ backgroundColor: band.color }}
          >
            {percentage}%
          </div>
          <div>
            <p className="text-xl font-bold" style={{ color: band.color }}>{band.label}</p>
            <p className="text-muted-foreground mt-1">
              {correct} / {results.length} cards known
            </p>
          </div>
          <div className="flex gap-3 pt-1">
            <button
              onClick={restart}
              className="flex-1 flex items-center justify-center gap-2 rounded-2xl py-3.5 font-semibold bg-secondary hover:bg-secondary/80 transition-colors text-sm"
            >
              <RotateCcw className="w-4 h-4" /> Study Again
            </button>
            <button
              onClick={() => setLocation(`/subjects/${subject.id}/lectures/${lecture.id}`)}
              className="flex-1 rounded-2xl py-3.5 font-semibold text-white text-sm"
              style={{ backgroundColor: accentColor }}
            >
              Done
            </button>
          </div>
        </GlassCard>

        {/* Per-card breakdown */}
        <div className="space-y-2">
          <p className="text-xs font-black uppercase tracking-widest text-muted-foreground px-0.5">
            Card Breakdown
          </p>
          {cards.map((card, i) => {
            const got = results[i];
            return (
              <div
                key={card.id}
                className={`flex items-start gap-3 p-4 rounded-2xl border ${
                  got
                    ? "border-emerald-500/25 bg-emerald-500/5"
                    : "border-rose-500/25 bg-rose-500/5"
                }`}
              >
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                    got ? "bg-emerald-500" : "bg-rose-500"
                  }`}
                >
                  {got ? (
                    <Check className="w-3.5 h-3.5 text-white" />
                  ) : (
                    <X className="w-3.5 h-3.5 text-white" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold leading-snug">{card.front}</p>
                  <p className="text-xs text-muted-foreground mt-1 leading-snug line-clamp-2">
                    {card.back}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ── Study session ────────────────────────────────────────────────────────────
  const card = cards[index];

  // Progress segments (cap at 30; beyond that show text only)
  const showDots = cards.length <= 30;

  return (
    <div className="flex flex-col min-h-[calc(100vh-140px)] pb-20">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <Link
          href={`/subjects/${subject.id}/lectures/${lecture.id}`}
          className="p-2 rounded-full bg-secondary hover:bg-secondary/80 transition-colors shrink-0"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold truncate" style={{ color: accentColor }}>
            {lecture.name}
          </h1>
          <p className="text-sm text-muted-foreground">
            Card {index + 1} of {cards.length}
          </p>
        </div>
        {/* Running score */}
        {results.length > 0 && (
          <div className="shrink-0 flex items-center gap-2 text-xs font-bold">
            <span className="text-emerald-500">{results.filter(Boolean).length}✓</span>
            <span className="text-rose-500">{results.filter(r => !r).length}✗</span>
          </div>
        )}
      </div>

      {/* Progress segments */}
      {showDots ? (
        <div className="flex gap-1 mb-6">
          {cards.map((_, i) => (
            <div
              key={i}
              className="h-1.5 rounded-full flex-1 transition-all duration-300"
              style={{
                backgroundColor:
                  i === index
                    ? accentColor
                    : i < results.length
                    ? results[i]
                      ? "#22c55e"
                      : "#f43f5e"
                    : "hsl(var(--border))",
                transform: i === index ? "scaleY(1.4)" : "scaleY(1)",
              }}
            />
          ))}
        </div>
      ) : (
        <div className="flex items-center justify-between text-xs text-muted-foreground mb-5 px-0.5">
          <span>
            {results.filter(Boolean).length} correct · {results.filter(r => !r).length} missed
          </span>
          <span>
            {index + 1} / {cards.length}
          </span>
        </div>
      )}

      {/* 3-D flip card */}
      <div className="flex-1 flex flex-col justify-center" style={{ perspective: 1400 }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={index}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.15 }}
          >
            <motion.div
              onClick={handleFlip}
              className="w-full cursor-pointer"
              style={{ transformStyle: "preserve-3d", height: 320 }}
              animate={{ rotateY: flipped ? 180 : 0 }}
              transition={{ duration: 0.45, ease: [0.23, 1, 0.32, 1] }}
            >
              {/* ── Front ── */}
              <div
                className="absolute inset-0 rounded-3xl flex flex-col shadow-xl border border-border"
                style={{ backfaceVisibility: "hidden", backgroundColor: "hsl(var(--card))" }}
              >
                {/* Label */}
                <div className="px-6 pt-5 pb-2 flex items-center gap-2">
                  <span
                    className="text-[10px] font-black uppercase tracking-widest"
                    style={{ color: accentColor }}
                  >
                    Question
                  </span>
                  <div className="flex-1 h-px bg-border/50" />
                  <span className="text-[10px] text-muted-foreground font-medium opacity-50">
                    {index + 1}/{cards.length}
                  </span>
                </div>
                {/* Text */}
                <div className="flex-1 flex items-center justify-center px-8 py-4">
                  <p className="text-xl font-bold text-center leading-relaxed">{card.front}</p>
                </div>
                {/* Hint */}
                <div className="px-6 pb-5 flex items-center justify-center gap-1.5 text-muted-foreground">
                  <div className="w-4 h-0.5 rounded-full bg-border" />
                  <p className="text-xs font-medium opacity-60">tap to reveal answer</p>
                  <div className="w-4 h-0.5 rounded-full bg-border" />
                </div>
              </div>

              {/* ── Back ── */}
              <div
                className="absolute inset-0 rounded-3xl flex flex-col shadow-xl text-white"
                style={{
                  backfaceVisibility: "hidden",
                  transform: "rotateY(180deg)",
                  backgroundColor: accentColor,
                }}
              >
                {/* Label */}
                <div className="px-6 pt-5 pb-2 flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-widest opacity-80">
                    Answer
                  </span>
                  <div className="flex-1 h-px bg-white/20" />
                </div>
                {/* Text */}
                <div className="flex-1 flex items-center justify-center px-8 py-4">
                  <p className="text-xl font-bold text-center leading-relaxed">{card.back}</p>
                </div>
                {/* Hint */}
                <div className="px-6 pb-5 flex items-center justify-center">
                  <p className="text-xs font-medium opacity-50">how did you do?</p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Got it / Missed it */}
      <div className="mt-6 min-h-[60px]">
        <AnimatePresence>
          {flipped && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 16 }}
              transition={{ duration: 0.2 }}
              className="flex gap-3"
            >
              <button
                onClick={() => mark(false)}
                className="flex-1 flex items-center justify-center gap-2 rounded-2xl py-4 font-bold text-sm bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 active:scale-[0.98] transition-all"
              >
                <X className="w-5 h-5" /> Missed it
              </button>
              <button
                onClick={() => mark(true)}
                className="flex-1 flex items-center justify-center gap-2 rounded-2xl py-4 font-bold text-sm text-white hover:opacity-90 active:scale-[0.98] transition-all shadow-md"
                style={{ backgroundColor: accentColor }}
              >
                <Check className="w-5 h-5" /> Got it!
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
