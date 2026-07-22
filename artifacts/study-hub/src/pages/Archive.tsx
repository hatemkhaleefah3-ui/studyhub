import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { useStudyData } from "@/hooks/useStudyData";
import { GlassCard } from "@/components/shared/GlassCard";
import { ConfirmSheet } from "@/components/shared/ConfirmSheet";
import { ArchiveEntry } from "@/lib/api";
import { format } from "date-fns";
import { ArchiveIcon, ArrowLeft, RotateCcw, Trash2, BookOpen, Calendar as CalendarIcon, Check, CheckSquare } from "lucide-react";

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
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmPurge, setConfirmPurge] = useState(false);

  useEffect(() => { refreshArchive(); }, [refreshArchive]);
  useEffect(() => { setSelected(current => new Set([...current].filter(id => archive.some(entry => entry.id === id)))); }, [archive]);

  const allSelected = archive.length > 0 && selected.size === archive.length;
  const selectedEntries = useMemo(() => archive.filter(entry => selected.has(entry.id)), [archive, selected]);
  const toggle = (id: string) => setSelected(current => { const next = new Set(current); next.has(id) ? next.delete(id) : next.add(id); return next; });
  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(archive.map(entry => entry.id)));
  const restoreSelected = () => {
    selectedEntries.forEach(entry => restoreArchiveItem(entry.id));
    setSelected(new Set());
    if (selectedEntries.length === archive.length) setSelecting(false);
  };
  const purgeSelected = () => {
    selectedEntries.forEach(entry => permanentlyDeleteArchiveItem(entry.id));
    setSelected(new Set());
    setConfirmPurge(false);
    if (selectedEntries.length === archive.length) setSelecting(false);
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-28">
      <header className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <Link href="/" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-secondary/60 transition-colors hover:bg-secondary" title="Back to Dashboard">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="min-w-0">
            <h1 className="text-3xl font-black tracking-tight sm:text-4xl">Archive</h1>
            <p className="mt-1 text-sm text-muted-foreground sm:text-base">Restore or permanently delete removed items</p>
          </div>
        </div>
        {archive.length > 0 && (
          <button
            type="button"
            onClick={() => selecting ? toggleAll() : setSelecting(true)}
            className={`min-h-11 shrink-0 rounded-2xl border px-4 text-sm font-bold transition-all duration-200 active:scale-[.98] ${selecting ? "border-primary/25 bg-primary/10 text-primary" : "border-border/60 bg-card"}`}
          >
            {selecting ? allSelected ? "Unselect all" : "Select all" : "Select"}
          </button>
        )}
      </header>

      {selecting && (
        <div className="grid w-full grid-cols-2 gap-3">
          <button
            type="button"
            disabled={!selected.size}
            onClick={restoreSelected}
            className="flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl border border-primary/25 bg-primary/10 px-3 font-bold text-primary transition-all duration-200 active:scale-[.98] disabled:opacity-40"
          >
            <RotateCcw className="h-5 w-5" /> Restore Selected
          </button>
          <button
            type="button"
            disabled={!selected.size}
            onClick={() => setConfirmPurge(true)}
            className="flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-destructive px-3 font-bold text-destructive-foreground transition-all duration-200 active:scale-[.98] disabled:opacity-40"
          >
            <Trash2 className="h-5 w-5" /> Delete Forever
          </button>
        </div>
      )}

      {isArchiveLoaded && archive.length === 0 && (
        <GlassCard className="mt-4 flex flex-col items-center justify-center border-2 border-dashed bg-transparent p-12 text-center">
          <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-secondary/60"><ArchiveIcon className="h-8 w-8 text-muted-foreground" /></div>
          <h2 className="mb-2 text-2xl font-semibold">Archive is empty</h2>
          <p className="mx-auto max-w-md text-muted-foreground">Deleted subjects, schedule events, and tasks show up here so you can restore them later.</p>
        </GlassCard>
      )}

      <div className="space-y-3">
        {archive.map((entry) => {
          const meta = CATEGORY_META[entry.category];
          const Icon = meta.icon;
          const isSelected = selected.has(entry.id);
          return (
            <button
              type="button"
              key={entry.id}
              onClick={() => selecting && toggle(entry.id)}
              className="w-full rounded-3xl text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              data-testid={`archive-entry-${entry.id}`}
            >
              <GlassCard className={`relative flex items-center gap-4 rounded-3xl p-4 transition-all duration-200 ${isSelected ? "border-primary ring-2 ring-primary/25" : "border-border/50"}`}>
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-secondary/60"><Icon className="h-5 w-5 text-muted-foreground" /></div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{entryTitle(entry)}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{meta.label} · Deleted {format(new Date(entry.deletedAt), "MMM d, yyyy 'at' h:mm a")}</p>
                </div>
                {selecting ? (
                  <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border transition-all ${isSelected ? "border-primary bg-primary text-primary-foreground" : "border-border bg-secondary/40"}`}>
                    {isSelected && <Check className="h-4 w-4" />}
                  </span>
                ) : (
                  <div className="flex shrink-0 items-center gap-1">
                    <span onClick={(event) => { event.stopPropagation(); restoreArchiveItem(entry.id); }} className="rounded-full p-2.5 text-primary transition-colors hover:bg-primary/10" title="Restore"><RotateCcw className="h-4 w-4" /></span>
                    <span onClick={(event) => { event.stopPropagation(); setSelected(new Set([entry.id])); setConfirmPurge(true); }} className="rounded-full p-2.5 text-destructive transition-colors hover:bg-destructive/10" title="Permanently delete"><Trash2 className="h-4 w-4" /></span>
                  </div>
                )}
              </GlassCard>
            </button>
          );
        })}
      </div>

      <ConfirmSheet
        isOpen={confirmPurge}
        onClose={() => setConfirmPurge(false)}
        onConfirm={purgeSelected}
        title="Permanently delete selected items?"
        message={`${selected.size} item${selected.size === 1 ? "" : "s"} will be gone for good and cannot be restored.`}
        confirmLabel="Delete Forever"
      />
    </div>
  );
}
