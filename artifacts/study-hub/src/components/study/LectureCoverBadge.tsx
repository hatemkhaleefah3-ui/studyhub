import { getScoreBand } from '@/hooks/useStudyData';

interface LectureCoverBadgeProps {
  /** Most recent Flashcards Reader percentage for this lecture, if any. */
  percentage?: number | null;
}

/**
 * Small colored status badge reflecting the lecture's most recent Flashcards
 * Reader session. Only the color + label are shown — never the raw
 * percentage — and nothing renders until at least one session exists.
 */
export function LectureCoverBadge({ percentage }: LectureCoverBadgeProps) {
  if (percentage === undefined || percentage === null) return null;
  const band = getScoreBand(percentage);
  return (
    <span
      className="px-2 py-0.5 rounded-md text-[11px] font-bold text-white shrink-0"
      style={{ backgroundColor: band.color }}
    >
      {band.label}
    </span>
  );
}
