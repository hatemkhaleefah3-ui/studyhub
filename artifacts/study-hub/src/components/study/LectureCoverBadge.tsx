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
    <span 
      className="px-2.5 py-1 rounded-full text-[10px] font-bold flex items-center gap-1.5 border uppercase tracking-wider"
      style={{
        backgroundColor: `${band.color}15`,
        color: band.color,
        borderColor: `${band.color}30`
      }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: band.color }} />
      {band.label}
    </span>
  );
}
