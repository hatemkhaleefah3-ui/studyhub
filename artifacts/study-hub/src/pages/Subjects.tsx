import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, Reorder } from "framer-motion";
import { useStudyData, DEFAULT_SUBJECT_EMOJIS, type Subject } from "@/hooks/useStudyData";
import { GlassCard } from "@/components/shared/GlassCard";
import { BottomSheet } from "@/components/shared/BottomSheet";
import { ConfirmSheet } from "@/components/shared/ConfirmSheet";
import { SwipeableRow } from "@/components/shared/SwipeableRow";
import { ArrowLeft, CheckCircle2, GripVertical, Pencil, Plus, Trash2 } from "lucide-react";
import { Link } from "wouter";
import { useForm } from "react-hook-form";

const ACCENT_COLORS = ["#007aff", "#34c759", "#ff9500", "#ff3b30", "#af52de", "#5ac8fa", "#ff2d55", "#30d158", "#ffcc00", "#32ade6"];
const inputCls = "w-full rounded-xl border border-border bg-background px-4 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50";
const toolbarMotion = { initial: { opacity: 0, y: -6, scale: .98 }, animate: { opacity: 1, y: 0, scale: 1 }, exit: { opacity: 0, y: 6, scale: .98 }, transition: { duration: .22, ease: [.4, 0, .2, 1] as const } };
const actionBarMotion = { initial: { opacity: 0, y: 24, scale: .98 }, animate: { opacity: 1, y: 0, scale: 1 }, exit: { opacity: 0, y: 24, scale: .98 }, transition: { duration: .24, ease: [.4, 0, .2, 1] as const } };
type Mode = "normal" | "manage" | "select";
type OrderedSubject = Subject & { sortOrder?: number };

function IconAction({ icon: Icon, label, onClick, active = false, destructive = false, disabled = false }: { icon: any; label: string; onClick: () => void; active?: boolean; destructive?: boolean; disabled?: boolean }) {
  const state = destructive ? "border-destructive/25 bg-destructive/10 text-destructive hover:bg-destructive/15" : active ? "border-primary/30 bg-primary/15 text-primary shadow-sm" : "border-border/60 bg-card text-muted-foreground hover:border-primary/30 hover:bg-primary/5 hover:text-primary";
  return <button type="button" aria-label={label} aria-pressed={active || undefined} disabled={disabled} onClick={onClick} className={`flex min-h-11 min-w-11 flex-1 items-center justify-center rounded-2xl border px-3 shadow-sm transition-all duration-200 ease-in-out hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 active:scale-[.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-40 motion-reduce:transform-none ${state}`}><Icon className="h-5 w-5" /></button>;
}

function EmojiPicker({ selected, onSelect }: { selected: string; onSelect: (emoji: string) => void }) {
  return <div className="flex flex-wrap gap-2">{DEFAULT_SUBJECT_EMOJIS.map(emoji => <button key={emoji} type="button" onClick={() => onSelect(emoji)} className={`flex h-10 w-10 items-center justify-center rounded-xl border text-xl transition-all ${selected === emoji ? "scale-110 border-primary bg-primary/10 shadow-sm" : "border-border/50 bg-secondary/50 hover:scale-105 hover:bg-secondary"}`}>{emoji}</button>)}</div>;
}

function ColorPicker({ selected, onSelect }: { selected: string; onSelect: (color: string) => void }) {
  return <div className="flex flex-wrap gap-2">{ACCENT_COLORS.map(color => <button key={color} type="button" onClick={() => onSelect(color)} className={`h-8 w-8 rounded-full border-2 transition-all ${selected === color ? "scale-125 border-foreground/40" : "border-transparent hover:scale-110"}`} style={{ backgroundColor: color }} />)}</div>;
}

