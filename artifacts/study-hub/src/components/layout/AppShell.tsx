import { ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { BottomNav } from "./BottomNav";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="h-[100dvh] w-full bg-background text-foreground overflow-hidden">
      {/* Left sidebar — icon-only on both tablet (md) and desktop (lg) */}
      <Sidebar />
      {/* Floating bottom pill — mobile only */}
      <BottomNav />

      {/*
        Content offsets:
          mobile:  no offset        (bottom nav floats)
          tablet:  pl-28  (112px)   (floating rail: 16px gap + 76px rail + 20px breathing room)
          desktop: pl-20  (80px)    (icon sidebar, edge-mounted)
      */}
      <div className="h-full md:pl-28 lg:pl-20 overflow-y-auto overscroll-contain">
        <main className="w-full max-w-5xl mx-auto p-4 md:p-8 lg:p-10 pb-28 md:pb-12">
          {children}
        </main>
      </div>
    </div>
  );
}
