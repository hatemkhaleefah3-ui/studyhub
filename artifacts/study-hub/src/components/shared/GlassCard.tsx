import React from 'react';
import { cn } from '@/lib/utils';

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function GlassCard({ children, className, ...props }: GlassCardProps) {
  return (
    <div
      className={cn(
        'bg-card/70 backdrop-blur-xl border border-border shadow-sm rounded-3xl overflow-hidden',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
