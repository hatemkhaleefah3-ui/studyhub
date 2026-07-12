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
    <div
      className="md:hidden fixed bottom-4 left-4 right-4 h-16 z-50 flex items-center justify-around px-2"
      style={{
        background: 'rgba(20,20,20,0.75)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderRadius: 9999,
        boxShadow:
          '0 8px 32px rgba(0,0,0,0.45), 0 2px 8px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.08)',
      }}
    >
      {NAV_ITEMS.map((item) => {
        const isActive = getIsActive(item.href);
        const Icon = item.icon;

        return (
          <div key={item.href} className="relative flex items-center justify-center w-12 h-12">
            {/* Sliding radial glow — follows active tab */}
            {isActive && (
              <motion.div
                layoutId="bottomnav-glow"
                className="absolute inset-0 pointer-events-none"
                style={{
                  borderRadius: 9999,
                  background: 'radial-gradient(circle at center, rgba(59,130,246,0.22) 0%, transparent 72%)',
                  boxShadow: '0 0 18px rgba(59,130,246,0.45), 0 0 40px rgba(59,130,246,0.18)',
                }}
                transition={{ type: 'spring', bounce: 0.15, duration: 0.5 }}
              />
            )}

            <Link
              href={item.href}
              className="absolute inset-0 flex items-center justify-center z-10"
              data-testid={`nav-mobile-${item.label.toLowerCase()}`}
            >
              <motion.div
                animate={{ scale: isActive ? 1.1 : 1 }}
                transition={{ type: 'spring', stiffness: 380, damping: 22 }}
              >
                <Icon
                  className="w-6 h-6"
                  style={{
                    color: isActive ? '#3b82f6' : 'rgba(255,255,255,0.45)',
                    transition: 'color 0.25s ease',
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
