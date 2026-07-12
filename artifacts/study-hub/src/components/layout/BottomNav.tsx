import { Link, useLocation } from 'wouter';
import { NAV_ITEMS } from './Sidebar';

export function BottomNav() {
  const [location] = useLocation();

  const getIsActive = (href: string) => {
    if (href === '/') return location === '/';
    return location.startsWith(href);
  };

  return (
    <div
      className="md:hidden fixed bottom-4 left-4 right-4 h-16 z-50 flex items-center justify-around px-3"
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
          <Link
            key={item.href}
            href={item.href}
            className="flex items-center justify-center w-11 h-11 transition-colors"
            style={{
              borderRadius: 9999,
              background: isActive ? 'rgba(255,255,255,0.1)' : 'transparent',
              transition: 'background 0.2s ease',
            }}
            data-testid={`nav-mobile-${item.label.toLowerCase()}`}
          >
            <Icon
              className="w-5 h-5"
              style={{
                color: isActive ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.45)',
                transition: 'color 0.2s ease',
              }}
            />
          </Link>
        );
      })}
    </div>
  );
}
