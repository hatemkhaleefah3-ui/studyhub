import { ReactNode, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

/**
 * Portals fixed-position content (e.g. floating action buttons) directly to
 * document.body. This avoids a CSS quirk where `position: fixed` becomes
 * relative to the nearest ancestor with a `transform` set — such as the
 * page-transition wrapper in AppShell, which animates `scale`/`y` on mount.
 * Without the portal, fixed elements briefly render at the wrong position
 * (e.g. center-screen) before snapping to their true fixed position.
 */
export function FabPortal({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return createPortal(children, document.body);
}
