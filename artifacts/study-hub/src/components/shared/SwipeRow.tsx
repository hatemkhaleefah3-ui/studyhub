import { useState } from 'react';
import { motion, PanInfo } from 'framer-motion';
import { LucideIcon } from 'lucide-react';

interface SwipeRowProps {
  children: React.ReactNode;
  onTap?: () => void;
  /** Swipe left-to-right (dragging the row to the right) */
  onSwipeRight?: () => void;
  rightLabel?: string;
  rightIcon?: LucideIcon;
  rightColor?: string;
  /** Swipe right-to-left (dragging the row to the left) */
  onSwipeLeft?: () => void;
  leftLabel?: string;
  leftIcon?: LucideIcon;
  leftColor?: string;
  className?: string;
}

const THRESHOLD = 72;

/**
 * A list row that supports tap, swipe-left-to-right, and swipe-right-to-left
 * gestures, built on framer-motion's drag (already a project dependency —
 * no new gesture library needed). Reveals a colored action hint under the
 * row while dragging, then snaps back and fires the corresponding callback
 * once the drag exceeds THRESHOLD.
 */
export function SwipeRow({
  children,
  onTap,
  onSwipeRight,
  rightLabel,
  rightIcon: RightIcon,
  rightColor = '#22c55e',
  onSwipeLeft,
  leftLabel,
  leftIcon: LeftIcon,
  leftColor = '#ef4444',
  className,
}: SwipeRowProps) {
  const [dragX, setDragX] = useState(0);

  const handleDrag = (_: unknown, info: PanInfo) => {
    setDragX(info.offset.x);
  };

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    setDragX(0);
    if (info.offset.x > THRESHOLD && onSwipeRight) onSwipeRight();
    else if (info.offset.x < -THRESHOLD && onSwipeLeft) onSwipeLeft();
  };

  const showRight = dragX > 8 && !!onSwipeRight;
  const showLeft = dragX < -8 && !!onSwipeLeft;

  return (
    <div className={`relative overflow-hidden rounded-3xl ${className || ''}`}>
      {(showRight || showLeft) && (
        <div
          className="absolute inset-0 flex items-center rounded-3xl px-5"
          style={{
            backgroundColor: showRight ? rightColor : leftColor,
            justifyContent: showRight ? 'flex-start' : 'flex-end',
          }}
        >
          <div className="flex items-center gap-2 text-white font-semibold">
            {showRight && RightIcon && <RightIcon className="w-5 h-5" />}
            {showRight && rightLabel && <span>{rightLabel}</span>}
            {showLeft && leftLabel && <span>{leftLabel}</span>}
            {showLeft && LeftIcon && <LeftIcon className="w-5 h-5" />}
          </div>
        </div>
      )}
      <motion.div
        drag="x"
        dragElastic={0.6}
        dragConstraints={{ left: 0, right: 0 }}
        onDrag={handleDrag}
        onDragEnd={handleDragEnd}
        onClick={() => {
          if (Math.abs(dragX) < 4) onTap?.();
        }}
        className="relative"
        style={{ touchAction: 'pan-y' }}
      >
        {children}
      </motion.div>
    </div>
  );
}
