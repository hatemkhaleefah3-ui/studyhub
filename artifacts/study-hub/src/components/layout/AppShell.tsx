import { ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { BottomNav } from "./BottomNav";
import { AnimatePresence, motion } from "framer-motion";
import { useLocation } from "wouter";

export function AppShell({ children }: { children: ReactNode }) {
  const [location] = useLocation();

  return (
    <div className="h-[100dvh] w-full bg-background text-foreground overflow-hidden">
      {/* Left sidebar (md: icon-only, lg: icon+label) */}
      <Sidebar />
      {/* Floating bottom pill (mobile only) */}
      <BottomNav />

      {/*
        Scrollable content area:
          mobile:  no offset  (bottom nav floats above)
          tablet:  pl-20      (80px icon sidebar)
          desktop: pl-56      (224px icon+label sidebar)
      */}
      <div className="h-full md:pl-20 lg:pl-56 overflow-y-auto overscroll-contain">
        <main className="w-full max-w-5xl mx-auto p-4 md:p-8 lg:p-10 pb-28 md:pb-12">
          <AnimatePresence mode="wait">
            <motion.div
              key={location}
              initial={{ opacity: 0, y: 10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
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
