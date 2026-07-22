import { useRef, useState } from 'react';
import { motion, type PanInfo } from 'framer-motion';
import { Check, type LucideIcon } from 'lucide-react';

interface SwipeRowProps {
  children: React.ReactNode;
  onTap?: () => void;
  onSwipeRight?: () => void;
  rightLabel?: string;
  rightIcon?: LucideIcon;
  rightColor?: string;
  onSwipeLeft?: () => void;
  leftLabel?: string;
  leftIcon?: LucideIcon;
  leftColor?: string;
  onLongPress?: () => void;
  longPressColor?: string;
  longPressDuration?: number;
  className?: string;
}

const THRESHOLD = 72;
const HOLD_MOVE_THRESHOLD = 10;
const HOLD_ARM_DELAY = 110;
const MIN_RETREAT_DURATION = 110;

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
  onLongPress,
  longPressColor,
  longPressDuration = 560,
  className,
}: SwipeRowProps) {
  const [dragX, setDragX] = useState(0);
  const [holdRadius, setHoldRadius] = useState(0);
  const [holdOrigin, setHoldOrigin] = useState({ x: 50, y: 50 });
  const [holdTransitionMs, setHoldTransitionMs] = useState(longPressDuration);
  const [holdComplete, setHoldComplete] = useState(false);

  const armTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const commitTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pointerStart = useRef({ x: 0, y: 0 });
  const holdStartedAt = useRef(0);
  const targetRadius = useRef(0);
  const longPressCommitted = useRef(false);
  const holdGestureOwned = useRef(false);
  const suppressTap = useRef(false);
  const pressedText = useRef('');

  const isFinalExamCard = rightLabel === 'Edit' && (leftLabel === 'Examine' || leftLabel === 'Add Questions');
  const isLectureCard = !!leftLabel?.toLowerCase().includes('mcq') && !!rightLabel?.toLowerCase().includes('flashcard');
  const hasLongPress = !!onLongPress || isLectureCard;
  const effectiveHoldColor = longPressColor ?? (isLectureCard ? 'hsl(var(--primary) / 0.94)' : 'hsl(var(--primary) / 0.22)');

  const clearTimers = () => {
    if (armTimer.current) clearTimeout(armTimer.current);
    if (commitTimer.current) clearTimeout(commitTimer.current);
    armTimer.current = null;
    commitTimer.current = null;
  };

  const retreatHold = () => {
    clearTimers();
    if (holdGestureOwned.current) suppressTap.current = true;

    const elapsed = holdStartedAt.current ? Date.now() - holdStartedAt.current : 0;
    const fraction = Math.min(1, Math.max(0, elapsed / longPressDuration));
    setHoldTransitionMs(Math.max(MIN_RETREAT_DURATION, Math.round(longPressDuration * fraction)));
    setHoldRadius(0);
    setHoldComplete(false);
    longPressCommitted.current = false;
    holdGestureOwned.current = false;
  };

  const runLongPressAction = () => {
    if (onLongPress) onLongPress();
    else if (isLectureCard) {
      window.dispatchEvent(new CustomEvent('studyhub:lecture-longpress-open', {
        detail: { text: pressedText.current },
      }));
    }
  };

  const handleDrag = (_: unknown, info: PanInfo) => {
    setDragX(info.offset.x);
    if (Math.abs(info.offset.x) > HOLD_MOVE_THRESHOLD) retreatHold();
  };

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    if (holdGestureOwned.current || longPressCommitted.current) {
      setDragX(0);
      return;
    }

    const swipedRight = info.offset.x > THRESHOLD && !!onSwipeRight;
    const swipedLeft = info.offset.x < -THRESHOLD && !!onSwipeLeft;
    setDragX(0);
    clearTimers();

    if (swipedRight || swipedLeft) suppressTap.current = true;
    if (swipedRight) {
      if (isFinalExamCard) window.dispatchEvent(new CustomEvent('studyhub:final-exam-import-sheet'));
      else onSwipeRight?.();
    } else if (swipedLeft) onSwipeLeft?.();
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    suppressTap.current = false;
    if (!hasLongPress) return;

    const rect = event.currentTarget.getBoundingClientRect();
    const localX = event.clientX - rect.left;
    const localY = event.clientY - rect.top;
    const farthestX = Math.max(localX, rect.width - localX);
    const farthestY = Math.max(localY, rect.height - localY);

    setHoldOrigin({
      x: (localX / rect.width) * 100,
      y: (localY / rect.height) * 100,
    });
    targetRadius.current = Math.ceil(Math.hypot(farthestX, farthestY)) + 2;
    pressedText.current = event.currentTarget.textContent ?? '';
    pointerStart.current = { x: event.clientX, y: event.clientY };
    longPressCommitted.current = false;
    holdGestureOwned.current = false;
    holdStartedAt.current = 0;
    setHoldComplete(false);
    setHoldTransitionMs(0);
    setHoldRadius(0);
    clearTimers();

    armTimer.current = setTimeout(() => {
      holdGestureOwned.current = true;
      suppressTap.current = true;
      holdStartedAt.current = Date.now();
      setHoldTransitionMs(longPressDuration);
      requestAnimationFrame(() => setHoldRadius(targetRadius.current));
      commitTimer.current = setTimeout(() => {
        longPressCommitted.current = true;
        setHoldComplete(true);
      }, longPressDuration);
    }, HOLD_ARM_DELAY);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!hasLongPress) return;
    const distance = Math.hypot(event.clientX - pointerStart.current.x, event.clientY - pointerStart.current.y);
    if (distance > HOLD_MOVE_THRESHOLD) retreatHold();
  };

  const handlePointerEnd = () => {
    const shouldCommit = longPressCommitted.current && holdGestureOwned.current;
    clearTimers();

    if (shouldCommit) {
      suppressTap.current = true;
      runLongPressAction();
      setHoldTransitionMs(180);
      setHoldRadius(0);
      setHoldComplete(false);
    } else {
      retreatHold();
    }

    longPressCommitted.current = false;
    holdGestureOwned.current = false;
  };

  const showRight = dragX > 8 && !!onSwipeRight;
  const showLeft = dragX < -8 && !!onSwipeLeft;
  const displayedRightLabel = isFinalExamCard ? 'Add Questions' : rightLabel;
  const DisplayedRightIcon = isFinalExamCard ? LeftIcon : RightIcon;

  return (
    <div className={`relative isolate overflow-hidden rounded-3xl ${className || ''}`}>
      {(showRight || showLeft) && (
        <div
          className="absolute inset-0 flex items-center overflow-hidden rounded-3xl px-5"
          style={{
            backgroundColor: showRight ? rightColor : leftColor,
            justifyContent: showRight ? 'flex-start' : 'flex-end',
          }}
        >
          <div className="flex items-center gap-2 font-semibold text-white">
            {showRight && DisplayedRightIcon && <DisplayedRightIcon className="h-5 w-5" />}
            {showRight && displayedRightLabel && <span>{displayedRightLabel}</span>}
            {showLeft && leftLabel && <span>{leftLabel}</span>}
            {showLeft && LeftIcon && <LeftIcon className="h-5 w-5" />}
          </div>
        </div>
      )}

      <motion.div
        drag="x"
        dragElastic={0.6}
        dragConstraints={{ left: 0, right: 0 }}
        onDrag={handleDrag}
        onDragEnd={handleDragEnd}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        onPointerCancel={retreatHold}
        onPointerLeave={retreatHold}
        onClick={() => {
          if (suppressTap.current) {
            suppressTap.current = false;
            return;
          }
          if (Math.abs(dragX) < 4) onTap?.();
        }}
        className="relative overflow-hidden rounded-3xl bg-card will-change-transform"
        style={{ touchAction: 'pan-y' }}
      >
        {hasLongPress && (
          <>
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 z-10 rounded-3xl motion-reduce:transition-none"
              style={{
                backgroundColor: effectiveHoldColor,
                clipPath: `circle(${holdRadius}px at ${holdOrigin.x}% ${holdOrigin.y}%)`,
                transition: `clip-path ${holdTransitionMs}ms cubic-bezier(0.4, 0, 0.2, 1)`,
              }}
            />
            <span
              aria-hidden="true"
              className={`pointer-events-none absolute z-30 flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/35 bg-white/20 text-white shadow-lg backdrop-blur-sm transition-all duration-150 motion-reduce:transition-none ${
                holdComplete ? 'scale-100 opacity-100' : 'scale-75 opacity-0'
              }`}
              style={{ left: `${holdOrigin.x}%`, top: `${holdOrigin.y}%` }}
            >
              <Check className="h-5 w-5" strokeWidth={3} />
            </span>
          </>
        )}
        <div className="relative z-20 overflow-hidden rounded-3xl">{children}</div>
      </motion.div>
    </div>
  );
}
