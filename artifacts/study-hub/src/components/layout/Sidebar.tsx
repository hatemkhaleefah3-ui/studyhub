import { Home, BookOpen, Calendar, CheckSquare, BarChart2 } from 'lucide-react';
import { Link, useLocation } from 'wouter';
import { motion, useAnimate } from 'framer-motion';
import { useRef, useState } from 'react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

export const NAV_ITEMS = [
  { href: '/', icon: Home, label: 'Dashboard' },
  { href: '/subjects', icon: BookOpen, label: 'Subjects' },
  { href: '/schedule', icon: Calendar, label: 'Schedule' },
  { href: '/checklist', icon: CheckSquare, label: 'Checklist' },
  { href: '/progress', icon: BarChart2, label: 'Progress' },
];

// All colours come from CSS variables so light & dark mode both look right
const glassStyle: React.CSSProperties = {
  background: 'var(--nav-bg)',
  backdropFilter: 'blur(22px)',
  WebkitBackdropFilter: 'blur(22px)',
};

// Water-gel capsule — uses CSS variables so it adapts to light & dark mode
const GEL_STYLE: React.CSSProperties = {
  background:
    'linear-gradient(148deg, var(--gel-hi) 0%, rgba(128,128,128,0.03) 38%, rgba(0,0,0,0.04) 56%, var(--gel-lo) 100%)',
  border: '1px solid var(--gel-border)',
  boxShadow: 'inset 0 1.5px 0 var(--gel-inner-top), inset 0 -1px 0 rgba(0,0,0,0.08)',
};

const ACTIVE_COLOR = '#3b82f6';
// CSS variable so inactive icons respect light / dark mode
const INACTIVE_COLOR = 'var(--nav-icon-inactive)';

// ── Sidebar drag-to-select (vertical) ───────────────────────────────────────
function useSidebarDrag(onNavigate: (idx: number) => void) {
  const [scope, animateNav] = useAnimate();
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
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

  const fireNavPulse = () => {
    // Quick flash on the sidebar itself — NOT on the gel or item
    animateNav(scope.current, { opacity: [1, 0.7, 1] }, { duration: 0.16, ease: 'easeOut' });
  };

  const onPointerDown = (e: React.PointerEvent) => {
    pointerIdRef.current = e.pointerId;
    dragActive.current = false;
    longPressTimer.current = setTimeout(() => {
      dragActive.current = true;
      fireNavPulse();
      try { scope.current?.setPointerCapture(pointerIdRef.current!); } catch {}
      setHoverIdx(getIdx(e.clientY));
    }, 150);
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
    scope,
    itemRefs,
    hoverIdx,
    handlers: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel },
    preventClick,
  };
}

// ── Shared icon-only nav items (used by both sidebar variants) ───────────────
function NavItems({
  hoverIdx,
  itemRefs,
  getIsActive,
  preventClick,
  layoutId,
}: {
  hoverIdx: number | null;
  itemRefs: React.MutableRefObject<(HTMLDivElement | null)[]>;
  getIsActive: (href: string) => boolean;
  preventClick: (e: React.MouseEvent) => void;
  layoutId: string;
}) {
  return (
    <>
      {NAV_ITEMS.map((item, i) => {
        const isActive = hoverIdx !== null ? hoverIdx === i : getIsActive(item.href);
        const Icon = item.icon;

        return (
          <Tooltip key={item.href} delayDuration={0}>
            <TooltipTrigger asChild>
              <div
                ref={(el) => { itemRefs.current[i] = el; }}
                className="relative w-full aspect-square flex items-center justify-center"
              >
                {isActive && (
                  <motion.div
                    layoutId={layoutId}
                    className="absolute inset-0.5 rounded-2xl"
                    style={GEL_STYLE}
                    transition={{ type: 'spring', bounce: 0.22, duration: 0.45 }}
                  />
                )}
                {/* Link is passive during drag — pointer-events disabled in drag state */}
                <Link
                  href={item.href}
                  className="absolute inset-0 z-10 flex items-center justify-center"
                  data-testid={`nav-${item.label.toLowerCase()}`}
                  onClick={preventClick}
                  style={{ WebkitTapHighlightColor: 'transparent' }}
                >
                  <Icon
                    className="w-5 h-5"
                    style={{
                      color: isActive ? ACTIVE_COLOR : INACTIVE_COLOR,
                      transition: 'color 0.22s ease',
                    }}
                  />
                </Link>
              </div>
            </TooltipTrigger>
            <TooltipContent side="right" className="ml-2">
              <p>{item.label}</p>
            </TooltipContent>
          </Tooltip>
        );
      })}
    </>
  );
}

export function Sidebar() {
  const [location, setLocation] = useLocation();
  const navigate = (idx: number) => setLocation(NAV_ITEMS[idx].href);

  const getIsActive = (href: string) => {
    if (href === '/') return location === '/';
    return location.startsWith(href);
  };

  const ipad = useSidebarDrag(navigate);
  const desktop = useSidebarDrag(navigate);

  const logo = (
    <div
      className="w-10 h-10 rounded-2xl flex items-center justify-center mb-10 shrink-0"
      style={{ background: 'rgba(255,255,255,0.12)' }}
    >
      <BookOpen className="w-5 h-5 text-white" />
    </div>
  );

  const sidebarShadow = '1px 0 0 var(--nav-edge), 4px 0 20px var(--nav-shadow-color)';

  return (
    <>
      {/* ── iPad sidebar (md → lg) ────────────────────────────────────────── */}
      <aside
        className="hidden md:flex lg:hidden fixed left-0 top-0 bottom-0 w-20 z-50 flex-col items-center py-8"
        style={{ ...glassStyle, boxShadow: sidebarShadow }}
      >
        {logo}
        {/* Nav container — this is what pulses on long-press */}
        <div
          ref={ipad.scope}
          className="flex flex-col gap-3 w-full px-3 touch-none select-none"
          {...ipad.handlers}
        >
          <NavItems
            hoverIdx={ipad.hoverIdx}
            itemRefs={ipad.itemRefs}
            getIsActive={getIsActive}
            preventClick={ipad.preventClick}
            layoutId="sidebar-gel"
          />
        </div>
      </aside>

      {/* ── Desktop sidebar (lg+) — icon-only, same width as iPad ───────── */}
      <aside
        className="hidden lg:flex fixed left-0 top-0 bottom-0 w-20 z-50 flex-col items-center py-8"
        style={{ ...glassStyle, boxShadow: sidebarShadow }}
      >
        {logo}
        {/* Nav container — this is what pulses on long-press */}
        <div
          ref={desktop.scope}
          className="flex flex-col gap-3 w-full px-3 touch-none select-none"
          {...desktop.handlers}
        >
          <NavItems
            hoverIdx={desktop.hoverIdx}
            itemRefs={desktop.itemRefs}
            getIsActive={getIsActive}
            preventClick={desktop.preventClick}
            layoutId="desktop-gel"
          />
        </div>
      </aside>
    </>
  );
}
