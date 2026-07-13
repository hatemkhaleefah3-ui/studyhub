import { Home, BookOpen, Calendar, CheckSquare, BarChart2 } from 'lucide-react';
import { Link, useLocation } from 'wouter';
import { motion } from 'framer-motion';
import { useRef, useState } from 'react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

// Settings is intentionally not a nav item — accessible via the gear icon on Dashboard.
export const NAV_ITEMS = [
  { href: '/', icon: Home, label: 'Dashboard' },
  { href: '/subjects', icon: BookOpen, label: 'Subjects' },
  { href: '/schedule', icon: Calendar, label: 'Schedule' },
  { href: '/checklist', icon: CheckSquare, label: 'Checklist' },
  { href: '/progress', icon: BarChart2, label: 'Progress' },
];

const glassStyle: React.CSSProperties = {
  background: 'rgba(20,20,20,0.78)',
  backdropFilter: 'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
};

const GEL_STYLE: React.CSSProperties = {
  background: 'rgba(59,130,246,0.18)',
  border: '1px solid rgba(59,130,246,0.15)',
};

const ACTIVE_COLOR = '#3b82f6';
const INACTIVE_COLOR = 'rgba(255,255,255,0.45)';

// ── Drag-to-select hook (vertical — for sidebar) ────────────────────────────
function useSidebarDrag(itemCount: number, onNavigate: (idx: number) => void) {
  const containerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
  const longPressTimer = useRef<ReturnType<typeof setTimeout>>();
  const dragActive = useRef(false);
  const pointerIdRef = useRef<number | null>(null);
  const preventNext = useRef(false);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const getIdx = (clientY: number): number | null => {
    for (let i = 0; i < itemRefs.current.length; i++) {
      const el = itemRefs.current[i];
      if (!el) continue;
      const r = el.getBoundingClientRect();
      if (clientY >= r.top && clientY <= r.bottom) return i;
    }
    return null;
  };

  const onPointerDown = (e: React.PointerEvent) => {
    pointerIdRef.current = e.pointerId;
    dragActive.current = false;
    longPressTimer.current = setTimeout(() => {
      dragActive.current = true;
      try { containerRef.current?.setPointerCapture(pointerIdRef.current!); } catch {}
      setHoverIdx(getIdx(e.clientY));
    }, 200);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragActive.current) return;
    setHoverIdx(getIdx(e.clientY));
  };

  const onPointerUp = (e: React.PointerEvent) => {
    clearTimeout(longPressTimer.current);
    if (dragActive.current) {
      const idx = getIdx(e.clientY);
      if (idx !== null) {
        preventNext.current = true;
        onNavigate(idx);
        setTimeout(() => { preventNext.current = false; }, 100);
      }
    }
    dragActive.current = false;
    setHoverIdx(null);
  };

  const onPointerCancel = () => {
    clearTimeout(longPressTimer.current);
    dragActive.current = false;
    setHoverIdx(null);
  };

  const preventClick = (e: React.MouseEvent) => {
    if (preventNext.current) e.preventDefault();
  };

  return {
    containerRef,
    itemRefs,
    hoverIdx,
    isDragging: hoverIdx !== null,
    handlers: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel },
    preventClick,
  };
}

