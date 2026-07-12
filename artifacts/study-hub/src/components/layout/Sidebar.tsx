import { Home, BookOpen, Calendar, CheckSquare, BarChart2 } from 'lucide-react';
import { Link, useLocation } from 'wouter';
import { motion } from 'framer-motion';
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

export function Sidebar() {
  const [location] = useLocation();

  const getIsActive = (href: string) => {
    if (href === '/') return location === '/';
    return location.startsWith(href);
  };

  return (
    <>
      {/* ── iPad sidebar (md → lg) ─────────────────────────────────────────── */}
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
        <div className="flex flex-col gap-3 w-full px-3">
          {NAV_ITEMS.map((item) => {
            const isActive = getIsActive(item.href);
            const Icon = item.icon;

            return (
              <Tooltip key={item.href} delayDuration={0}>
                <TooltipTrigger asChild>
                  <div className="relative w-full aspect-square flex items-center justify-center">
                    {isActive && (
                      <motion.div
                        layoutId="sidebar-pill"
                        className="absolute inset-0.5 rounded-2xl"
                        style={{ background: 'rgba(255,255,255,0.14)' }}
                        transition={{ type: 'spring', bounce: 0.22, duration: 0.45 }}
                      />
                    )}
                    <Link
                      href={item.href}
                      className="absolute inset-0 z-10 flex items-center justify-center"
                      data-testid={`nav-${item.label.toLowerCase()}`}
                    >
                      <motion.div
                        animate={{ scale: isActive ? 1.1 : 1 }}
                        transition={{ type: 'spring', bounce: 0.3, duration: 0.35 }}
                      >
                        <Icon
                          className="w-5 h-5"
                          style={{
                            color: isActive ? '#ffffff' : 'rgba(255,255,255,0.45)',
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

      {/* ── Desktop top bar (lg+) ─────────────────────────────────────────── */}
      <header
        className="hidden lg:flex fixed top-0 left-0 right-0 h-14 z-50 items-center px-8"
        style={{
          ...glassStyle,
          boxShadow: '0 1px 0 rgba(255,255,255,0.06), 0 4px 20px rgba(0,0,0,0.25)',
        }}
      >
        {/* Logo */}
        <div className="flex items-center gap-2.5 shrink-0 mr-8">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.12)' }}
          >
            <BookOpen className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-white text-sm tracking-tight">StudyHub</span>
        </div>

        {/* Nav items */}
        <nav className="flex items-center gap-0.5">
          {NAV_ITEMS.map((item) => {
            const isActive = getIsActive(item.href);
            const Icon = item.icon;

            return (
              <div key={item.href} className="relative">
                {isActive && (
                  <motion.div
                    layoutId="topnav-pill"
                    className="absolute inset-0 rounded-full"
                    style={{ background: 'rgba(255,255,255,0.13)' }}
                    transition={{ type: 'spring', bounce: 0.22, duration: 0.45 }}
                  />
                )}
                <Link
                  href={item.href}
                  className="relative z-10 flex items-center gap-2 px-3.5 py-2"
                  data-testid={`nav-desktop-${item.label.toLowerCase()}`}
                >
                  <motion.div
                    animate={{ scale: isActive ? 1.05 : 1 }}
                    transition={{ type: 'spring', bounce: 0.3, duration: 0.35 }}
                  >
                    <Icon
                      className="w-[18px] h-[18px] shrink-0"
                      style={{
                        color: isActive ? '#ffffff' : 'rgba(255,255,255,0.48)',
                        transition: 'color 0.22s ease',
                      }}
                    />
                  </motion.div>
                  <span
                    className="text-sm font-medium"
                    style={{
                      color: isActive ? '#ffffff' : 'rgba(255,255,255,0.48)',
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
      </header>
    </>
  );
}
