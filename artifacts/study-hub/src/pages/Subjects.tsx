import { useState } from "react";
import { useStudyData, DEFAULT_SUBJECT_EMOJIS } from "@/hooks/useStudyData";
import { GlassCard } from "@/components/shared/GlassCard";
import { BottomSheet } from "@/components/shared/BottomSheet";
import { ConfirmSheet } from "@/components/shared/ConfirmSheet";
import { FabPortal } from "@/components/shared/FabPortal";
import { SwipeableRow } from "@/components/shared/SwipeableRow";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Link } from "wouter";
import { useForm } from "react-hook-form";

const ACCENT_COLORS = [
  "#007aff","#34c759","#ff9500","#ff3b30","#af52de",
  "#5ac8fa","#ff2d55","#30d158","#ffcc00","#32ade6",
];

const inputCls = "w-full bg-background border border-border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground";

function EmojiPicker({
  selected,
  onSelect,
}: {
  selected: string;
  onSelect: (e: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {DEFAULT_SUBJECT_EMOJIS.map((em) => (
        <button
          key={em}
          type="button"
          onClick={() => onSelect(em)}
          className={`w-10 h-10 rounded-xl text-xl flex items-center justify-center transition-all border ${
            selected === em
              ? "bg-primary/10 border-primary scale-110 shadow-sm"
              : "bg-secondary/50 border-border/50 hover:bg-secondary hover:scale-105"
          }`}
        >
          {em}
        </button>
      ))}
    </div>
  );
}

function ColorPicker({
  selected,
  onSelect,
}: {
  selected: string;
  onSelect: (c: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {ACCENT_COLORS.map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => onSelect(c)}
          className={`w-8 h-8 rounded-full border-2 transition-all ${
            selected === c ? "scale-125 border-foreground/40" : "border-transparent hover:scale-110"
          }`}
          style={{ backgroundColor: c }}
        />
      ))}
    </div>
  );
}

