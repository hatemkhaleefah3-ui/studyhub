import { getScoreBand } from '@/hooks/useStudyData';

interface LectureCoverBadgeProps {
  /** Most recent Flashcards Reader percentage for this lecture, if any. */
  percentage?: number | null;
}

/**
 * Small colored status badge reflecting the lecture's most recent Flashcards
 * Reader session. Refined style with neutral background and a colored dot.
 */
export function LectureCoverBadge({ percentage }: LectureCoverBadgeProps) {
  if (percentage === undefined || percentage === null) return null;
  const band = getScoreBand(percentage);
  return (
    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold flex items-center gap-1.5 bg-secondary text-secondary-foreground shrink-0 border border-border/60 shadow-sm">
      <span className="w-1.5 h-1.5 rounded-full shadow-sm" style={{ backgroundColor: band.color }} />
      {band.label}
    </span>
  );
}
