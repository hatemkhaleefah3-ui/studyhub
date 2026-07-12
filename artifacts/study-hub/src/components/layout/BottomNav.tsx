import { Link, useLocation } from 'wouter';
import { motion } from 'framer-motion';
import { NAV_ITEMS } from './Sidebar';

export function BottomNav() {
  const [location] = useLocation();

  const getIsActive = (href: string) => {
    if (href === '/') return location === '/';
    return location.startsWith(href);
  };

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 h-20 bg-card/85 backdrop-blur-2xl border-t border-border z-50">
      <div className="max-w-sm mx-auto h-full px-8 flex items-center justify-between">
      {NAV_ITEMS.map((item) => {
        const isActive = getIsActive(item.href);
        const Icon = item.icon;

        return (
          <div key={item.href} className="relative flex items-center justify-center w-14 h-14">
            {isActive && (
              <motion.div
                layoutId="bottomnav-active"
                className="absolute inset-0.5 rounded-2xl overflow-hidden border border-primary/30"
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
              data-testid={`nav-mobile-${item.label.toLowerCase()}`}
            >
              <Icon
                className={`w-6 h-6 transition-colors duration-300 ${
                  isActive ? 'text-primary' : 'text-muted-foreground'
                }`}
              />
            </Link>
          </div>
        );
      })}
      </div>
    </div>
  );
}
