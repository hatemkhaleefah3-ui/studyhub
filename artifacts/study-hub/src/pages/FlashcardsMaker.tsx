import { useState, useRef } from "react";
import * as XLSX from "xlsx";
import { useForm } from "react-hook-form";
import { Link, useRoute, useLocation } from "wouter";
import { ArrowLeft, Plus, Trash2, Brain, Layers, Pencil, FileSpreadsheet, ImageIcon } from "lucide-react";
import { useStudyData } from "@/hooks/useStudyData";
import { GlassCard } from "@/components/shared/GlassCard";
import { BottomSheet } from "@/components/shared/BottomSheet";
import { ConfirmSheet } from "@/components/shared/ConfirmSheet";
import { SwipeRow } from "@/components/shared/SwipeRow";
import { motion, AnimatePresence } from "framer-motion";

/**
 * Flashcards Maker — create/edit/delete flashcards for a lecture.
 * Each card is displayed as a visual Q&A flashcard in the list.
 * Tap a card to edit · swipe right to delete.
 */
export function FlashcardsMaker() {
  const [, params] = useRoute("/subjects/:subjectId/lectures/:lectureId/flashcards");
  const [, setLocation] = useLocation();
  const { subjects, addFlashcard, updateFlashcard, deleteFlashcard } = useStudyData();

  const subject = subjects.find(s => s.id === params?.subjectId);
  const lecture = subject?.lectures.find(l => l.id === params?.lectureId);

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [excelError, setExcelError] = useState<string | null>(null);
  const [addFrontIsImage, setAddFrontIsImage] = useState(false);
  const [addBackIsImage, setAddBackIsImage] = useState(false);
  const [editFrontIsImage, setEditFrontIsImage] = useState(false);
  const [editBackIsImage, setEditBackIsImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addForm = useForm({ defaultValues: { front: "", back: "" } });
  const editForm = useForm({ defaultValues: { front: "", back: "" } });

  if (!subject || !lecture) {
    return <div className="p-8 text-center text-muted-foreground">Lecture not found</div>;
  }

  // No per-subject color theming anymore
  const cards = lecture.flashcards || [];

  const inputCls =
    "w-full bg-background border border-border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground resize-none text-sm";

  const onAdd = (data: any) => {
    if (!data.front.trim() || !data.back.trim()) return;
    addFlashcard(subject.id, lecture.id, { front: data.front.trim(), back: data.back.trim() });
    addForm.reset();
    setAddFrontIsImage(false);
    setAddBackIsImage(false);
    setIsAddOpen(false);
  };

  const openEdit = (id: string) => {
    const card = cards.find(c => c.id === id);
    if (!card) return;
    editForm.reset({ front: card.front, back: card.back });
    setEditFrontIsImage(/^https?:\/\//.test(card.front));
    setEditBackIsImage(/^https?:\/\//.test(card.back));
    setEditingId(id);
  };

  const handleExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const data = await file.arrayBuffer();
      const wb = XLSX.read(data, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<Record<string, string>>(ws);
      if (!rows.length || !("Front face" in rows[0]) || !("Back face" in rows[0])) {
        setExcelError("Invalid file: first column must be 'Front face', second must be 'Back face'.");
        return;
      }
      let added = 0;
      rows.forEach(row => {
        const front = String(row["Front face"] ?? "").trim();
        const back  = String(row["Back face"]  ?? "").trim();
        if (front && back) { addFlashcard(subject.id, lecture.id, { front, back }); added++; }
      });
      setExcelError(added ? null : "No valid rows found in the file.");
    } catch {
      setExcelError("Could not parse the file. Please upload a valid .xlsx file.");
    }
  };

  const onEdit = (data: any) => {
    if (!editingId) return;
    updateFlashcard(subject.id, lecture.id, editingId, { front: data.front.trim(), back: data.back.trim() });
    setEditingId(null);
  };

  // Tab between textareas with Enter (Shift+Enter = newline)
  const textareaNext = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key !== "Enter" || e.shiftKey) return;
    const form = e.currentTarget.closest("form");
    if (!form) return;
    const areas = Array.from(form.querySelectorAll<HTMLElement>("textarea"));
    const idx = areas.indexOf(e.currentTarget);
    if (idx >= 0 && idx < areas.length - 1) {
      e.preventDefault();
      areas[idx + 1].focus();
    }
  };

  return (
    <div className="space-y-6 pb-20">
      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <Link
          href={`/subjects/${subject.id}/lectures/${lecture.id}`}
          className="p-2 rounded-full bg-secondary hover:bg-secondary/80 transition-colors shrink-0"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground truncate">
            {lecture.name}
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-primary">
            Flashcards
          </h1>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-secondary text-muted-foreground">
            {cards.length} {cards.length === 1 ? "card" : "cards"}
          </span>
          {cards.length > 0 && (
            <button
              onClick={() => setLocation(`/subjects/${subject.id}/lectures/${lecture.id}/study`)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-full text-primary-foreground bg-primary text-sm font-semibold shadow-md transition-opacity hover:opacity-90 active:scale-95"
            >
              <Brain className="w-4 h-4" /> Study
            </button>
          )}
        </div>
      </div>

      {/* ── Empty state ──────────────────────────────────────────────── */}
      {cards.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 gap-5 text-center">
          <div
            className="w-24 h-24 rounded-[28px] flex items-center justify-center shadow-lg bg-primary/10 border-2 border-primary/20"
          >
            <Layers className="w-12 h-12 text-primary" />
          </div>
          <div>
            <p className="text-lg font-bold">No cards yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Add your first flashcard to get started
            </p>
          </div>
          <button
            onClick={() => setIsAddOpen(true)}
            className="flex items-center gap-2 px-6 py-3 rounded-2xl text-primary-foreground bg-primary font-semibold text-sm shadow-md transition-opacity hover:opacity-90 active:scale-95"
          >
            <Plus className="w-4 h-4" /> Add First Card
          </button>
        </div>
      )}

      {/* ── Card list ────────────────────────────────────────────────── */}
      {cards.length > 0 && (
        <div className="space-y-3">
          <AnimatePresence initial={false}>
            {cards.map((card, i) => (
              <motion.div
                key={card.id}
                layout
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.18 }}
              >
                <SwipeRow
                  onTap={() => openEdit(card.id)}
                  onSwipeRight={() => setDeletingId(card.id)}
                  rightLabel="Delete"
                  rightIcon={Trash2}
                  rightColor="#ef4444"
                >
                  <GlassCard className="overflow-hidden cursor-pointer">
                    {/* Card header strip */}
                    <div
                      className="px-4 py-2.5 flex items-center justify-between bg-primary/10"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className="w-6 h-6 rounded-lg flex items-center justify-center text-[11px] font-black text-primary-foreground bg-primary shadow-sm shrink-0"
                        >
                          {i + 1}
                        </span>
                        <span
                          className="text-[10px] font-black uppercase tracking-widest text-primary"
                        >
                          Flashcard
                        </span>
                      </div>
                      <span className="flex items-center gap-1 text-[10px] text-muted-foreground opacity-50 font-medium">
                        <Pencil className="w-2.5 h-2.5" /> tap to edit
                      </span>
                    </div>

                    {/* Question */}
                    <div className="px-4 pt-3 pb-2">
                      <p
                        className="text-[10px] font-black uppercase tracking-widest mb-1.5 text-primary"
                      >
                        Q
                      </p>
                      {/^https?:\/\//.test(card.front) ? (
                        <img src={card.front} alt="[Image unavailable]" className="max-h-28 object-contain rounded-lg mx-auto" />
                      ) : (
                        <p className="font-semibold text-sm leading-relaxed">{card.front}</p>
                      )}
                    </div>

                    {/* Divider */}
                    <div className="mx-4 border-t border-dashed border-border/60" />

                    {/* Answer */}
                    <div className="px-4 pt-2 pb-3.5">
                      <p className="text-[10px] font-black uppercase tracking-widest mb-1.5 text-muted-foreground">
                        A
                      </p>
                      {/^https?:\/\//.test(card.back) ? (
                        <img src={card.back} alt="[Image unavailable]" className="max-h-28 object-contain rounded-lg mx-auto" />
                      ) : (
                        <p className="text-sm text-muted-foreground leading-relaxed">{card.back}</p>
                      )}
                    </div>
                  </GlassCard>
                </SwipeRow>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* ── Add button (when cards exist) ───────────────────────────── */}
      {cards.length > 0 && (
        <button
          onClick={() => setIsAddOpen(true)}
          className="w-full border-2 border-dashed border-border rounded-2xl p-4 text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-all flex items-center justify-center gap-2 font-medium text-sm"
        >
          <Plus className="w-4 h-4" /> Add Card
        </button>
      )}

      {/* ── Add sheet ───────────────────────────────────────────────── */}
      <BottomSheet
        isOpen={isAddOpen}
        onClose={() => { setIsAddOpen(false); addForm.reset(); setAddFrontIsImage(false); setAddBackIsImage(false); }}
        title="New Flashcard"
      >
        {/* Excel bulk import */}
        <div className="mb-5">
          <button
            type="button"
            onClick={() => { setExcelError(null); fileInputRef.current?.click(); }}
            className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-border rounded-xl p-3 text-sm text-muted-foreground hover:border-primary/40 hover:text-foreground transition-all font-medium"
          >
            <FileSpreadsheet className="w-4 h-4" /> Import from Excel (.xlsx)
          </button>
          <input ref={fileInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleExcelUpload} />
          {excelError && <p className="text-xs text-destructive mt-2">{excelError}</p>}
          <p className="text-xs text-muted-foreground mt-1.5 text-center">Columns: "Front face" · "Back face"</p>
        </div>

        <form onSubmit={addForm.handleSubmit(onAdd)} className="space-y-5">
          {/* Front face */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-semibold">
                Question <span className="text-muted-foreground font-normal text-xs">(front side)</span>
              </label>
              <div className="flex rounded-lg border border-border overflow-hidden text-xs font-semibold">
                <button type="button" onClick={() => setAddFrontIsImage(false)}
                  className={`px-2.5 py-1 transition-colors ${!addFrontIsImage ? "bg-primary text-primary-foreground" : "bg-secondary/50 text-muted-foreground"}`}>
                  Text
                </button>
                <button type="button" onClick={() => setAddFrontIsImage(true)}
                  className={`px-2.5 py-1 transition-colors flex items-center gap-1 ${addFrontIsImage ? "bg-primary text-primary-foreground" : "bg-secondary/50 text-muted-foreground"}`}>
                  <ImageIcon className="w-3 h-3" /> URL
                </button>
              </div>
            </div>
            {addFrontIsImage ? (
              <input type="url" {...addForm.register("front", { required: true })} className={inputCls} placeholder="https://example.com/image.jpg" />
            ) : (
              <textarea {...addForm.register("front", { required: true })} className={inputCls} rows={3} placeholder="What is…?" onKeyDown={textareaNext} />
            )}
          </div>

          {/* Back face */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-semibold">
                Answer <span className="text-muted-foreground font-normal text-xs">(back side)</span>
              </label>
              <div className="flex rounded-lg border border-border overflow-hidden text-xs font-semibold">
                <button type="button" onClick={() => setAddBackIsImage(false)}
                  className={`px-2.5 py-1 transition-colors ${!addBackIsImage ? "bg-primary text-primary-foreground" : "bg-secondary/50 text-muted-foreground"}`}>
                  Text
                </button>
                <button type="button" onClick={() => setAddBackIsImage(true)}
                  className={`px-2.5 py-1 transition-colors flex items-center gap-1 ${addBackIsImage ? "bg-primary text-primary-foreground" : "bg-secondary/50 text-muted-foreground"}`}>
                  <ImageIcon className="w-3 h-3" /> URL
                </button>
              </div>
            </div>
            {addBackIsImage ? (
              <input type="url" {...addForm.register("back", { required: true })} className={inputCls} placeholder="https://example.com/image.jpg" />
            ) : (
              <textarea {...addForm.register("back", { required: true })} className={inputCls} rows={3} placeholder="The answer is…" />
            )}
          </div>

          <button
            type="submit"
            className="w-full text-primary-foreground bg-primary font-semibold rounded-xl py-3.5 transition-opacity hover:opacity-90 active:scale-[0.98]"
          >
            Add Card
          </button>
        </form>
      </BottomSheet>

      {/* ── Edit sheet ──────────────────────────────────────────────── */}
      <BottomSheet isOpen={!!editingId} onClose={() => { setEditingId(null); setEditFrontIsImage(false); setEditBackIsImage(false); }} title="Edit Flashcard">
        <form onSubmit={editForm.handleSubmit(onEdit)} className="space-y-5">
          {/* Front face */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-semibold">
                Question <span className="text-muted-foreground font-normal text-xs">(front side)</span>
              </label>
              <div className="flex rounded-lg border border-border overflow-hidden text-xs font-semibold">
                <button type="button" onClick={() => setEditFrontIsImage(false)}
                  className={`px-2.5 py-1 transition-colors ${!editFrontIsImage ? "bg-primary text-primary-foreground" : "bg-secondary/50 text-muted-foreground"}`}>
                  Text
                </button>
                <button type="button" onClick={() => setEditFrontIsImage(true)}
                  className={`px-2.5 py-1 transition-colors flex items-center gap-1 ${editFrontIsImage ? "bg-primary text-primary-foreground" : "bg-secondary/50 text-muted-foreground"}`}>
                  <ImageIcon className="w-3 h-3" /> URL
                </button>
              </div>
            </div>
            {editFrontIsImage ? (
              <input type="url" {...editForm.register("front", { required: true })} className={inputCls} placeholder="https://example.com/image.jpg" />
            ) : (
              <textarea {...editForm.register("front", { required: true })} className={inputCls} rows={3} onKeyDown={textareaNext} />
            )}
          </div>

          {/* Back face */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-semibold">
                Answer <span className="text-muted-foreground font-normal text-xs">(back side)</span>
              </label>
              <div className="flex rounded-lg border border-border overflow-hidden text-xs font-semibold">
                <button type="button" onClick={() => setEditBackIsImage(false)}
                  className={`px-2.5 py-1 transition-colors ${!editBackIsImage ? "bg-primary text-primary-foreground" : "bg-secondary/50 text-muted-foreground"}`}>
                  Text
                </button>
                <button type="button" onClick={() => setEditBackIsImage(true)}
                  className={`px-2.5 py-1 transition-colors flex items-center gap-1 ${editBackIsImage ? "bg-primary text-primary-foreground" : "bg-secondary/50 text-muted-foreground"}`}>
                  <ImageIcon className="w-3 h-3" /> URL
                </button>
              </div>
            </div>
            {editBackIsImage ? (
              <input type="url" {...editForm.register("back", { required: true })} className={inputCls} placeholder="https://example.com/image.jpg" />
            ) : (
              <textarea {...editForm.register("back", { required: true })} className={inputCls} rows={3} />
            )}
          </div>

          <button
            type="submit"
            className="w-full text-primary-foreground bg-primary font-semibold rounded-xl py-3.5 transition-opacity hover:opacity-90 active:scale-[0.98]"
          >
            Save Changes
          </button>
        </form>
      </BottomSheet>

      {/* ── Delete confirm ──────────────────────────────────────────── */}
      <ConfirmSheet
        isOpen={!!deletingId}
        onClose={() => setDeletingId(null)}
        onConfirm={() => {
          if (deletingId) {
            deleteFlashcard(subject.id, lecture.id, deletingId);
            setDeletingId(null);
          }
        }}
        title="Delete flashcard?"
        message="This flashcard will be permanently removed."
      />
    </div>
  );
}
