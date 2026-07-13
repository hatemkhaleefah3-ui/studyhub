import { Link, useLocation } from 'wouter';
import { motion } from 'framer-motion';
import { useRef, useState } from 'react';
import { NAV_ITEMS } from './Sidebar';

const ACTIVE_COLOR = '#3b82f6';
const INACTIVE_COLOR = 'rgba(255,255,255,0.45)';

const GEL_STYLE: React.CSSProperties = {
  background: 'rgba(59,130,246,0.18)',
  border: '1px solid rgba(59,130,246,0.15)',
};

export function BottomNav() {
  const [location, setLocation] = useLocation();
  const navRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
  const longPressTimer = useRef<ReturnType<typeof setTimeout>>();
  const dragActive = useRef(false);
  const pointerIdRef = useRef<number | null>(null);
  const preventNext = useRef(false);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const getIsActive = (href: string) => {
    if (href === '/') return location === '/';
    return location.startsWith(href);
  };

  const getIdx = (clientX: number): number | null => {
    for (let i = 0; i < itemRefs.current.length; i++) {
      const el = itemRefs.current[i];
      if (!el) continue;
      const r = el.getBoundingClientRect();
      if (clientX >= r.left && clientX <= r.right) return i;
    }
    return null;
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    pointerIdRef.current = e.pointerId;
    dragActive.current = false;
    longPressTimer.current = setTimeout(() => {
      dragActive.current = true;
      try { navRef.current?.setPointerCapture(pointerIdRef.current!); } catch {}
      setHoverIdx(getIdx(e.clientX));
    }, 200);
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
    <div
      ref={navRef}
      className="md:hidden fixed bottom-4 left-4 right-4 z-50 flex items-center px-2 py-2 touch-none"
      style={{
        background: 'rgba(20,20,20,0.75)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderRadius: '9999px',
        boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
        maxWidth: '420px',
        marginLeft: 'auto',
        marginRight: 'auto',
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
              onClick={preventClick}
              aria-label={item.label}
            >
              <motion.div
                animate={{
                  scale: isActive ? 1.1 : 1,
                  y: isActive ? -1 : 0,
                }}
                transition={{ type: 'spring', bounce: 0.3, duration: 0.4 }}
              >
                <Icon
                  className="w-[22px] h-[22px]"
                  style={{
                    color: isActive ? ACTIVE_COLOR : INACTIVE_COLOR,
                    transition: 'color 0.22s ease',
                  }}
                />
              </motion.div>
            </Link>
          </div>
        );
      })}
    </div>
  );
}
