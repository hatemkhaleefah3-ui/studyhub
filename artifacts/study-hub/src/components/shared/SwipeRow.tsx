import { cloneElement, isValidElement, useRef, useState, type ReactElement } from 'react';
import { motion, type PanInfo } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';

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

  const armTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const commitTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pointerStart = useRef({ x: 0, y: 0 });
  const activePointerId = useRef<number | null>(null);
  const holdStartedAt = useRef(0);
  const targetRadius = useRef(0);
  const longPressCommitted = useRef(false);
  const holdGestureOwned = useRef(false);
  const suppressTap = useRef(false);
  const pressedText = useRef('');

  const isFinalExamCard = rightLabel === 'Edit' && (leftLabel === 'Examine' || leftLabel === 'Add Questions');
  const isLectureCard = !!leftLabel?.toLowerCase().includes('mcq') && !!rightLabel?.toLowerCase().includes('flashcard');
  const hasLongPress = !!onLongPress || isLectureCard;
  const effectiveHoldColor = longPressColor ?? (isLectureCard ? 'hsl(var(--primary))' : 'hsl(var(--primary))');

  const foregroundChildren = isValidElement(children)
    ? cloneElement(children as ReactElement<{ className?: string }>, {
        className: `${(children as ReactElement<{ className?: string }>).props.className ?? ''} !border-transparent !bg-transparent !shadow-none`,
      })
    : children;

  const clearTimers = () => {
    if (armTimer.current) clearTimeout(armTimer.current);
    if (commitTimer.current) clearTimeout(commitTimer.current);
    armTimer.current = null;
    commitTimer.current = null;
  };

  const releasePointerCapture = (element?: HTMLDivElement | null) => {
    const pointerId = activePointerId.current;
    if (element && pointerId != null && element.hasPointerCapture(pointerId)) {
      element.releasePointerCapture(pointerId);
    }
    activePointerId.current = null;
  };

  const retreatHold = () => {
    clearTimers();
    if (holdGestureOwned.current) suppressTap.current = true;

    const elapsed = holdStartedAt.current ? Date.now() - holdStartedAt.current : 0;
    const fraction = Math.min(1, Math.max(0, elapsed / longPressDuration));
    setHoldTransitionMs(Math.max(MIN_RETREAT_DURATION, Math.round(longPressDuration * fraction)));
    setHoldRadius(0);
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

    event.currentTarget.setPointerCapture(event.pointerId);
    activePointerId.current = event.pointerId;

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
      }, longPressDuration);
    }, HOLD_ARM_DELAY);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!hasLongPress) return;
    const distance = Math.hypot(event.clientX - pointerStart.current.x, event.clientY - pointerStart.current.y);
    if (distance > HOLD_MOVE_THRESHOLD) retreatHold();
  };

  const handlePointerEnd = (event: React.PointerEvent<HTMLDivElement>) => {
    const shouldCommit = longPressCommitted.current && holdGestureOwned.current;
    clearTimers();
    releasePointerCapture(event.currentTarget);

    if (shouldCommit) {
      suppressTap.current = true;
      runLongPressAction();
      setHoldTransitionMs(180);
      setHoldRadius(0);
    } else {
      retreatHold();
    }

    longPressCommitted.current = false;
    holdGestureOwned.current = false;
  };

  const handlePointerCancel = (event: React.PointerEvent<HTMLDivElement>) => {
    releasePointerCapture(event.currentTarget);
    retreatHold();
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
        onPointerCancel={handlePointerCancel}
        onContextMenu={(event) => hasLongPress && event.preventDefault()}
        onClick={() => {
          if (suppressTap.current) {
            suppressTap.current = false;
            return;
          }
          if (Math.abs(dragX) < 4) onTap?.();
        }}
        className="relative overflow-hidden rounded-3xl bg-card will-change-transform"
        style={{ touchAction: 'pan-y', WebkitTouchCallout: 'none', userSelect: 'none' }}
      >
        <div className="relative z-10 overflow-hidden rounded-3xl">{children}</div>
        {hasLongPress && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 z-20 rounded-3xl motion-reduce:transition-none"
            style={{
              backgroundColor: effectiveHoldColor,
              clipPath: `circle(${holdRadius}px at ${holdOrigin.x}% ${holdOrigin.y}%)`,
              transition: `clip-path ${holdTransitionMs}ms cubic-bezier(0.4, 0, 0.2, 1)`,
            }}
          />
        )}
        {hasLongPress && holdRadius > 0 && (
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-30 overflow-hidden rounded-3xl">
            {foregroundChildren}
          </div>
        )}
      </motion.div>
    </div>
  );
}
