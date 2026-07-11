import { Home, BookOpen, Calendar, CheckSquare, BarChart2, Settings } from 'lucide-react';
import { Link, useLocation } from 'wouter';
import { motion } from 'framer-motion';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

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
    <div className="hidden md:flex flex-col w-20 fixed left-0 top-0 bottom-0 bg-card/60 backdrop-blur-xl border-r border-border py-8 items-center z-50">
      <div className="w-10 h-10 bg-primary/20 rounded-2xl flex items-center justify-center mb-10 shrink-0">
        <BookOpen className="w-6 h-6 text-primary" />
      </div>

      <div className="flex flex-col gap-4 w-full px-4">
        {NAV_ITEMS.map((item) => {
          const isActive = getIsActive(item.href);
          const Icon = item.icon;

          return (
            <Tooltip key={item.href} delayDuration={0}>
              <TooltipTrigger asChild>
                <div className="relative w-full aspect-square flex items-center justify-center cursor-pointer group">
                  {isActive && (
                    <motion.div
                      layoutId="sidebar-active"
                      className="absolute inset-0 rounded-2xl overflow-hidden border border-primary/30"
                      style={{
                        background: 'hsl(var(--primary) / 0.15)',
                        backdropFilter: 'blur(8px)',
                        boxShadow: '0 2px 10px hsl(var(--primary) / 0.18)',
                      }}
                      transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                    >
                      <div className="absolute inset-x-1 top-0.5 h-[44%] rounded-t-xl bg-gradient-to-b from-white/45 to-transparent pointer-events-none" />
                    </motion.div>
                  )}
                  <Link
                    href={item.href}
                    className="absolute inset-0 flex items-center justify-center z-10"
                    data-testid={`nav-${item.label.toLowerCase()}`}
                  >
                    <Icon
                      className={`w-6 h-6 transition-colors duration-300 ${
                        isActive
                          ? 'text-primary'
                          : 'text-muted-foreground group-hover:text-foreground'
                      }`}
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
      </div>
    </div>
  );
}
