import { ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { BottomNav } from "./BottomNav";
import { AnimatePresence, motion } from "framer-motion";
import { useLocation } from "wouter";

export function AppShell({ children }: { children: ReactNode }) {
  const [location] = useLocation();

  return (
    <div className="h-[100dvh] w-full bg-background text-foreground overflow-hidden">
      {/* Top bar on md+, floating pill at bottom on mobile */}
      <Sidebar />
      <BottomNav />

      {/* Scrollable content — offset for top nav on md+, bottom pill on mobile */}
      <div className="h-full overflow-y-auto overscroll-contain">
        <main className="w-full max-w-5xl mx-auto px-4 pt-6 pb-28 md:px-8 md:pt-24 lg:px-10 lg:pt-24">
          <AnimatePresence mode="wait">
            <motion.div
              key={location}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="w-full"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
