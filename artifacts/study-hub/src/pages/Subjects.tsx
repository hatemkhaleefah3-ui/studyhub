import { useState } from "react";
import { useStudyData, ACCENT_HEX, AccentColor } from "@/hooks/useStudyData";
import { GlassCard } from "@/components/shared/GlassCard";
import { BottomSheet } from "@/components/shared/BottomSheet";
import { ConfirmSheet } from "@/components/shared/ConfirmSheet";
import { Plus, ChevronRight, BookOpen, Pencil, Trash2 } from "lucide-react";
import { Link } from "wouter";
import { useForm } from "react-hook-form";

export function Subjects() {
  const { subjects, addSubject, updateSubject, deleteSubject, checklist } = useStudyData();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { register, handleSubmit, watch, setValue, reset } = useForm({
    defaultValues: { name: "", color: "#007aff" }
  });

  const { register: regEdit, handleSubmit: handleEditSubmit, watch: watchEdit, setValue: setEditValue, reset: resetEdit } = useForm({
    defaultValues: { name: "", color: "#007aff" }
  });

  const onSubmit = (data: any) => {
    addSubject(data);
    reset();
    setIsAddOpen(false);
  };

  const openEdit = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    const sub = subjects.find(s => s.id === id);
    if (!sub) return;
    resetEdit({ name: sub.name, color: sub.color });
    setEditingId(id);
  };

  const openDelete = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDeletingId(id);
  };

  const onEditSubmit = (data: any) => {
    if (!editingId) return;
    updateSubject(editingId, data);
    setEditingId(null);
  };

  const selectedColor = watch("color");
  const selectedEditColor = watchEdit("color");

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
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-6">
            <BookOpen className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-2xl font-semibold mb-2">No subjects yet</h2>
          <p className="text-muted-foreground mb-8 max-w-md mx-auto">Create your first subject to start organizing your lectures, exams, and tasks.</p>
        </GlassCard>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {subjects.map(subject => {
            const openTasks = checklist.filter(c => c.subjectId === subject.id && !c.done).length;
            const gradedExams = subject.exams.filter(e => e.grade);
            const avg = gradedExams.length ? Math.round(gradedExams.reduce((acc, curr) => acc + (parseFloat(curr.grade!) || 0), 0) / gradedExams.length) : null;

            return (
              <Link key={subject.id} href={`/subjects/${subject.id}`}>
                <GlassCard className="p-6 hover:scale-[1.02] transition-transform cursor-pointer relative overflow-hidden group h-full flex flex-col justify-between">
                  <div className="absolute top-0 left-0 w-full h-1.5" style={{ backgroundColor: subject.color }} />

                  {/* Edit / Delete — hover-only, top-right */}
                  <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                    <button
                      onClick={(e) => openEdit(e, subject.id)}
                      className="w-8 h-8 rounded-full bg-background/80 backdrop-blur flex items-center justify-center hover:bg-secondary transition-colors"
                      title="Edit subject"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => openDelete(e, subject.id)}
                      className="w-8 h-8 rounded-full bg-background/80 backdrop-blur flex items-center justify-center hover:bg-destructive/10 hover:text-destructive transition-colors"
                      title="Delete subject"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div>
                    <h3 className="text-2xl font-bold mb-4 mt-2">{subject.name}</h3>
                    <div className="flex gap-4">
                      <div className="bg-secondary/50 rounded-xl p-3 flex-1">
                        <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider mb-1">Tasks</p>
                        <p className="text-xl font-semibold">{openTasks}</p>
                      </div>
                      <div className="bg-secondary/50 rounded-xl p-3 flex-1">
                        <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider mb-1">Avg Grade</p>
                        <p className="text-xl font-semibold">{avg !== null ? `${avg}%` : '—'}</p>
                      </div>
                    </div>
                  </div>
                  <div className="mt-6 flex justify-end">
                    <div className="w-8 h-8 rounded-full bg-background flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <ChevronRight className="w-5 h-5" />
                    </div>
                  </div>
                </GlassCard>
              </Link>
            );
          })}
        </div>
      )}

      {/* FAB */}
      <button 
        onClick={() => setIsAddOpen(true)}
        className="fixed bottom-24 md:bottom-10 right-6 md:right-10 w-14 h-14 bg-primary text-primary-foreground rounded-full shadow-lg shadow-primary/30 flex items-center justify-center hover:scale-105 transition-transform z-40"
      >
        <Plus className="w-6 h-6" />
      </button>

      {/* Add Subject sheet */}
      <BottomSheet isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} title="New Subject">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2">Subject Name</label>
            <input 
              {...register("name", { required: true })}
              className="w-full bg-background border border-border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50"
              placeholder="e.g. Advanced Mathematics"
              autoFocus
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-3">Color Label</label>
            <div className="flex flex-wrap gap-4">
              {Object.entries(ACCENT_HEX).map(([name, hex]) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => setValue("color", hex)}
                  className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${selectedColor === hex ? 'ring-2 ring-offset-2 ring-foreground ring-offset-background scale-110' : 'hover:scale-105'}`}
                  style={{ backgroundColor: hex }}
                />
              ))}
            </div>
          </div>

          <div className="pt-4">
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
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-3">Color Label</label>
            <div className="flex flex-wrap gap-4">
              {Object.entries(ACCENT_HEX).map(([name, hex]) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => setEditValue("color", hex)}
                  className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${selectedEditColor === hex ? 'ring-2 ring-offset-2 ring-foreground ring-offset-background scale-110' : 'hover:scale-105'}`}
                  style={{ backgroundColor: hex }}
                />
              ))}
            </div>
          </div>

          <div className="pt-4">
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
        message="This will permanently delete the subject along with all its lectures, exams, and linked tasks."
      />
    </div>
  );
}
