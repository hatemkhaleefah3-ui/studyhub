import { ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { BottomNav } from "./BottomNav";
import { AnimatePresence, motion } from "framer-motion";
import { useLocation } from "wouter";

export function AppShell({ children }: { children: ReactNode }) {
  const [location] = useLocation();

  return (
    <div className="h-[100dvh] w-full bg-background text-foreground overflow-hidden">
      <Sidebar />
      <BottomNav />
      {/* Scrollable content area — only this div scrolls, nav is fixed to viewport */}
      <div className="h-full md:pl-20 overflow-y-auto overscroll-contain">
        <main className="w-full max-w-5xl mx-auto p-4 md:p-8 lg:p-10 pb-28 md:pb-12">
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
