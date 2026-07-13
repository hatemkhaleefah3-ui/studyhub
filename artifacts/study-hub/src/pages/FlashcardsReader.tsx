import { useState } from "react";
import { Link, useRoute, useLocation } from "wouter";
import { ArrowLeft, RotateCcw, Check, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useStudyData, getScoreBand } from "@/hooks/useStudyData";
import { GlassCard } from "@/components/shared/GlassCard";
import { playFlipSound } from "@/lib/sound";

/**
 * Flashcards Reader — flip-card study session with a flip sound and
 * self-marking (Got it / Missed it). Only writes `readerLastPercentage`
 * on the lecture; never touches exam/progress data (spec 1.3).
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

  if (cards.length === 0) {
    return (
      <div className="space-y-6 pb-20">
        <div className="flex items-center gap-3">
          <Link href={`/subjects/${subject.id}/lectures/${lecture.id}`} className="p-2 rounded-full bg-secondary hover:bg-secondary/80 transition-colors">
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

  if (done) {
    const percentage = Math.round((results.filter(Boolean).length / results.length) * 1000) / 10;
    const band = getScoreBand(percentage);
    return (
      <div className="space-y-6 pb-20">
        <div className="flex items-center gap-3">
          <Link href={`/subjects/${subject.id}/lectures/${lecture.id}`} className="p-2 rounded-full bg-secondary hover:bg-secondary/80 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-2xl font-bold" style={{ color: accentColor }}>Session Results</h1>
        </div>
        <GlassCard className="p-8 text-center space-y-4">
          <div
            className="w-24 h-24 rounded-full mx-auto flex items-center justify-center text-3xl font-bold text-white"
            style={{ backgroundColor: band.color }}
          >
            {percentage}%
          </div>
          <div>
            <p className="text-xl font-bold" style={{ color: band.color }}>{band.label}</p>
            <p className="text-muted-foreground mt-1">
              {results.filter(Boolean).length} / {results.length} cards known
            </p>
          </div>
          <div className="flex gap-3 pt-2">
            <button
              onClick={restart}
              className="flex-1 flex items-center justify-center gap-2 rounded-xl py-3 font-semibold bg-secondary hover:bg-secondary/80 transition-colors"
            >
              <RotateCcw className="w-4 h-4" /> Study Again
            </button>
            <button
              onClick={() => setLocation(`/subjects/${subject.id}/lectures/${lecture.id}`)}
              className="flex-1 rounded-xl py-3 font-semibold text-white"
              style={{ backgroundColor: accentColor }}
            >
              Done
            </button>
          </div>
        </GlassCard>
      </div>
    );
  }

  const card = cards[index];

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center gap-3">
        <Link href={`/subjects/${subject.id}/lectures/${lecture.id}`} className="p-2 rounded-full bg-secondary hover:bg-secondary/80 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold truncate" style={{ color: accentColor }}>{lecture.name}</h1>
          <p className="text-sm text-muted-foreground">Card {index + 1} of {cards.length}</p>
        </div>
      </div>

      <div className="h-2 bg-secondary rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{ width: `${(index / cards.length) * 100}%`, backgroundColor: accentColor }}
        />
      </div>

      <div className="flex justify-center py-4" style={{ perspective: 1200 }}>
        <motion.div
          onClick={handleFlip}
          className="w-full max-w-sm h-64 cursor-pointer"
          style={{ transformStyle: "preserve-3d" }}
          animate={{ rotateY: flipped ? 180 : 0 }}
          transition={{ duration: 0.4 }}
        >
          <div
            className="absolute inset-0 rounded-3xl p-8 flex items-center justify-center text-center shadow-lg"
            style={{ backfaceVisibility: "hidden", backgroundColor: `${accentColor}15` }}
          >
            <p className="text-lg font-semibold">{card.front}</p>
          </div>
          <div
            className="absolute inset-0 rounded-3xl p-8 flex items-center justify-center text-center shadow-lg text-white"
            style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)", backgroundColor: accentColor }}
          >
            <p className="text-lg font-semibold">{card.back}</p>
          </div>
        </motion.div>
      </div>

      <p className="text-center text-sm text-muted-foreground">Tap the card to flip it</p>

      <AnimatePresence>
        {flipped && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            className="flex gap-3"
          >
            <button
              onClick={() => mark(false)}
              className="flex-1 flex items-center justify-center gap-2 rounded-2xl py-3.5 font-semibold bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors"
            >
              <X className="w-4 h-4" /> Missed it
            </button>
            <button
              onClick={() => mark(true)}
              className="flex-1 flex items-center justify-center gap-2 rounded-2xl py-3.5 font-semibold text-white hover:opacity-90 transition-opacity"
              style={{ backgroundColor: accentColor }}
            >
              <Check className="w-4 h-4" /> Got it
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
