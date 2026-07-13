import { Link, useLocation } from 'wouter';
import { motion, useAnimate } from 'framer-motion';
import { useRef, useState } from 'react';
import { NAV_ITEMS } from './Sidebar';

const ACTIVE_COLOR = '#3b82f6';

const GEL_STYLE: React.CSSProperties = {
  background:
    'linear-gradient(148deg, var(--gel-hi) 0%, rgba(128,128,128,0.03) 38%, rgba(0,0,0,0.04) 56%, var(--gel-lo) 100%)',
  border: '1px solid var(--gel-border)',
  boxShadow: 'inset 0 1.5px 0 var(--gel-inner-top), inset 0 -1px 0 rgba(0,0,0,0.08)',
};

export function BottomNav() {
  const [location, setLocation] = useLocation();
  const [pillScope, animatePill] = useAnimate();
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
  const longPressTimer = useRef<ReturnType<typeof setTimeout>>();
  const dragActive = useRef(false);
  const pointerIdRef = useRef<number | null>(null);
  const preventNext = useRef(false);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const getIsActive = (href: string) => href === '/' ? location === '/' : location.startsWith(href);

  const getIdx = (clientX: number): number | null => {
    for (let i = 0; i < itemRefs.current.length; i++) {
      const el = itemRefs.current[i];
      if (!el) continue;
      const r = el.getBoundingClientRect();
      if (clientX >= r.left && clientX <= r.right) return i;
    }
    return null;
  };

  const fireNavPulse = () => {
    animatePill(pillScope.current, { scale: [1, 1.03, 0.99, 1] }, { duration: 0.22, ease: 'easeOut' });
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    pointerIdRef.current = e.pointerId;
    dragActive.current = false;
    longPressTimer.current = setTimeout(() => {
      dragActive.current = true;
      fireNavPulse();
      try { pillScope.current?.setPointerCapture(pointerIdRef.current!); } catch {}
      setHoverIdx(getIdx(e.clientX));
    }, 150);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragActive.current) return;
    setHoverIdx(getIdx(e.clientX));
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    clearTimeout(longPressTimer.current);
    if (dragActive.current) {
      const idx = getIdx(e.clientX);
      if (idx !== null) {
        preventNext.current = true;
        setLocation(NAV_ITEMS[idx].href);
        setTimeout(() => { preventNext.current = false; }, 100);
      }
    }
    dragActive.current = false;
    setHoverIdx(null);
  };

  const handlePointerCancel = () => {
    clearTimeout(longPressTimer.current);
    dragActive.current = false;
    setHoverIdx(null);
  };

  const preventClick = (e: React.MouseEvent) => {
    if (preventNext.current) e.preventDefault();
  };

  return (
    <div className="md:hidden fixed bottom-4 left-4 right-4 z-50 flex justify-center">
      <motion.div
        ref={pillScope}
        className="flex items-center px-2 py-2 w-full touch-none select-none"
        style={{
          background: 'var(--nav-bg)',
          backdropFilter: 'blur(22px)',
          WebkitBackdropFilter: 'blur(22px)',
          borderRadius: '9999px',
          boxShadow: '0 4px 24px var(--nav-shadow-color)',
          maxWidth: '420px',
          border: '1px solid var(--nav-edge)',
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
      >
        {NAV_ITEMS.map((item, i) => {
          const isActive = hoverIdx !== null ? hoverIdx === i : getIsActive(item.href);
          const Icon = item.icon;
          return (
            <div
              key={item.href}
              ref={(el) => { itemRefs.current[i] = el; }}
              className="relative flex-1 flex items-center justify-center"
            >
              {isActive && (
                <motion.div
                  layoutId="bottomnav-gel"
                  className="absolute inset-0.5 rounded-full"
                  style={GEL_STYLE}
                  transition={{ type: 'spring', bounce: 0.22, duration: 0.45 }}
                />
              )}
              <Link
                href={item.href}
                className="relative z-10 flex items-center justify-center w-full py-2.5"
                data-testid={`nav-mobile-${item.label.toLowerCase()}`}
                aria-label={item.label}
                onClick={preventClick}
                style={{ WebkitTapHighlightColor: 'transparent' }}
              >
                <Icon
                  className="w-[22px] h-[22px]"
                  style={{
                    color: isActive ? ACTIVE_COLOR : 'var(--nav-icon-inactive)',
                    transition: 'color 0.22s ease',
                  }}
                />
              </Link>
            </div>
          );
        })}
      </motion.div>
    </div>
  );
}
