import { Home, BookOpen, Calendar, CheckSquare, BarChart2 } from 'lucide-react';
import { Link, useLocation } from 'wouter';
import { motion } from 'framer-motion';

// Settings is intentionally not a nav item — accessible via the gear icon on Dashboard.
export const NAV_ITEMS = [
  { href: '/', icon: Home, label: 'Dashboard' },
  { href: '/subjects', icon: BookOpen, label: 'Subjects' },
  { href: '/schedule', icon: Calendar, label: 'Schedule' },
  { href: '/checklist', icon: CheckSquare, label: 'Checklist' },
  { href: '/progress', icon: BarChart2, label: 'Progress' },
];

/**
 * Top navigation bar shown on md+ (tablet & desktop).
 * - md–lg : compact icon + label row, slightly rounded pill container centered
 * - lg+   : full-width bar, logo left / nav items right
 */
export function Sidebar() {
  const [location] = useLocation();

  const getIsActive = (href: string) => {
    if (href === '/') return location === '/';
    return location.startsWith(href);
  };

  return (
    <header
      className="hidden md:flex fixed top-0 left-0 right-0 z-50 items-center h-14 px-4 lg:px-8"
      style={{
        background: 'rgba(20,20,20,0.78)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        boxShadow: '0 1px 0 rgba(255,255,255,0.06), 0 4px 20px rgba(0,0,0,0.25)',
      }}
    >
      {/* Logo — left anchor on desktop */}
      <div className="flex items-center gap-2.5 shrink-0 mr-6 lg:mr-10">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.12)' }}>
          <BookOpen className="w-4 h-4 text-white" />
        </div>
        <span className="font-bold text-white text-sm tracking-tight hidden lg:block">StudyHub</span>
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
                className="relative z-10 flex items-center gap-2 px-3.5 py-2 rounded-full"
                data-testid={`nav-${item.label.toLowerCase()}`}
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
  );
}
