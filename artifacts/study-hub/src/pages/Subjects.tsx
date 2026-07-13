import { useState } from "react";
import { useStudyData } from "@/hooks/useStudyData";
import { GlassCard } from "@/components/shared/GlassCard";
import { BottomSheet } from "@/components/shared/BottomSheet";
import { ConfirmSheet } from "@/components/shared/ConfirmSheet";
import { FabPortal } from "@/components/shared/FabPortal";
import { SwipeableRow } from "@/components/shared/SwipeableRow";
import { Plus, BookOpen, Pencil, Trash2 } from "lucide-react";
import { Link } from "wouter";
import { useForm } from "react-hook-form";

export function Subjects() {
  const { subjects, addSubject, updateSubject, deleteSubject } = useStudyData();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { register, handleSubmit, reset } = useForm({
    defaultValues: { name: "" }
  });

  const { register: regEdit, handleSubmit: handleEditSubmit, reset: resetEdit } = useForm({
    defaultValues: { name: "" }
  });

  const onSubmit = (data: any) => {
    addSubject({ name: data.name });
    reset();
    setIsAddOpen(false);
  };

  const openEdit = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    const sub = subjects.find(s => s.id === id);
    if (!sub) return;
    resetEdit({ name: sub.name });
    setEditingId(id);
  };

  const openDelete = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDeletingId(id);
  };

  const onEditSubmit = (data: any) => {
    if (!editingId) return;
    updateSubject(editingId, { name: data.name });
    setEditingId(null);
  };

  return (
    <div className="space-y-8 pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold tracking-tight mb-2">Subjects</h1>
          <p className="text-muted-foreground text-lg">Manage your courses</p>
        </div>
      </div>

      {subjects.length === 0 ? (
        <GlassCard className="p-12 text-center flex flex-col items-center justify-center border-dashed border-2 bg-transparent mt-12">
          <div className="w-16 h-16 bg-secondary/50 rounded-full flex items-center justify-center mb-6 border border-border/50">
            <BookOpen className="w-8 h-8 text-muted-foreground" />
          </div>
          <h2 className="text-2xl font-semibold mb-2 tracking-tight">No subjects yet</h2>
          <p className="text-muted-foreground mb-8 max-w-md mx-auto">Create your first subject to start organizing your lectures, exams, and tasks.</p>
        </GlassCard>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {subjects.map(subject => {
            const gradedExams = subject.exams.filter(e => e.grade);
            const avg = gradedExams.length ? Math.round(gradedExams.reduce((acc, curr) => acc + (parseFloat(curr.grade!) || 0), 0) / gradedExams.length) : null;

            return (
              <SwipeableRow
                key={subject.id}
                onEdit={() => { const sub = subjects.find(s => s.id === subject.id); if (sub) { resetEdit({ name: sub.name }); setEditingId(subject.id); } }}
                onDelete={() => setDeletingId(subject.id)}
                className="h-full"
              >
                <Link href={`/subjects/${subject.id}`} className="block h-full">
                  <GlassCard className="p-5 hover:-translate-y-1 transition-all duration-300 cursor-pointer relative group h-full flex flex-col bg-card/60 hover:bg-card hover:shadow-xl hover:shadow-primary/5 hover:border-primary/30 border border-border/50">
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                    
                    {/* Edit / Delete — hover-only, top-right (desktop/mouse fallback for swipe) */}
                    <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                      <button
                        onClick={(e) => openEdit(e, subject.id)}
                        className="w-8 h-8 rounded-full bg-background/90 backdrop-blur flex items-center justify-center hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors border border-border/50 shadow-sm"
                        title="Edit subject"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => openDelete(e, subject.id)}
                        className="w-8 h-8 rounded-full bg-background/90 backdrop-blur flex items-center justify-center hover:bg-destructive/10 hover:text-destructive text-muted-foreground transition-colors border border-border/50 shadow-sm"
                        title="Delete subject"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="relative z-10 flex-1 flex flex-col">
                      <div className="w-12 h-12 rounded-[16px] bg-primary/10 flex items-center justify-center mb-5 border border-primary/20 text-primary shadow-inner">
                        <BookOpen className="w-6 h-6" />
                      </div>
                      <h3 className="text-xl font-bold mb-4 text-foreground tracking-tight pr-10 leading-snug line-clamp-2">{subject.name}</h3>
                    </div>

                    <div className="relative z-10 flex gap-2 mt-2 pt-4 border-t border-border/40">
                      <div className="bg-secondary/40 border border-border/40 rounded-xl px-3 py-2.5 flex-1 flex flex-col justify-center transition-colors group-hover:bg-secondary/60">
                        <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mb-0.5">Avg Grade</p>
                        <p className="text-sm font-bold text-foreground">{avg !== null ? `${avg}%` : '—'}</p>
                      </div>
                      <div className="bg-secondary/40 border border-border/40 rounded-xl px-3 py-2.5 flex-1 flex flex-col justify-center transition-colors group-hover:bg-secondary/60">
                        <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mb-0.5">Exams</p>
                        <p className="text-sm font-bold text-foreground">{subject.exams.length}</p>
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
              className="w-full bg-background border border-border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50"
              placeholder="e.g. Advanced Mathematics"

            />
          </div>
          
          <p className="text-sm text-muted-foreground -mt-2">A color and style will be auto-assigned.</p>

          <div className="pt-2">
            <button type="submit" className="w-full bg-primary text-primary-foreground font-semibold rounded-xl py-3.5 hover:opacity-90 transition-opacity">
              Create Subject
            </button>
          </div>
        </form>
      </BottomSheet>

      {/* Edit Subject sheet */}
      <BottomSheet isOpen={!!editingId} onClose={() => setEditingId(null)} title="Edit Subject">
        <form onSubmit={handleEditSubmit(onEditSubmit)} className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2">Subject Name</label>
            <input 
              {...regEdit("name", { required: true })}
              className="w-full bg-background border border-border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50"

            />
          </div>

          <div className="pt-2">
            <button type="submit" className="w-full bg-primary text-primary-foreground font-semibold rounded-xl py-3.5 hover:opacity-90 transition-opacity">
              Save Changes
            </button>
          </div>
        </form>
      </BottomSheet>

      {/* Delete confirm */}
      <ConfirmSheet
        isOpen={!!deletingId}
        onClose={() => setDeletingId(null)}
        onConfirm={() => { if (deletingId) { deleteSubject(deletingId); setDeletingId(null); } }}
        title="Delete subject?"
        message="This will move the subject, along with its lectures, exams, and linked tasks, to the Archive. You can restore it later from Settings."
        confirmLabel="Move to Archive"
      />
    </div>
  );
}
