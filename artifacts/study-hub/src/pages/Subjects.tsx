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

const ACCENT_COLORS = ["#007aff", "#34c759", "#ff9500", "#ff3b30", "#af52de", "#5ac8fa", "#ff2d55", "#30d158", "#ffcc00", "#32ade6"];
const inputCls = "w-full rounded-xl border border-border bg-background px-4 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50";

function EmojiPicker({ selected, onSelect }: { selected: string; onSelect: (emoji: string) => void }) {
  return <div className="flex flex-wrap gap-2">{DEFAULT_SUBJECT_EMOJIS.map(emoji => <button key={emoji} type="button" onClick={() => onSelect(emoji)} className={`flex h-10 w-10 items-center justify-center rounded-xl border text-xl transition-all ${selected === emoji ? "scale-110 border-primary bg-primary/10 shadow-sm" : "border-border/50 bg-secondary/50 hover:scale-105 hover:bg-secondary"}`}>{emoji}</button>)}</div>;
}

function ColorPicker({ selected, onSelect }: { selected: string; onSelect: (color: string) => void }) {
  return <div className="flex flex-wrap gap-2">{ACCENT_COLORS.map(color => <button key={color} type="button" onClick={() => onSelect(color)} className={`h-8 w-8 rounded-full border-2 transition-all ${selected === color ? "scale-125 border-foreground/40" : "border-transparent hover:scale-110"}`} style={{ backgroundColor: color }} />)}</div>;
}

