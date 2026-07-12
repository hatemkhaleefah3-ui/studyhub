import { Home, BookOpen, Calendar, CheckSquare, BarChart2, Settings } from 'lucide-react';
import { Link, useLocation } from 'wouter';
import { motion } from 'framer-motion';

export const NAV_ITEMS = [
  { href: '/', icon: Home, label: 'Dashboard' },
  { href: '/subjects', icon: BookOpen, label: 'Subjects' },
  { href: '/schedule', icon: Calendar, label: 'Schedule' },
  { href: '/checklist', icon: CheckSquare, label: 'Checklist' },
  { href: '/progress', icon: BarChart2, label: 'Progress' },
  { href: '/settings', icon: Settings, label: 'Settings' },
];

export function Sidebar() {
  const [location] = useLocation();

  const getIsActive = (href: string) => {
    if (href === '/') return location === '/';
    return location.startsWith(href);
  };

  return (
    <div
      className="hidden md:flex fixed top-4 left-4 right-4 h-14 z-50 items-center"
      style={{
        background: 'rgba(20,20,20,0.75)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderRadius: 9999,
        boxShadow:
          '0 8px 32px rgba(0,0,0,0.45), 0 2px 8px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.08)',
      }}
    >
      {/* Logo — pinned left */}
      <div className="flex items-center gap-2 pl-5 pr-6 shrink-0">
        <div className="w-8 h-8 bg-blue-500/20 rounded-xl flex items-center justify-center">
          <BookOpen className="w-4 h-4 text-blue-400" />
        </div>
        <span
          className="font-semibold text-sm hidden lg:block"
          style={{ color: 'rgba(255,255,255,0.85)' }}
        >
          StudyHub
        </span>
      </div>

      {/* Nav items — centered */}
      <div className="flex-1 flex items-center justify-center gap-1">
        {NAV_ITEMS.map((item) => {
          const isActive = getIsActive(item.href);
          const Icon = item.icon;

          return (
            <div key={item.href} className="relative">
              {/* Sliding radial glow — shared layout animation */}
              {isActive && (
                <motion.div
                  layoutId="topnav-glow"
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    borderRadius: 9999,
                    background:
                      'radial-gradient(circle at center, rgba(59,130,246,0.22) 0%, transparent 72%)',
                    boxShadow:
                      '0 0 16px rgba(59,130,246,0.45), 0 0 36px rgba(59,130,246,0.18)',
                  }}
                  transition={{ type: 'spring', bounce: 0.15, duration: 0.5 }}
                />
              )}

              <Link
                href={item.href}
                className="relative flex items-center gap-2 px-3 py-2 z-10"
                style={{ borderRadius: 9999 }}
                data-testid={`nav-${item.label.toLowerCase()}`}
              >
                <motion.div
                  animate={{ scale: isActive ? 1.08 : 1 }}
                  transition={{ type: 'spring', stiffness: 380, damping: 22 }}
                >
                  <Icon
                    className="w-5 h-5"
                    style={{
                      color: isActive ? '#3b82f6' : 'rgba(255,255,255,0.45)',
                      transition: 'color 0.25s ease',
                    }}
                  />
                </motion.div>

                {/* Label — visible on desktop only */}
                <span
                  className="text-sm font-medium hidden lg:block"
                  style={{
                    color: isActive ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.45)',
                    transition: 'color 0.25s ease',
                  }}
                >
                  {item.label}
                </span>
              </Link>
            </div>
          );
        })}
      </div>
    </div>
  );
}
