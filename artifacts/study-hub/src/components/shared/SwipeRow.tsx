import { useRef, useState } from 'react';
import { motion, PanInfo } from 'framer-motion';
import { LucideIcon } from 'lucide-react';

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
const HOLD_ARM_DELAY = 120;

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
  longPressDuration = 520,
  className,
}: SwipeRowProps) {
  const [dragX, setDragX] = useState(0);
  const [holdActive, setHoldActive] = useState(false);
  const [holdOrigin, setHoldOrigin] = useState({ x: 50, y: 50 });
  const armTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const commitTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pointerStart = useRef({ x: 0, y: 0 });
  const longPressCommitted = useRef(false);
  const holdGestureOwned = useRef(false);
  const suppressTap = useRef(false);
  const pressedText = useRef('');
  const isFinalExamCard = rightLabel === 'Edit' && (leftLabel === 'Examine' || leftLabel === 'Add Questions');
  const isLectureCard = !!leftLabel?.toLowerCase().includes('mcq') && !!rightLabel?.toLowerCase().includes('flashcard');
  const hasLongPress = !!onLongPress || isLectureCard;
  const effectiveHoldColor = longPressColor ?? (isLectureCard ? 'hsl(var(--primary))' : 'hsl(var(--primary) / 0.18)');

  const clearTimers = () => {
    if (armTimer.current) clearTimeout(armTimer.current);
    if (commitTimer.current) clearTimeout(commitTimer.current);
    armTimer.current = null;
    commitTimer.current = null;
  };

  const resetHold = () => {
    clearTimers();
    setHoldActive(false);
    longPressCommitted.current = false;
    holdGestureOwned.current = false;
  };

  const cancelHold = () => {
    clearTimers();
    if (holdGestureOwned.current) suppressTap.current = true;
    setHoldActive(false);
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
    if (Math.abs(info.offset.x) > HOLD_MOVE_THRESHOLD) cancelHold();
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
    setHoldOrigin({
      x: ((event.clientX - rect.left) / rect.width) * 100,
      y: ((event.clientY - rect.top) / rect.height) * 100,
    });
    pressedText.current = event.currentTarget.textContent ?? '';
    pointerStart.current = { x: event.clientX, y: event.clientY };
    longPressCommitted.current = false;
    holdGestureOwned.current = false;
    clearTimers();
    armTimer.current = setTimeout(() => {
      holdGestureOwned.current = true;
      suppressTap.current = true;
      setHoldActive(true);
      commitTimer.current = setTimeout(() => {
        longPressCommitted.current = true;
      }, longPressDuration);
    }, HOLD_ARM_DELAY);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!hasLongPress) return;
    const distance = Math.hypot(event.clientX - pointerStart.current.x, event.clientY - pointerStart.current.y);
    if (distance > HOLD_MOVE_THRESHOLD) cancelHold();
  };

  const handlePointerEnd = () => {
    const shouldCommit = longPressCommitted.current && holdGestureOwned.current;
    clearTimers();
    if (shouldCommit) {
      suppressTap.current = true;
      runLongPressAction();
    } else if (holdGestureOwned.current) {
      suppressTap.current = true;
    }
    setHoldActive(false);
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
        onPointerCancel={cancelHold}
        onPointerLeave={cancelHold}
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
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 z-10 rounded-3xl motion-reduce:transition-none"
            style={{
              backgroundColor: effectiveHoldColor,
              clipPath: `circle(${holdActive ? 180 : 0}% at ${holdOrigin.x}% ${holdOrigin.y}%)`,
              transition: `clip-path ${longPressDuration}ms cubic-bezier(0.4, 0, 0.2, 1)`,
            }}
          />
        )}
        <div className="relative z-20 overflow-hidden rounded-3xl">{children}</div>
      </motion.div>
    </div>
  );
}
