import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { Link, useRoute, useLocation } from "wouter";
import {
  ArrowLeft, Trash2, Layers, Brain, Upload, ExternalLink, Plus,
} from "lucide-react";
import { useStudyData, StudyType, Flashcard } from "@/hooks/useStudyData";
import { BottomSheet } from "@/components/shared/BottomSheet";
import { ConfirmSheet } from "@/components/shared/ConfirmSheet";
import { LectureCoverBadge } from "@/components/study/LectureCoverBadge";
import { parseFlashcardExcel } from "@/lib/excelImport";

export function LectureEdit() {
  const [, params] = useRoute("/subjects/:subjectId/lectures/:lectureId");
  const [, setLocation] = useLocation();
  const { subjects, updateLecture, deleteLecture } = useStudyData();

  const subject = subjects.find(s => s.id === params?.subjectId);
  const lecture = subject?.lectures.find(l => l.id === params?.lectureId);

  const [isDeleting, setIsDeleting] = useState(false);
  const [flashcardsOpen, setFlashcardsOpen] = useState(false);

  // Flashcard import state
  const addMoreRef = useRef<HTMLInputElement>(null);
  const replaceAllRef = useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  const form = useForm({
    defaultValues: { name: lecture?.name ?? "", link: lecture?.link ?? "" },
  });

  if (!subject || !lecture) {
    return <div className="p-8 text-center text-muted-foreground">Lecture not found</div>;
  }

  const handleFlashcardImport = async (
    e: React.ChangeEvent<HTMLInputElement>,
    mode: "append" | "replace",
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportError(null);
    setIsImporting(true);
    setFlashcardsOpen(false);
    try {
      const { rows } = await parseFlashcardExcel(file);
      const newCards: Flashcard[] = rows.map(r => ({
        id: crypto.randomUUID(),
        front: r.front,
        back: r.back,
      }));
      const existing = mode === "append" ? (lecture.flashcards ?? []) : [];
      updateLecture(subject.id, lecture.id, { flashcards: [...existing, ...newCards] });
    } catch {
      setImportError("Could not parse the file. Make sure it's a valid Excel/CSV with Front and Back columns.");
    } finally {
      setIsImporting(false);
      if (e.target) e.target.value = "";
    }
  };

  const onSave = (data: any) => {
    updateLecture(subject.id, lecture.id, { name: data.name, link: data.link });
  };

  const setType = (type: StudyType) => {
    updateLecture(subject.id, lecture.id, { type });
  };

  const handleDelete = () => {
    deleteLecture(subject.id, lecture.id);
    setLocation(`/subjects/${subject.id}?tab=lectures`);
  };

  const flashcardCount = lecture.flashcards?.length ?? 0;

  const inputCls =
    "w-full bg-secondary/40 border border-border/60 rounded-2xl px-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 text-foreground placeholder:text-muted-foreground/50 transition-all text-sm";

  return (
    <div className="pb-24 space-y-0">

      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <div className="relative -mx-4 md:-mx-6 px-4 md:px-6 pt-2 pb-6 mb-6 bg-gradient-to-b from-primary/8 via-primary/4 to-transparent border-b border-border/30">
        <div className="flex items-start gap-3">
          <Link
            href={`/subjects/${subject.id}?tab=lectures&type=${lecture.type}`}
            className="mt-1 p-2 rounded-full bg-background/80 hover:bg-background border border-border/50 shadow-sm transition-colors shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="flex-1 min-w-0 py-1">
            <p className="text-xs font-semibold text-primary/70 uppercase tracking-widest mb-1">
              {subject.name} · Lecture
            </p>
            <h1 className="text-2xl font-bold tracking-tight text-foreground leading-snug">
              {lecture.name}
            </h1>
            <div className="flex items-center gap-2 mt-2">
              <span className={`text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                lecture.type === "theoretical"
                  ? "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20"
                  : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
              }`}>
                {lecture.type}
              </span>
              {flashcardCount > 0 && (
                <span className="text-[11px] font-semibold text-muted-foreground">
                  {flashcardCount} flashcard{flashcardCount !== 1 ? "s" : ""}
                </span>
              )}
            </div>
          </div>
          <div className="shrink-0 mt-1">
            <LectureCoverBadge percentage={lecture.readerLastPercentage} />
          </div>
        </div>
      </div>

      {/* ── Quick actions ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <button
          onClick={() => { setImportError(null); setFlashcardsOpen(true); }}
          className="group relative overflow-hidden rounded-2xl p-4 bg-violet-500/10 hover:bg-violet-500/15 border border-violet-500/20 hover:border-violet-500/35 transition-all text-left"
        >
          <div className="w-9 h-9 rounded-xl bg-violet-500/15 border border-violet-500/20 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
            <Layers className="w-4.5 h-4.5 text-violet-600 dark:text-violet-400" />
          </div>
          <p className="font-bold text-sm text-foreground">Flashcards</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {flashcardCount > 0 ? `${flashcardCount} cards` : "Make · Import"}
          </p>
        </button>

        <button
          onClick={() => setLocation(`/subjects/${subject.id}/lectures/${lecture.id}/study`)}
          className="group relative overflow-hidden rounded-2xl p-4 bg-emerald-500/10 hover:bg-emerald-500/15 border border-emerald-500/20 hover:border-emerald-500/35 transition-all text-left"
        >
          <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
            <Brain className="w-4.5 h-4.5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <p className="font-bold text-sm text-foreground">Study</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">Flip-card review</p>
        </button>
      </div>

      {/* ── Edit form ────────────────────────────────────────────────── */}
      <form
        onSubmit={form.handleSubmit(onSave)}
        onBlur={form.handleSubmit(onSave)}
        className="space-y-3 mb-5"
      >
        {/* Name */}
        <div className="bg-card border border-border/50 rounded-2xl p-4 shadow-sm space-y-2">
          <label className="block text-xs font-bold uppercase tracking-widest text-muted-foreground">
            Lecture Name
          </label>
          <input
            {...form.register("name", { required: true })}
            className={inputCls}
            placeholder="Enter lecture name…"
          />
        </div>

        {/* Link */}
        <div className="bg-card border border-border/50 rounded-2xl p-4 shadow-sm space-y-2">
          <label className="block text-xs font-bold uppercase tracking-widest text-muted-foreground">
            Link <span className="font-normal normal-case tracking-normal text-muted-foreground/60">(optional)</span>
          </label>
          <div className="relative">
            <input
              {...form.register("link")}
              className={inputCls + " pr-10"}
              placeholder="https://…"
            />
            {form.watch("link") && (
              <a
                href={form.watch("link")}
                target="_blank"
                rel="noopener noreferrer"
                onClick={e => e.stopPropagation()}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg text-muted-foreground hover:text-primary transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            )}
          </div>
        </div>
      </form>

      {/* ── Type ─────────────────────────────────────────────────────── */}
      <div className="bg-card border border-border/50 rounded-2xl p-4 shadow-sm mb-5">
        <label className="block text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">
          Type
        </label>
        <div className="bg-secondary/50 p-1 rounded-xl flex gap-1">
          {(["theoretical", "practical"] as StudyType[]).map(t => (
            <button
              key={t}
              type="button"
              onClick={() => setType(t)}
              className={`flex-1 py-2.5 rounded-xl text-sm font-semibold capitalize transition-all ${
                lecture.type === t
                  ? "bg-background shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* ── Delete ───────────────────────────────────────────────────── */}
      <button
        type="button"
        onClick={() => setIsDeleting(true)}
        className="w-full flex items-center justify-center gap-2 rounded-2xl py-3.5 font-semibold text-destructive/80 hover:text-destructive bg-destructive/6 hover:bg-destructive/12 border border-destructive/15 hover:border-destructive/30 transition-all"
      >
        <Trash2 className="w-4 h-4" /> Delete Lecture
      </button>

      {/* ── Flashcards bottom sheet ───────────────────────────────────── */}
      <BottomSheet isOpen={flashcardsOpen} onClose={() => setFlashcardsOpen(false)} title="Flashcards">
        <div className="space-y-2.5 pb-2">

          {/* 1 — Add more Flashcards (append from Excel) */}
          <button
            onClick={() => addMoreRef.current?.click()}
            disabled={isImporting}
            className="w-full flex items-center gap-4 rounded-2xl p-4 bg-secondary/50 hover:bg-secondary transition-colors text-left border border-border/40 hover:border-border/60 disabled:opacity-50"
          >
            <div className="w-11 h-11 rounded-xl bg-violet-500/12 border border-violet-500/20 flex items-center justify-center shrink-0">
              <Upload className="w-5 h-5 text-violet-600 dark:text-violet-400" />
            </div>
            <div>
              <p className="font-bold text-sm text-foreground">Add more Flashcards</p>
              <p className="text-xs text-muted-foreground mt-0.5">Import from Excel · keeps existing cards</p>
            </div>
          </button>

          {/* 2 — Replace all Flashcards (replace from Excel) */}
          <button
            onClick={() => replaceAllRef.current?.click()}
            disabled={isImporting}
            className="w-full flex items-center gap-4 rounded-2xl p-4 bg-secondary/50 hover:bg-secondary transition-colors text-left border border-border/40 hover:border-border/60 disabled:opacity-50"
          >
            <div className="w-11 h-11 rounded-xl bg-sky-500/12 border border-sky-500/20 flex items-center justify-center shrink-0">
              <Upload className="w-5 h-5 text-sky-600 dark:text-sky-400" />
            </div>
            <div>
              <p className="font-bold text-sm text-foreground">Replace all Flashcards</p>
              <p className="text-xs text-muted-foreground mt-0.5">Import from Excel · replaces all existing cards</p>
            </div>
          </button>

          {/* 3 — Add a new flashcard manually */}
          <button
            onClick={() => {
              setLocation(`/subjects/${subject.id}/lectures/${lecture.id}/flashcards`);
              setFlashcardsOpen(false);
            }}
            className="w-full flex items-center gap-4 rounded-2xl p-4 bg-secondary/50 hover:bg-secondary transition-colors text-left border border-border/40 hover:border-border/60"
          >
            <div className="w-11 h-11 rounded-xl bg-emerald-500/12 border border-emerald-500/20 flex items-center justify-center shrink-0">
              <Plus className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="font-bold text-sm text-foreground">Add a new flashcard</p>
              <p className="text-xs text-muted-foreground mt-0.5">Create front / back cards manually</p>
            </div>
          </button>

          {importError && (
            <p className="text-sm text-destructive font-medium bg-destructive/10 border border-destructive/20 rounded-xl px-3 py-2">
              {importError}
            </p>
          )}
        </div>
      </BottomSheet>

      {/* Hidden file inputs */}
      <input
        ref={addMoreRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        className="hidden"
        onChange={e => handleFlashcardImport(e, "append")}
      />
      <input
        ref={replaceAllRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        className="hidden"
        onChange={e => handleFlashcardImport(e, "replace")}
      />

      <ConfirmSheet
        isOpen={isDeleting}
        onClose={() => setIsDeleting(false)}
        onConfirm={handleDelete}
        title="Delete lecture?"
        message="This lecture and all its flashcards will be permanently removed."
      />
    </div>
  );
}
