import { Home, BookOpen, Calendar, CheckSquare, BarChart2 } from 'lucide-react';
import { Link, useLocation } from 'wouter';

export const NAV_ITEMS = [
  { href: '/', icon: Home, label: 'Dashboard' },
  { href: '/subjects', icon: BookOpen, label: 'Subjects' },
  { href: '/schedule', icon: Calendar, label: 'Schedule' },
  { href: '/checklist', icon: CheckSquare, label: 'Checklist' },
  { href: '/progress', icon: BarChart2, label: 'Progress' },
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
      <div className="flex-1 flex items-center justify-center gap-2">
        {NAV_ITEMS.map((item) => {
          const isActive = getIsActive(item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className="relative flex items-center gap-2 px-4 py-2 transition-colors"
              style={{
                borderRadius: 9999,
                background: isActive ? 'rgba(255,255,255,0.1)' : 'transparent',
                transition: 'background 0.2s ease',
              }}
              data-testid={`nav-${item.label.toLowerCase()}`}
            >
              <Icon
                className="w-5 h-5"
                style={{
                  color: isActive ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.45)',
                  transition: 'color 0.2s ease',
                }}
              />

              {/* Label — visible on desktop only */}
              <span
                className="text-sm font-medium hidden lg:block"
                style={{
                  color: isActive ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.45)',
                  transition: 'color 0.2s ease',
                }}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
