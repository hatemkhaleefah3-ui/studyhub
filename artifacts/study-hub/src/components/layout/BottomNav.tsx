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
      className="md:hidden fixed bottom-4 left-4 right-4 z-50 flex items-center px-2 py-2"
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
    >
      {NAV_ITEMS.map((item) => {
        const isActive = getIsActive(item.href);
        const Icon = item.icon;

        return (
          <div key={item.href} className="relative flex-1 flex items-center justify-center">
            {isActive && (
              <motion.div
                layoutId="bottomnav-pill"
                className="absolute inset-0.5 rounded-full"
                style={{ background: 'rgba(255,255,255,0.14)' }}
                transition={{ type: 'spring', bounce: 0.22, duration: 0.45 }}
              />
            )}
            <Link
              href={item.href}
              className="relative z-10 flex items-center justify-center w-full py-2.5"
              data-testid={`nav-mobile-${item.label.toLowerCase()}`}
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
                    color: isActive ? '#ffffff' : 'rgba(255,255,255,0.45)',
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
