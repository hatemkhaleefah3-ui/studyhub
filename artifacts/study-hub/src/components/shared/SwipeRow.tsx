import { useRef, useState } from 'react';
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
  /** Optional click/touch-and-hold action. Movement cancels the hold. */
  onLongPress?: () => void;
  longPressColor?: string;
  longPressDuration?: number;
  className?: string;
}

const THRESHOLD = 72;
const HOLD_MOVE_THRESHOLD = 10;

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
  longPressColor = 'hsl(var(--primary) / 0.18)',
  longPressDuration = 500,
  className,
}: SwipeRowProps) {
  const [dragX, setDragX] = useState(0);
  const [holdActive, setHoldActive] = useState(false);
  const [holdOrigin, setHoldOrigin] = useState({ x: 50, y: 50 });
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pointerStart = useRef({ x: 0, y: 0 });
  const longPressCommitted = useRef(false);
  const suppressTap = useRef(false);

  const clearHoldTimer = () => {
    if (holdTimer.current) clearTimeout(holdTimer.current);
    holdTimer.current = null;
  };

  const cancelHold = () => {
    clearHoldTimer();
    if (!longPressCommitted.current) setHoldActive(false);
  };

  const handleDrag = (_: unknown, info: PanInfo) => {
    setDragX(info.offset.x);
    if (Math.abs(info.offset.x) > HOLD_MOVE_THRESHOLD) cancelHold();
  };

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    setDragX(0);
    setHoldActive(false);
    clearHoldTimer();
    if (info.offset.x > THRESHOLD && onSwipeRight) onSwipeRight();
    else if (info.offset.x < -THRESHOLD && onSwipeLeft) onSwipeLeft();
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!onLongPress) return;
    const rect = event.currentTarget.getBoundingClientRect();
    setHoldOrigin({
      x: ((event.clientX - rect.left) / rect.width) * 100,
      y: ((event.clientY - rect.top) / rect.height) * 100,
    });
    pointerStart.current = { x: event.clientX, y: event.clientY };
    longPressCommitted.current = false;
    suppressTap.current = false;
    setHoldActive(true);
    clearHoldTimer();
    holdTimer.current = setTimeout(() => {
      longPressCommitted.current = true;
      suppressTap.current = true;
      onLongPress();
    }, longPressDuration);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!onLongPress || longPressCommitted.current) return;
    const distance = Math.hypot(
      event.clientX - pointerStart.current.x,
      event.clientY - pointerStart.current.y,
    );
    if (distance > HOLD_MOVE_THRESHOLD) cancelHold();
  };

  const handlePointerEnd = () => {
    clearHoldTimer();
    setHoldActive(false);
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
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        onPointerCancel={handlePointerEnd}
        onPointerLeave={handlePointerEnd}
        onClick={() => {
          if (suppressTap.current) {
            suppressTap.current = false;
            return;
          }
          if (Math.abs(dragX) < 4) onTap?.();
        }}
        className="relative"
        style={{ touchAction: 'pan-y' }}
      >
        {onLongPress && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 z-10 motion-reduce:transition-none"
            style={{
              backgroundColor: longPressColor,
              clipPath: `circle(${holdActive ? 150 : 0}% at ${holdOrigin.x}% ${holdOrigin.y}%)`,
              transition: `clip-path ${longPressDuration}ms cubic-bezier(0.4, 0, 0.2, 1)`,
            }}
          />
        )}
        <div className="relative z-20">{children}</div>
      </motion.div>
    </div>
  );
}
