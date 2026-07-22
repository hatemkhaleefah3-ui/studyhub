import { motion } from "framer-motion";

export function ProgressOrb({ value, label = "Overall", size = "md" }: { value: number; label?: string; size?: "sm" | "md" }) {
  const diameter = size === "sm" ? 96 : 112;
  const stroke = size === "sm" ? 8 : 9;
  const radius = (diameter - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const dash = circumference * Math.max(0, Math.min(100, value)) / 100;
  return <div className="relative shrink-0" style={{ width: diameter, height: diameter }}>
    <div className="absolute inset-1 rounded-full bg-gradient-to-br from-primary/16 via-card to-card shadow-[inset_0_1px_0_hsl(var(--foreground)/.06),0_12px_30px_hsl(var(--primary)/.12)]" />
    <svg viewBox={`0 0 ${diameter} ${diameter}`} className="absolute inset-0 -rotate-90 overflow-visible" aria-hidden="true">
      <circle cx={diameter / 2} cy={diameter / 2} r={radius} fill="none" stroke="hsl(var(--primary) / .13)" strokeWidth={stroke} />
      <motion.circle cx={diameter / 2} cy={diameter / 2} r={radius} fill="none" stroke="hsl(var(--primary))" strokeWidth={stroke} strokeLinecap="round" strokeDasharray={`${circumference} ${circumference}`} initial={{ strokeDashoffset: circumference }} animate={{ strokeDashoffset: circumference - dash }} transition={{ duration: .8, ease: [.4, 0, .2, 1] }} />
    </svg>
    <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
      <span className={`${size === "sm" ? "text-3xl" : "text-4xl"} font-black leading-none tabular-nums tracking-tight`}>{value}<span className="text-[.58em]">%</span></span>
      <span className="mt-1 text-[8px] font-black uppercase tracking-[.18em] text-muted-foreground">{label}</span>
    </div>
  </div>;
}
