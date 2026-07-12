import { useEffect, useState } from "react";
import { Link } from "wouter";
import { useStudyData } from "@/hooks/useStudyData";
import { GlassCard } from "@/components/shared/GlassCard";
import { ConfirmSheet } from "@/components/shared/ConfirmSheet";
import { ArchiveEntry } from "@/lib/api";
import { format } from "date-fns";
import { ArchiveIcon, ArrowLeft, RotateCcw, Trash2, BookOpen, Calendar as CalendarIcon, CheckSquare } from "lucide-react";

const CATEGORY_META: Record<ArchiveEntry["category"], { label: string; icon: typeof BookOpen }> = {
  subject: { label: "Subject", icon: BookOpen },
  schedule: { label: "Schedule", icon: CalendarIcon },
  checklist: { label: "Checklist", icon: CheckSquare },
};

function entryTitle(entry: ArchiveEntry): string {
  if (entry.category === "subject") return entry.data?.name || "Untitled subject";
  if (entry.category === "schedule") return entry.data?.title || "Untitled event";
  return entry.data?.text || "Untitled task";
}

export function Archive() {
  const { archive, isArchiveLoaded, refreshArchive, restoreArchiveItem, permanentlyDeleteArchiveItem } = useStudyData();
  const [purgingId, setPurgingId] = useState<string | null>(null);

  useEffect(() => {
    refreshArchive();
  }, [refreshArchive]);

  return (
    <div className="space-y-8 pb-20 max-w-3xl mx-auto">
      <div className="flex items-center gap-4 mb-4">
        <Link
          href="/settings"
          className="w-10 h-10 rounded-full bg-secondary/60 hover:bg-secondary flex items-center justify-center transition-colors shrink-0"
          title="Back to Settings"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-4xl font-bold tracking-tight mb-2">Archive</h1>
          <p className="text-muted-foreground text-lg">Restore or permanently delete removed items</p>
        </div>
      </div>

      {isArchiveLoaded && archive.length === 0 && (
        <GlassCard className="p-12 text-center flex flex-col items-center justify-center border-dashed border-2 bg-transparent mt-4">
          <div className="w-16 h-16 bg-secondary/60 rounded-full flex items-center justify-center mb-6">
            <ArchiveIcon className="w-8 h-8 text-muted-foreground" />
          </div>
          <h2 className="text-2xl font-semibold mb-2">Archive is empty</h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            Deleted subjects, schedule events, and tasks show up here so you can restore them later.
          </p>
        </GlassCard>
      )}

      <div className="space-y-3">
        {archive.map((entry) => {
          const meta = CATEGORY_META[entry.category];
          const Icon = meta.icon;
          return (
            <GlassCard key={entry.id} className="p-4 flex items-center gap-4" data-testid={`archive-entry-${entry.id}`}>
              <div className="w-11 h-11 rounded-xl bg-secondary/60 flex items-center justify-center shrink-0">
                <Icon className="w-5 h-5 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate">{entryTitle(entry)}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {meta.label} · Deleted {format(new Date(entry.deletedAt), "MMM d, yyyy 'at' h:mm a")}
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => restoreArchiveItem(entry.id)}
                  className="p-2.5 rounded-full text-primary hover:bg-primary/10 transition-colors"
                  title="Restore"
                  data-testid={`btn-restore-${entry.id}`}
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setPurgingId(entry.id)}
                  className="p-2.5 rounded-full text-destructive hover:bg-destructive/10 transition-colors"
                  title="Permanently delete"
                  data-testid={`btn-purge-${entry.id}`}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </GlassCard>
          );
        })}
      </div>

      <ConfirmSheet
        isOpen={!!purgingId}
        onClose={() => setPurgingId(null)}
        onConfirm={() => { if (purgingId) { permanentlyDeleteArchiveItem(purgingId); setPurgingId(null); } }}
        title="Permanently delete?"
        message="This item will be gone for good — it cannot be restored after this."
        confirmLabel="Delete Forever"
      />
    </div>
  );
}