export function Subjects() {
  const { subjects, addSubject, updateSubject, deleteSubject } = useStudyData();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const { register, handleSubmit, reset } = useForm({ defaultValues: { name: "" } });
  const [addEmoji, setAddEmoji] = useState(DEFAULT_SUBJECT_EMOJIS[0]);
  const [addColor, setAddColor] = useState(ACCENT_COLORS[0]);
  const { register: regEdit, handleSubmit: handleEditSubmit, reset: resetEdit } = useForm({ defaultValues: { name: "" } });
  const [editEmoji, setEditEmoji] = useState(DEFAULT_SUBJECT_EMOJIS[0]);
  const [editColor, setEditColor] = useState(ACCENT_COLORS[0]);

  const onSubmit = (data: { name: string }) => {
    addSubject({ name: data.name, emoji: addEmoji, color: addColor });
    reset(); setAddEmoji(DEFAULT_SUBJECT_EMOJIS[0]); setAddColor(ACCENT_COLORS[0]); setIsAddOpen(false);
  };
  const openEdit = (id: string) => {
    const subject = subjects.find(item => item.id === id); if (!subject) return;
    resetEdit({ name: subject.name }); setEditEmoji(subject.emoji ?? DEFAULT_SUBJECT_EMOJIS[0]); setEditColor(subject.color ?? ACCENT_COLORS[0]); setEditingId(id);
  };
  const onEditSubmit = (data: { name: string }) => { if (!editingId) return; updateSubject(editingId, { name: data.name, emoji: editEmoji, color: editColor }); setEditingId(null); };

  return <div className="space-y-8 pb-20">
    <header><h1 className="mb-2 text-4xl font-bold tracking-tight">Subjects</h1><p className="text-lg text-muted-foreground">Manage your courses</p></header>
    {subjects.length === 0 ? <GlassCard className="mt-12 flex flex-col items-center justify-center border-2 border-dashed bg-transparent p-12 text-center"><div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full border border-border/50 bg-secondary/50 text-3xl">📚</div><h2 className="mb-2 text-2xl font-semibold tracking-tight">No subjects yet</h2><p className="mb-8 max-w-md text-muted-foreground">Create your first subject to start organizing your lectures, exams, and tasks.</p></GlassCard> :
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">{subjects.map(subject => {
        const completedLectures = subject.lectures.filter(lecture => lecture.checked).length;
        const completedExams = subject.exams.filter(exam => exam.checked || exam.lastScore).length;
        const totalItems = subject.lectures.length + subject.exams.length;
        const progress = totalItems ? Math.round(((completedLectures + completedExams) / totalItems) * 100) : 0;
        return <SwipeableRow key={subject.id} onEdit={() => openEdit(subject.id)} onDelete={() => setDeletingId(subject.id)} className="h-full">
          <Link href={`/subjects/${subject.id}`} className="group block h-full rounded-3xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <GlassCard className="relative flex h-full min-h-56 cursor-pointer flex-col overflow-hidden border border-border/60 bg-card p-5 shadow-sm transition-all duration-200 ease-in-out group-hover:-translate-y-1 group-hover:shadow-xl group-active:scale-[.99] motion-reduce:transform-none">
              <div className="absolute inset-x-0 top-0 h-1" style={{ backgroundColor: subject.color }} />
              <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full opacity-10 blur-2xl" style={{ backgroundColor: subject.color }} />
              <div className="relative z-10 flex items-start justify-between gap-4">
                <div className="flex min-w-0 items-center gap-3"><div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border text-2xl shadow-sm" style={{ backgroundColor: `${subject.color}14`, borderColor: `${subject.color}30` }}>{subject.emoji ?? "📚"}</div><div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-[.18em] text-muted-foreground">Subject</p><h3 className="mt-1 line-clamp-2 text-xl font-bold leading-tight tracking-tight text-foreground">{subject.name}</h3></div></div>
                <div className="flex gap-1 opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100"><button onClick={event => { event.preventDefault(); event.stopPropagation(); openEdit(subject.id); }} className="flex h-8 w-8 items-center justify-center rounded-full border border-border/50 bg-background/90 text-muted-foreground shadow-sm transition-colors hover:bg-secondary hover:text-foreground"><Pencil className="h-3.5 w-3.5" /></button><button onClick={event => { event.preventDefault(); event.stopPropagation(); setDeletingId(subject.id); }} className="flex h-8 w-8 items-center justify-center rounded-full border border-border/50 bg-background/90 text-muted-foreground shadow-sm transition-colors hover:bg-destructive/10 hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button></div>
              </div>
              <div className="relative z-10 mt-auto pt-7"><div className="mb-2 flex items-center justify-between text-xs"><span className="font-semibold text-muted-foreground">Study progress</span><span className="font-bold text-foreground">{progress}%</span></div><div className="h-2 overflow-hidden rounded-full bg-secondary"><div className="h-full rounded-full transition-[width] duration-300 ease-in-out motion-reduce:transition-none" style={{ width: `${progress}%`, backgroundColor: subject.color }} /></div>
                <div className="mt-4 grid grid-cols-2 gap-2"><div className="rounded-xl border border-border/40 bg-secondary/35 px-3 py-2.5"><p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Lectures</p><p className="mt-1 text-base font-bold text-foreground">{subject.lectures.length}</p></div><div className="rounded-xl border border-border/40 bg-secondary/35 px-3 py-2.5"><p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Exams</p><p className="mt-1 text-base font-bold text-foreground">{subject.exams.length}</p></div></div>
              </div>
            </GlassCard>
          </Link>
        </SwipeableRow>;
      })}</div>}

    <FabPortal><button onClick={() => setIsAddOpen(true)} className="fixed bottom-24 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 transition-transform hover:scale-105 md:bottom-10 md:right-10"><Plus className="h-6 w-6" /></button></FabPortal>
    <BottomSheet isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} title="New Subject"><form onSubmit={handleSubmit(onSubmit)} className="space-y-6"><div><label className="mb-2 block text-sm font-medium">Subject Name</label><input {...register("name", { required: true })} className={inputCls} placeholder="e.g. Advanced Mathematics" /></div><div><label className="mb-3 block text-sm font-medium">Icon</label><EmojiPicker selected={addEmoji} onSelect={setAddEmoji} /></div><div><label className="mb-3 block text-sm font-medium">Color</label><ColorPicker selected={addColor} onSelect={setAddColor} /></div><div className="flex items-center gap-3 rounded-xl border border-border/40 bg-secondary/40 p-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl border text-xl" style={{ backgroundColor: `${addColor}18`, borderColor: `${addColor}30` }}>{addEmoji}</div><span className="font-semibold text-foreground">Preview</span></div><button type="submit" className="w-full rounded-xl bg-primary py-3.5 font-semibold text-primary-foreground transition-opacity hover:opacity-90">Create Subject</button></form></BottomSheet>
    <BottomSheet isOpen={!!editingId} onClose={() => setEditingId(null)} title="Edit Subject"><form onSubmit={handleEditSubmit(onEditSubmit)} className="space-y-6"><div><label className="mb-2 block text-sm font-medium">Subject Name</label><input {...regEdit("name", { required: true })} className={inputCls} /></div><div><label className="mb-3 block text-sm font-medium">Icon</label><EmojiPicker selected={editEmoji} onSelect={setEditEmoji} /></div><div><label className="mb-3 block text-sm font-medium">Color</label><ColorPicker selected={editColor} onSelect={setEditColor} /></div><div className="flex items-center gap-3 rounded-xl border border-border/40 bg-secondary/40 p-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl border text-xl" style={{ backgroundColor: `${editColor}18`, borderColor: `${editColor}30` }}>{editEmoji}</div><span className="font-semibold text-foreground">Preview</span></div><button type="submit" className="w-full rounded-xl bg-primary py-3.5 font-semibold text-primary-foreground transition-opacity hover:opacity-90">Save Changes</button></form></BottomSheet>
    <ConfirmSheet isOpen={!!deletingId} onClose={() => setDeletingId(null)} onConfirm={() => { if (deletingId) { deleteSubject(deletingId); setDeletingId(null); } }} title="Delete subject?" message="This will move the subject, along with its lectures, exams, and linked tasks, to the Archive. You can restore it later from Settings." confirmLabel="Move to Archive" />
  </div>;
}
