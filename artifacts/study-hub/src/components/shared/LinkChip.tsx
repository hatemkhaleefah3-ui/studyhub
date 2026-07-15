import { Link as LinkIcon, ExternalLink } from "lucide-react";

/**
 * Well-designed link badge used for the "link" field on tasks, task lists,
 * and sub-tasks. Shows the link's hostname (not just the word "Link") so it
 * reads as a real shortcut, with a hover state and external-link affordance.
 */
export function LinkChip({ href, className = "" }: { href: string; className?: string }) {
  let label = "Link";
  try {
    label = new URL(href).hostname.replace(/^www\./, "");
  } catch {
    // Relative or otherwise malformed URL — fall back to a generic label.
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      title={href}
      className={`group inline-flex items-center gap-1.5 max-w-[11rem] pl-2 pr-1.5 py-1 rounded-full border border-sky-500/25 bg-sky-500/10 text-sky-600 dark:text-sky-400 text-xs font-medium hover:bg-sky-500/20 hover:border-sky-500/40 active:scale-95 transition-all ${className}`}
    >
      <LinkIcon className="w-3 h-3 shrink-0" />
      <span className="truncate">{label}</span>
      <ExternalLink className="w-2.5 h-2.5 shrink-0 opacity-50 group-hover:opacity-90 group-hover:translate-x-0.5 transition-all" />
    </a>
  );
}