export function Subjects() {
  const { subjects, addSubject, updateSubject, deleteSubject } = useStudyData();
  const [mode, setMode] = useState<Mode>("normal");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [reorder, setReorder] = useState(false);
  const sortedSubjects = subjects.map((subject, index) => ({ subject: subject as OrderedSubject, index })).sort((a, b) => (a.subject.sortOrder ?? a.index) - (b.subject.sortOrder ?? b.index)).map(item => item.subject);
  const [orderedSubjects, setOrderedSubjects] = useState<OrderedSubject[]>(sortedSubjects);
  const orderedRef = useRef<OrderedSubject[]>(sortedSubjects);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const { register, handleSubmit, reset } = useForm({ defaultValues: { name: "" } });
  const [addEmoji, setAddEmoji] = useState(DEFAULT_SUBJECT_EMOJIS[0]);
  const [addColor, setAddColor] = useState(ACCENT_COLORS[0]);
  const { register: regEdit, handleSubmit: handleEditSubmit, reset: resetEdit } = useForm({ defaultValues: { name: "" } });
  const [editEmoji, setEditEmoji] = useState(DEFAULT_SUBJECT_EMOJIS[0]);
  const [editColor, setEditColor] = useState(ACCENT_COLORS[0]);

  useEffect(() => {
    if (reorder) return;
    orderedRef.current = sortedSubjects;
    setOrderedSubjects(sortedSubjects);
    setSelected(new Set());
  }, [subjects, reorder]);

  const onSubmit = (data: { name: string }) => { addSubject({ name: data.name, emoji: addEmoji, color: addColor }); reset(); setAddEmoji(DEFAULT_SUBJECT_EMOJIS[0]); setAddColor(ACCENT_COLORS[0]); setIsAddOpen(false); };
  const openEdit = (id: string) => { const subject = subjects.find(item => item.id === id); if (!subject) return; resetEdit({ name: subject.name }); setEditEmoji(subject.emoji ?? DEFAULT_SUBJECT_EMOJIS[0]); setEditColor(subject.color ?? ACCENT_COLORS[0]); setEditingId(id); };
  const onEditSubmit = (data: { name: string }) => { if (!editingId) return; updateSubject(editingId, { name: data.name, emoji: editEmoji, color: editColor }); setEditingId(null); };
  const toggle = (id: string) => setSelected(current => { const next = new Set(current); next.has(id) ? next.delete(id) : next.add(id); return next; });
  const handleReorder = (next: OrderedSubject[]) => { orderedRef.current = next; setOrderedSubjects(next); };
  const commitReorder = () => orderedRef.current.forEach((subject, index) => updateSubject(subject.id, { sortOrder: index } as Partial<Subject>));
  const deleteSelected = () => { if (!selected.size) return; selected.forEach(deleteSubject); setSelected(new Set()); setMode("manage"); setReorder(false); };

  const subjectCard = (subject: OrderedSubject, interaction: "normal" | "manage" | "select" | "drag" = "normal") => {
    const completedLectures = subject.lectures.filter(lecture => lecture.checked).length;
    const completedExams = subject.exams.filter(exam => exam.checked || exam.lastScore).length;
    const totalItems = subject.lectures.length + subject.exams.length;
    const progress = totalItems ? Math.round(((completedLectures + completedExams) / totalItems) * 100) : 0;
    const isSelected = selected.has(subject.id);
    const card = <GlassCard className={`relative flex h-full min-h-56 flex-col overflow-hidden border bg-card p-5 shadow-sm transition-all duration-200 ease-in-out ${isSelected ? "border-primary ring-2 ring-primary/30 shadow-md" : "border-border/60"}`}>
      <div className="absolute inset-x-0 top-0 h-1" style={{ backgroundColor: subject.color }} />
      <AnimatePresence>{isSelected && <motion.span initial={{ opacity: 0, scale: .6 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: .6 }} className="absolute right-3 top-3 z-20 flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm"><CheckCircle2 className="h-4 w-4" /></motion.span>}</AnimatePresence>
      <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full opacity-10 blur-2xl" style={{ backgroundColor: subject.color }} />
      <div className="relative z-10 flex items-start justify-between gap-4"><div className="flex min-w-0 items-center gap-3"><div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border text-2xl shadow-sm" style={{ backgroundColor: `${subject.color}14`, borderColor: `${subject.color}30` }}>{subject.emoji ?? "📚"}</div><div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-[.18em] text-muted-foreground">Subject</p><h3 className="mt-1 line-clamp-2 text-xl font-bold leading-tight tracking-tight text-foreground">{subject.name}</h3></div></div>{interaction === "drag" && <GripVertical className="h-6 w-6 text-primary" />}</div>
      <div className="relative z-10 mt-auto pt-7"><div className="mb-2 flex items-center justify-between text-xs"><span className="font-semibold text-muted-foreground">Study progress</span><span className="font-bold text-foreground">{progress}%</span></div><div className="h-2 overflow-hidden rounded-full bg-secondary"><div className="h-full rounded-full transition-[width] duration-300 ease-in-out motion-reduce:transition-none" style={{ width: `${progress}%`, backgroundColor: subject.color }} /></div><div className="mt-4 grid grid-cols-2 gap-2"><div className="rounded-xl border border-border/40 bg-secondary/35 px-3 py-2.5"><p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Lectures</p><p className="mt-1 text-base font-bold text-foreground">{subject.lectures.length}</p></div><div className="rounded-xl border border-border/40 bg-secondary/35 px-3 py-2.5"><p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Exams</p><p className="mt-1 text-base font-bold text-foreground">{subject.exams.length}</p></div></div></div>
    </GlassCard>;
    if (interaction === "select") return <button type="button" onClick={() => toggle(subject.id)} className="h-full w-full rounded-3xl text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{card}</button>;
    if (interaction === "manage" || interaction === "drag") return card;
    return <SwipeableRow onEdit={() => openEdit(subject.id)} onDelete={() => setDeletingId(subject.id)} className="h-full"><Link href={`/subjects/${subject.id}`} className="group block h-full rounded-3xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><div className="h-full cursor-pointer transition-all duration-200 group-hover:-translate-y-1 group-hover:shadow-xl group-active:scale-[.99] motion-reduce:transform-none">{card}</div></Link></SwipeableRow>;
  };

  return <div className="space-y-6 pb-24">
    {mode === "normal" && <header><h1 className="mb-2 text-4xl font-bold tracking-tight">Subjects</h1><p className="text-lg text-muted-foreground">Manage your courses</p></header>}
    <AnimatePresence mode="wait" initial={false}>
      {mode === "normal" && <motion.div key="normal" {...toolbarMotion} className="flex w-full gap-3"><IconAction icon={Plus} label="Add subject" onClick={() => setIsAddOpen(true)} /><IconAction icon={Pencil} label="Edit subjects" onClick={() => { setMode("manage"); setReorder(false); }} /></motion.div>}
      {mode === "manage" && <motion.div key="manage" {...toolbarMotion} className="flex items-center justify-between gap-3"><button onClick={() => { setMode("normal"); setReorder(false); }} className="flex min-h-11 items-center gap-2 rounded-2xl border border-border/60 bg-card px-4 font-semibold shadow-sm transition-all duration-200 hover:bg-secondary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><ArrowLeft className="h-4 w-4" />Back</button><div className="flex gap-2"><IconAction icon={Trash2} label="Select subjects to delete" destructive onClick={() => { setMode("select"); setReorder(false); }} /><IconAction icon={GripVertical} label="Toggle subject reordering" active={reorder} onClick={() => setReorder(current => !current)} /></div></motion.div>}
      {mode === "select" && <motion.div key="select" {...toolbarMotion} className="flex items-center justify-between"><span aria-hidden="true" /><div className="w-11"><IconAction icon={CheckCircle2} label="Select all subjects" active={sortedSubjects.length > 0 && selected.size === sortedSubjects.length} disabled={!sortedSubjects.length} onClick={() => setSelected(current => current.size === sortedSubjects.length ? new Set() : new Set(sortedSubjects.map(item => item.id)))} /></div></motion.div>}
    </AnimatePresence>

    {mode === "manage" && reorder
      ? <Reorder.Group axis="y" values={orderedSubjects} onReorder={handleReorder} layoutScroll className="-mx-1 flex max-h-[72vh] flex-col gap-4 overflow-y-auto overscroll-contain px-1 py-4">{orderedSubjects.map(subject => <Reorder.Item key={subject.id} value={subject} dragListener dragElastic={0.22} dragMomentum={false} layout="position" style={{ touchAction: "none" }} className="list-none cursor-grab select-none active:cursor-grabbing" onDragEnd={commitReorder} whileDrag={{ scale: 1.035, y: -2, boxShadow: "0 20px 44px hsl(var(--foreground) / 0.18)", zIndex: 50 }} transition={{ type: "spring", stiffness: 520, damping: 32, mass: .65 }}>{subjectCard(subject, "drag")}</Reorder.Item>)}</Reorder.Group>
      : sortedSubjects.length === 0 ? <GlassCard className="mt-12 flex flex-col items-center justify-center border-2 border-dashed bg-transparent p-12 text-center"><div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full border border-border/50 bg-secondary/50 text-3xl">📚</div><h2 className="mb-2 text-2xl font-semibold tracking-tight">No subjects yet</h2><p className="max-w-md text-muted-foreground">Create your first subject to start organizing your lectures, exams, and tasks.</p></GlassCard>
      : <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">{sortedSubjects.map(subject => <div key={subject.id}>{subjectCard(subject, mode === "select" ? "select" : mode === "manage" ? "manage" : "normal")}</div>)}</div>}

    <AnimatePresence>{mode === "select" && <motion.div {...actionBarMotion} className="fixed inset-x-4 bottom-20 z-40 mx-auto flex max-w-md gap-3 rounded-3xl border border-border/60 bg-card p-3 shadow-xl md:bottom-8"><button type="button" disabled={!selected.size} onClick={deleteSelected} className="min-h-12 flex-1 rounded-2xl bg-destructive px-4 font-semibold text-destructive-foreground transition-all duration-200 hover:opacity-90 active:scale-[.98] disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><Trash2 className="mr-2 inline h-4 w-4" />Delete</button><button type="button" onClick={() => { setMode("manage"); setSelected(new Set()); }} className="min-h-12 flex-1 rounded-2xl border border-border/60 bg-secondary px-4 font-semibold text-foreground transition-all duration-200 hover:bg-secondary/80 active:scale-[.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Cancel</button></motion.div>}</AnimatePresence>

    <BottomSheet isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} title="New Subject"><form onSubmit={handleSubmit(onSubmit)} className="space-y-6"><div><label className="mb-2 block text-sm font-medium">Subject Name</label><input {...register("name", { required: true })} className={inputCls} placeholder="e.g. Advanced Mathematics" /></div><div><label className="mb-3 block text-sm font-medium">Icon</label><EmojiPicker selected={addEmoji} onSelect={setAddEmoji} /></div><div><label className="mb-3 block text-sm font-medium">Color</label><ColorPicker selected={addColor} onSelect={setAddColor} /></div><button type="submit" className="w-full rounded-xl bg-primary py-3.5 font-semibold text-primary-foreground transition-opacity hover:opacity-90">Create Subject</button></form></BottomSheet>
    <BottomSheet isOpen={!!editingId} onClose={() => setEditingId(null)} title="Edit Subject"><form onSubmit={handleEditSubmit(onEditSubmit)} className="space-y-6"><div><label className="mb-2 block text-sm font-medium">Subject Name</label><input {...regEdit("name", { required: true })} className={inputCls} /></div><div><label className="mb-3 block text-sm font-medium">Icon</label><EmojiPicker selected={editEmoji} onSelect={setEditEmoji} /></div><div><label className="mb-3 block text-sm font-medium">Color</label><ColorPicker selected={editColor} onSelect={setEditColor} /></div><button type="submit" className="w-full rounded-xl bg-primary py-3.5 font-semibold text-primary-foreground transition-opacity hover:opacity-90">Save Changes</button></form></BottomSheet>
    <ConfirmSheet isOpen={!!deletingId} onClose={() => setDeletingId(null)} onConfirm={() => { if (deletingId) { deleteSubject(deletingId); setDeletingId(null); } }} title="Delete subject?" message="This will move the subject, along with its lectures, exams, and linked tasks, to the Archive. You can restore it later from Settings." confirmLabel="Move to Archive" />
  </div>;
}
