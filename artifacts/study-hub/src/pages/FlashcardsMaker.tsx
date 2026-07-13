import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useRoute, useLocation } from "wouter";
import { ArrowLeft, Plus, Trash2, Brain } from "lucide-react";
import { useStudyData } from "@/hooks/useStudyData";
import { GlassCard } from "@/components/shared/GlassCard";
import { BottomSheet } from "@/components/shared/BottomSheet";
import { ConfirmSheet } from "@/components/shared/ConfirmSheet";
import { SwipeRow } from "@/components/shared/SwipeRow";

/**
 * Flashcards Maker — create/edit/delete flashcards for a lecture. Reached
 * by swiping a lecture row left-to-right on the Lectures tab (spec 1.3).
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

  const addForm = useForm({ defaultValues: { front: "", back: "" } });
  const editForm = useForm({ defaultValues: { front: "", back: "" } });

  if (!subject || !lecture) {
    return <div className="p-8 text-center text-muted-foreground">Lecture not found</div>;
  }

  const accentColor = subject.color;
  const inputCls =
    "w-full bg-background border border-border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground";
  const cards = lecture.flashcards || [];

  const onAdd = (data: any) => {
    if (!data.front.trim() || !data.back.trim()) return;
    addFlashcard(subject.id, lecture.id, { front: data.front.trim(), back: data.back.trim() });
    addForm.reset();
    setIsAddOpen(false);
  };

  const openEdit = (id: string) => {
    const card = cards.find(c => c.id === id);
    if (!card) return;
    editForm.reset({ front: card.front, back: card.back });
    setEditingId(id);
  };

  const onEdit = (data: any) => {
    if (!editingId) return;
    updateFlashcard(subject.id, lecture.id, editingId, { front: data.front.trim(), back: data.back.trim() });
    setEditingId(null);
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center gap-3">
        <Link
          href={`/subjects/${subject.id}/lectures/${lecture.id}`}
          className="p-2 rounded-full bg-secondary hover:bg-secondary/80 transition-colors shrink-0"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold tracking-tight truncate" style={{ color: accentColor }}>
            {lecture.name}
          </h1>
          <p className="text-sm text-muted-foreground">Flashcards Maker &middot; {cards.length} cards</p>
        </div>
        {cards.length > 0 && (
          <button
            onClick={() => setLocation(`/subjects/${subject.id}/lectures/${lecture.id}/study`)}
            className="p-2.5 rounded-full text-white shrink-0"
            style={{ backgroundColor: accentColor }}
            title="Study these cards"
          >
            <Brain className="w-4 h-4" />
          </button>
        )}
      </div>

      {cards.length === 0 ? (
        <GlassCard className="p-10 text-center text-muted-foreground border-dashed border-2 bg-transparent">
          <p className="font-medium">No flashcards yet</p>
          <p className="text-sm mt-1 opacity-70">Add a card to get started</p>
        </GlassCard>
      ) : (
        <div className="space-y-3">
          {cards.map(card => (
            <SwipeRow
              key={card.id}
              onTap={() => openEdit(card.id)}
              onSwipeRight={() => setDeletingId(card.id)}
              rightLabel="Delete"
              rightIcon={Trash2}
              rightColor="#ef4444"
            >
              <GlassCard className="p-4 cursor-pointer">
                <p className="font-semibold text-sm">{card.front}</p>
                <p className="text-sm text-muted-foreground mt-1">{card.back}</p>
              </GlassCard>
            </SwipeRow>
          ))}
        </div>
      )}

      <button
        onClick={() => setIsAddOpen(true)}
        className="w-full border-2 border-dashed border-border rounded-2xl p-4 text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-all flex items-center justify-center gap-2 font-medium"
      >
        <Plus className="w-4 h-4" /> Add Flashcard
      </button>

      <BottomSheet isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} title="New Flashcard">
        <form onSubmit={addForm.handleSubmit(onAdd)} className="space-y-5">
          <div>
            <label className="block text-sm font-medium mb-2">Front</label>
            <textarea {...addForm.register("front", { required: true })} className={inputCls} rows={3} autoFocus />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Back</label>
            <textarea {...addForm.register("back", { required: true })} className={inputCls} rows={3} />
          </div>
          <button
            type="submit"
            className="w-full text-white font-semibold rounded-xl py-3.5 transition-opacity hover:opacity-90"
            style={{ backgroundColor: accentColor }}
          >
            Add Card
          </button>
        </form>
      </BottomSheet>

      <BottomSheet isOpen={!!editingId} onClose={() => setEditingId(null)} title="Edit Flashcard">
        <form onSubmit={editForm.handleSubmit(onEdit)} className="space-y-5">
          <div>
            <label className="block text-sm font-medium mb-2">Front</label>
            <textarea {...editForm.register("front", { required: true })} className={inputCls} rows={3} autoFocus />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Back</label>
            <textarea {...editForm.register("back", { required: true })} className={inputCls} rows={3} />
          </div>
          <button
            type="submit"
            className="w-full text-white font-semibold rounded-xl py-3.5 transition-opacity hover:opacity-90"
            style={{ backgroundColor: accentColor }}
          >
            Save Changes
          </button>
        </form>
      </BottomSheet>

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