export function Subjects() {
  const { subjects, addSubject, updateSubject, deleteSubject } = useStudyData();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Add form state
  const { register, handleSubmit, reset } = useForm({ defaultValues: { name: "" } });
  const [addEmoji, setAddEmoji] = useState(DEFAULT_SUBJECT_EMOJIS[0]);
  const [addColor, setAddColor] = useState(ACCENT_COLORS[0]);

  // Edit form state
  const { register: regEdit, handleSubmit: handleEditSubmit, reset: resetEdit } = useForm({ defaultValues: { name: "" } });
  const [editEmoji, setEditEmoji] = useState(DEFAULT_SUBJECT_EMOJIS[0]);
  const [editColor, setEditColor] = useState(ACCENT_COLORS[0]);

  const onSubmit = (data: any) => {
    addSubject({ name: data.name, emoji: addEmoji, color: addColor });
    reset();
    setAddEmoji(DEFAULT_SUBJECT_EMOJIS[0]);
    setAddColor(ACCENT_COLORS[0]);
    setIsAddOpen(false);
  };

  const openEdit = (id: string) => {
    const sub = subjects.find((s) => s.id === id);
    if (!sub) return;
    resetEdit({ name: sub.name });
    setEditEmoji(sub.emoji ?? DEFAULT_SUBJECT_EMOJIS[0]);
    setEditColor(sub.color ?? ACCENT_COLORS[0]);
    setEditingId(id);
  };

  const onEditSubmit = (data: any) => {
    if (!editingId) return;
    updateSubject(editingId, { name: data.name, emoji: editEmoji, color: editColor });
    setEditingId(null);
  };

  return (
    <div className="space-y-8 pb-20">
      <div>
        <h1 className="text-4xl font-bold tracking-tight mb-2">Subjects</h1>
        <p className="text-muted-foreground text-lg">Manage your courses</p>
      </div>

      {subjects.length === 0 ? (
        <GlassCard className="p-12 text-center flex flex-col items-center justify-center border-dashed border-2 bg-transparent mt-12">
          <div className="w-16 h-16 bg-secondary/50 rounded-full flex items-center justify-center mb-6 border border-border/50 text-3xl">
            📚
          </div>
          <h2 className="text-2xl font-semibold mb-2 tracking-tight">No subjects yet</h2>
          <p className="text-muted-foreground mb-8 max-w-md mx-auto">
            Create your first subject to start organizing your lectures, exams, and tasks.
          </p>
        </GlassCard>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {subjects.map((subject) => {
            const gradedExams = subject.exams.filter((e) => e.grade);
            const avg =
              gradedExams.length
                ? Math.round(
                    gradedExams.reduce((acc, curr) => acc + (parseFloat(curr.grade!) || 0), 0) /
                      gradedExams.length
                  )
                : null;

            return (
              <SwipeableRow
                key={subject.id}
                onEdit={() => openEdit(subject.id)}
                onDelete={() => setDeletingId(subject.id)}
                className="h-full"
              >
                <Link href={`/subjects/${subject.id}`} className="block h-full">
                  <GlassCard
                    className="p-5 hover:-translate-y-1 transition-all duration-300 cursor-pointer relative group h-full flex flex-col bg-card/60 hover:bg-card hover:shadow-xl border border-border/50 overflow-hidden"
                    style={{ borderTopColor: subject.color, borderTopWidth: 3 }}
                  >
                    {/* Subtle color tint overlay */}
                    <div
                      className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                      style={{ background: `linear-gradient(135deg, ${subject.color}08 0%, transparent 60%)` }}
                    />

                    {/* Edit / Delete hover buttons */}
                    <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                      <button
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); openEdit(subject.id); }}
                        className="w-8 h-8 rounded-full bg-background/90 backdrop-blur flex items-center justify-center hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors border border-border/50 shadow-sm"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setDeletingId(subject.id); }}
                        className="w-8 h-8 rounded-full bg-background/90 backdrop-blur flex items-center justify-center hover:bg-destructive/10 hover:text-destructive text-muted-foreground transition-colors border border-border/50 shadow-sm"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="relative z-10 flex-1 flex flex-col">
                      {/* Emoji icon */}
                      <div
                        className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4 text-3xl border shadow-sm shrink-0"
                        style={{
                          backgroundColor: `${subject.color}18`,
                          borderColor: `${subject.color}30`,
                        }}
                      >
                        {subject.emoji ?? "📚"}
                      </div>

                      <h3 className="text-xl font-bold mb-4 text-foreground tracking-tight pr-12 leading-snug line-clamp-2">
                        {subject.name}
                      </h3>
                    </div>

                    <div className="relative z-10 flex gap-2 mt-2 pt-4 border-t border-border/40">
                      <div className="bg-secondary/40 border border-border/40 rounded-xl px-3 py-2.5 flex-1 flex flex-col justify-center group-hover:bg-secondary/60 transition-colors">
                        <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mb-0.5">
                          Avg Grade
                        </p>
                        <p className="text-sm font-bold text-foreground">{avg !== null ? `${avg}%` : "—"}</p>
                      </div>
                      <div className="bg-secondary/40 border border-border/40 rounded-xl px-3 py-2.5 flex-1 flex flex-col justify-center group-hover:bg-secondary/60 transition-colors">
                        <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mb-0.5">
                          Exams
                        </p>
                        <p className="text-sm font-bold text-foreground">{subject.exams.length}</p>
                      </div>
                      <div className="bg-secondary/40 border border-border/40 rounded-xl px-3 py-2.5 flex-1 flex flex-col justify-center group-hover:bg-secondary/60 transition-colors">
                        <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mb-0.5">
                          Lectures
                        </p>
                        <p className="text-sm font-bold text-foreground">{subject.lectures.length}</p>
                      </div>
                    </div>
                  </GlassCard>
                </Link>
              </SwipeableRow>
            );
          })}
        </div>
      )}

      {/* FAB */}
      <FabPortal>
        <button
          onClick={() => setIsAddOpen(true)}
          className="fixed bottom-24 md:bottom-10 right-6 md:right-10 w-14 h-14 bg-primary text-primary-foreground rounded-full shadow-lg shadow-primary/30 flex items-center justify-center hover:scale-105 transition-transform z-40"
        >
          <Plus className="w-6 h-6" />
        </button>
      </FabPortal>

      {/* Add Subject sheet */}
      <BottomSheet isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} title="New Subject">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2">Subject Name</label>
            <input
              {...register("name", { required: true })}
              className={inputCls}
              placeholder="e.g. Advanced Mathematics"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-3">Icon</label>
            <EmojiPicker selected={addEmoji} onSelect={setAddEmoji} />
          </div>

          <div>
            <label className="block text-sm font-medium mb-3">Color</label>
            <ColorPicker selected={addColor} onSelect={setAddColor} />
          </div>

          {/* Preview */}
          <div className="flex items-center gap-3 p-3 rounded-xl bg-secondary/40 border border-border/40">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-xl border"
              style={{ backgroundColor: `${addColor}18`, borderColor: `${addColor}30` }}
            >
              {addEmoji}
            </div>
            <span className="font-semibold text-foreground">Preview</span>
          </div>

          <button
            type="submit"
            className="w-full bg-primary text-primary-foreground font-semibold rounded-xl py-3.5 hover:opacity-90 transition-opacity"
          >
            Create Subject
          </button>
        </form>
      </BottomSheet>

      {/* Edit Subject sheet */}
      <BottomSheet isOpen={!!editingId} onClose={() => setEditingId(null)} title="Edit Subject">
        <form onSubmit={handleEditSubmit(onEditSubmit)} className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2">Subject Name</label>
            <input {...regEdit("name", { required: true })} className={inputCls} />
          </div>

          <div>
            <label className="block text-sm font-medium mb-3">Icon</label>
            <EmojiPicker selected={editEmoji} onSelect={setEditEmoji} />
          </div>

          <div>
            <label className="block text-sm font-medium mb-3">Color</label>
            <ColorPicker selected={editColor} onSelect={setEditColor} />
          </div>

          {/* Preview */}
          <div className="flex items-center gap-3 p-3 rounded-xl bg-secondary/40 border border-border/40">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-xl border"
              style={{ backgroundColor: `${editColor}18`, borderColor: `${editColor}30` }}
            >
              {editEmoji}
            </div>
            <span className="font-semibold text-foreground">Preview</span>
          </div>

          <button
            type="submit"
            className="w-full bg-primary text-primary-foreground font-semibold rounded-xl py-3.5 hover:opacity-90 transition-opacity"
          >
            Save Changes
          </button>
        </form>
      </BottomSheet>

      {/* Delete confirm */}
      <ConfirmSheet
        isOpen={!!deletingId}
        onClose={() => setDeletingId(null)}
        onConfirm={() => {
          if (deletingId) { deleteSubject(deletingId); setDeletingId(null); }
        }}
        title="Delete subject?"
        message="This will move the subject, along with its lectures, exams, and linked tasks, to the Archive. You can restore it later from Settings."
        confirmLabel="Move to Archive"
      />
    </div>
  );
}