export function Sidebar() {
  const [location, setLocation] = useLocation();

  const getIsActive = (href: string) => {
    if (href === '/') return location === '/';
    return location.startsWith(href);
  };

  const ipadDrag = useSidebarDrag(NAV_ITEMS.length, (idx) => setLocation(NAV_ITEMS[idx].href));
  const desktopDrag = useSidebarDrag(NAV_ITEMS.length, (idx) => setLocation(NAV_ITEMS[idx].href));

  return (
    <>
      {/* ── iPad sidebar (md → lg) — icon-only, left ──────────────────────── */}
      <aside
        className="hidden md:flex lg:hidden fixed left-0 top-0 bottom-0 w-20 z-50 flex-col items-center py-8"
        style={{
          ...glassStyle,
          boxShadow: '1px 0 0 rgba(255,255,255,0.06), 4px 0 20px rgba(0,0,0,0.25)',
        }}
      >
        {/* Logo */}
        <div
          className="w-10 h-10 rounded-2xl flex items-center justify-center mb-10 shrink-0"
          style={{ background: 'rgba(255,255,255,0.12)' }}
        >
          <BookOpen className="w-5 h-5 text-white" />
        </div>

        {/* Nav items */}
        <div
          ref={ipadDrag.containerRef}
          className="flex flex-col gap-3 w-full px-3 touch-none"
          {...ipadDrag.handlers}
        >
          {NAV_ITEMS.map((item, i) => {
            const isActive = ipadDrag.hoverIdx !== null
              ? ipadDrag.hoverIdx === i
              : getIsActive(item.href);
            const Icon = item.icon;

            return (
              <Tooltip key={item.href} delayDuration={0}>
                <TooltipTrigger asChild>
                  <div
                    ref={(el) => { ipadDrag.itemRefs.current[i] = el; }}
                    className="relative w-full aspect-square flex items-center justify-center"
                  >
                    {isActive && (
                      <motion.div
                        layoutId="sidebar-gel"
                        className="absolute inset-0.5 rounded-2xl"
                        style={GEL_STYLE}
                        transition={{ type: 'spring', bounce: 0.22, duration: 0.45 }}
                      />
                    )}
                    <Link
                      href={item.href}
                      className="absolute inset-0 z-10 flex items-center justify-center"
                      data-testid={`nav-${item.label.toLowerCase()}`}
                      onClick={ipadDrag.preventClick}
                    >
                      <motion.div
                        animate={{ scale: isActive ? 1.1 : 1 }}
                        transition={{ type: 'spring', bounce: 0.3, duration: 0.35 }}
                      >
                        <Icon
                          className="w-5 h-5"
                          style={{
                            color: isActive ? ACTIVE_COLOR : INACTIVE_COLOR,
                            transition: 'color 0.22s ease',
                          }}
                        />
                      </motion.div>
                    </Link>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="right" className="ml-2">
                  <p>{item.label}</p>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      </aside>

      {/* ── Desktop sidebar (lg+) — icon + label, left ────────────────────── */}
      <aside
        className="hidden lg:flex fixed left-0 top-0 bottom-0 w-56 z-50 flex-col py-8"
        style={{
          ...glassStyle,
          boxShadow: '1px 0 0 rgba(255,255,255,0.06), 4px 0 20px rgba(0,0,0,0.25)',
        }}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-6 mb-10 shrink-0">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: 'rgba(255,255,255,0.12)' }}
          >
            <BookOpen className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-white text-sm tracking-tight">StudyHub</span>
        </div>

        {/* Nav items */}
        <nav
          ref={desktopDrag.containerRef}
          className="flex flex-col gap-1 px-3 touch-none"
          {...desktopDrag.handlers}
        >
          {NAV_ITEMS.map((item, i) => {
            const isActive = desktopDrag.hoverIdx !== null
              ? desktopDrag.hoverIdx === i
              : getIsActive(item.href);
            const Icon = item.icon;

            return (
              <div
                key={item.href}
                ref={(el) => { desktopDrag.itemRefs.current[i] = el; }}
                className="relative"
              >
                {isActive && (
                  <motion.div
                    layoutId="desktop-gel"
                    className="absolute inset-0 rounded-xl"
                    style={GEL_STYLE}
                    transition={{ type: 'spring', bounce: 0.22, duration: 0.45 }}
                  />
                )}
                <Link
                  href={item.href}
                  className="relative z-10 flex items-center gap-3 px-4 py-3 rounded-xl"
                  data-testid={`nav-desktop-${item.label.toLowerCase()}`}
                  onClick={desktopDrag.preventClick}
                >
                  <motion.div
                    animate={{ scale: isActive ? 1.08 : 1 }}
                    transition={{ type: 'spring', bounce: 0.3, duration: 0.35 }}
                    className="shrink-0"
                  >
                    <Icon
                      className="w-[18px] h-[18px]"
                      style={{
                        color: isActive ? ACTIVE_COLOR : INACTIVE_COLOR,
                        transition: 'color 0.22s ease',
                      }}
                    />
                  </motion.div>
                  <span
                    className="text-sm font-medium"
                    style={{
                      color: isActive ? '#ffffff' : INACTIVE_COLOR,
                      transition: 'color 0.22s ease',
                    }}
                  >
                    {item.label}
                  </span>
                </Link>
              </div>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
