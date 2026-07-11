import { useState } from "react";
import { useStudyData } from "@/hooks/useStudyData";
import { GlassCard } from "@/components/shared/GlassCard";
import { BottomSheet } from "@/components/shared/BottomSheet";
import { ConfirmSheet } from "@/components/shared/ConfirmSheet";
import { Plus, Trash2, ArrowLeft, ExternalLink, BookOpen, FileText, Pencil } from "lucide-react";
import { Link, useRoute, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";

export function SubjectDetail() {
  const [, params] = useRoute("/subjects/:id");
  const [, setLocation] = useLocation();
  const {
    subjects,
    addLecture, updateLecture, deleteLecture,
    addExam, updateExam, deleteExam,
    deleteSubject,
  } = useStudyData();
  
  const subject = subjects.find(s => s.id === params?.id);
  
  const [activeTab, setActiveTab] = useState<"lectures" | "exams">("lectures");
  const [isAddLectureOpen, setIsAddLectureOpen] = useState(false);
  const [isAddExamOpen, setIsAddExamOpen] = useState(false);

  // Edit / delete state for lectures
  const [editingLecId, setEditingLecId] = useState<string | null>(null);
  const [deletingLecId, setDeletingLecId] = useState<string | null>(null);

  // Edit / delete state for exams
  const [editingExamId, setEditingExamId] = useState<string | null>(null);
  const [deletingExamId, setDeletingExamId] = useState<string | null>(null);

  const lecForm = useForm({ defaultValues: { name: "", link: "" } });
  const editLecForm = useForm({ defaultValues: { name: "", link: "" } });
  const examForm = useForm({ defaultValues: { name: "", link: "", date: "", weight: 1 } });
  const editExamForm = useForm({ defaultValues: { name: "", link: "", date: "", weight: 1 } });

  if (!subject) {
    return <div>Subject not found</div>;
  }

  const onAddLecture = (data: any) => {
    addLecture(subject.id, data);
    lecForm.reset();
    setIsAddLectureOpen(false);
  };

  const openEditLecture = (id: string) => {
    const lec = subject.lectures.find(l => l.id === id);
    if (!lec) return;
    editLecForm.reset({ name: lec.name, link: lec.link || "" });
    setEditingLecId(id);
  };

  const onEditLecture = (data: any) => {
    if (!editingLecId) return;
    updateLecture(subject.id, editingLecId, data);
    setEditingLecId(null);
  };

  const onAddExam = (data: any) => {
    addExam(subject.id, {
      name: data.name,
      link: data.link,
      date: data.date || null,
      grade: null,
      weight: parseFloat(data.weight) || 1
    });
    examForm.reset();
    setIsAddExamOpen(false);
  };

  const openEditExam = (id: string) => {
    const exam = subject.exams.find(e => e.id === id);
    if (!exam) return;
    editExamForm.reset({
      name: exam.name,
      link: exam.link || "",
      date: exam.date || "",
      weight: exam.weight ?? 1,
    });
    setEditingExamId(id);
  };

  const onEditExam = (data: any) => {
    if (!editingExamId) return;
    updateExam(subject.id, editingExamId, {
      name: data.name,
      link: data.link,
      date: data.date || null,
      weight: parseFloat(data.weight) || 1,
    });
    setEditingExamId(null);
  };

  const handleDeleteSubject = () => {
    deleteSubject(subject.id);
    setLocation("/subjects");
  };

  const inputCls = "w-full bg-background border border-border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50";

  return (
    <div className="space-y-8 pb-20">
      <div className="flex items-center gap-4">
        <Link href="/subjects" className="p-2 rounded-full bg-secondary hover:bg-secondary/80 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight" style={{ color: subject.color }}>{subject.name}</h1>
        </div>
        <button onClick={handleDeleteSubject} className="p-2 rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors">
          <Trash2 className="w-5 h-5" />
        </button>
      </div>

      <div className="flex justify-center mb-8">
        <div className="bg-secondary/50 p-1.5 rounded-2xl flex gap-2 w-max">
          <button
            onClick={() => setActiveTab("lectures")}
            className={`px-6 py-2.5 rounded-xl font-semibold flex items-center gap-2 transition-all ${activeTab === 'lectures' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
          >
            <BookOpen className="w-4 h-4" /> Lectures
          </button>
          <button
            onClick={() => setActiveTab("exams")}
            className={`px-6 py-2.5 rounded-xl font-semibold flex items-center gap-2 transition-all ${activeTab === 'exams' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
          >
            <FileText className="w-4 h-4" /> Exams
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === "lectures" && (
            <div className="space-y-4">
              {subject.lectures.length === 0 ? (
                <GlassCard className="p-8 text-center text-muted-foreground">
                  No lectures added yet.
                </GlassCard>
              ) : (
                subject.lectures.map(lec => (
                  <GlassCard key={lec.id} className="p-4 flex items-center justify-between group">
                    <div className="flex-1">
                      <h3 className="font-semibold">{lec.name}</h3>
                      {lec.link && (
                        <a href={lec.link} target="_blank" rel="noreferrer" className="text-sm text-primary hover:underline flex items-center gap-1 mt-1">
                          <ExternalLink className="w-3 h-3" /> Open Material
                        </a>
                      )}
                    </div>
                    {/* Edit + Delete — hover-only */}
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => openEditLecture(lec.id)}
                        className="p-2 text-muted-foreground hover:bg-secondary hover:text-foreground rounded-full transition-all"
                        title="Edit lecture"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => setDeletingLecId(lec.id)}
                        className="p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive rounded-full transition-all"
                        title="Delete lecture"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </GlassCard>
                ))
              )}
              
              <button 
                onClick={() => setIsAddLectureOpen(true)}
                className="w-full py-4 rounded-3xl border-2 border-dashed border-border text-muted-foreground hover:bg-secondary/50 hover:text-foreground transition-colors font-semibold flex items-center justify-center gap-2 mt-6"
              >
                <Plus className="w-5 h-5" /> Add Lecture
              </button>
            </div>
          )}

          {activeTab === "exams" && (
            <div className="space-y-4">
              {subject.exams.length === 0 ? (
                <GlassCard className="p-8 text-center text-muted-foreground">
                  No exams added yet.
                </GlassCard>
              ) : (
                subject.exams.map(exam => (
                  <GlassCard key={exam.id} className="p-5 flex flex-col sm:flex-row gap-4 sm:items-center justify-between group">
                    <div className="flex-1">
                      <h3 className="font-bold text-lg">{exam.name}</h3>
                      <div className="flex gap-4 mt-2 text-sm text-muted-foreground">
                        {exam.date && <span>{format(new Date(exam.date), "MMM d, yyyy")}</span>}
                        {exam.link && (
                          <a href={exam.link} target="_blank" rel="noreferrer" className="text-primary hover:underline flex items-center gap-1">
                            <ExternalLink className="w-3 h-3" /> Info
                          </a>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <div className="bg-secondary/50 px-4 py-2 rounded-xl flex items-center gap-3 border border-border/50">
                        <span className="text-sm font-semibold uppercase text-muted-foreground">Grade:</span>
                        <input
                          type="text"
                          value={exam.grade || ""}
                          onChange={(e) => updateExam(subject.id, exam.id, { grade: e.target.value })}
                          placeholder="—"
                          className="w-16 bg-transparent font-bold text-xl text-center focus:outline-none border-b border-dashed border-muted-foreground focus:border-primary"
                        />
                      </div>
                      {/* Edit + Delete */}
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity sm:flex hidden">
                        <button
                          onClick={() => openEditExam(exam.id)}
                          className="p-2 text-muted-foreground hover:bg-secondary hover:text-foreground rounded-full transition-all"
                          title="Edit exam"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => setDeletingExamId(exam.id)}
                          className="p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive rounded-full transition-all"
                          title="Delete exam"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      {/* Always-visible on mobile */}
                      <div className="flex gap-1 sm:hidden">
                        <button onClick={() => openEditExam(exam.id)} className="p-2 text-muted-foreground hover:bg-secondary rounded-full transition-all">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={() => setDeletingExamId(exam.id)} className="p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive rounded-full transition-all">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </GlassCard>
                ))
              )}

              <button 
                onClick={() => setIsAddExamOpen(true)}
                className="w-full py-4 rounded-3xl border-2 border-dashed border-border text-muted-foreground hover:bg-secondary/50 hover:text-foreground transition-colors font-semibold flex items-center justify-center gap-2 mt-6"
              >
                <Plus className="w-5 h-5" /> Add Exam
              </button>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* ─── Add Lecture sheet ────────────────────────────────────────────── */}
      <BottomSheet isOpen={isAddLectureOpen} onClose={() => setIsAddLectureOpen(false)} title="New Lecture">
        <form onSubmit={lecForm.handleSubmit(onAddLecture)} className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2">Lecture Name</label>
            <input 
              {...lecForm.register("name", { required: true })}
              className={inputCls}
              placeholder="e.g. Chapter 1: Introduction"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Link (optional)</label>
            <input 
              {...lecForm.register("link")}
              className={inputCls}
              placeholder="https://..."
            />
          </div>
          <button type="submit" className="w-full bg-primary text-primary-foreground font-semibold rounded-xl py-3.5 mt-4">
            Add Lecture
          </button>
        </form>
      </BottomSheet>

      {/* ─── Edit Lecture sheet ───────────────────────────────────────────── */}
      <BottomSheet isOpen={!!editingLecId} onClose={() => setEditingLecId(null)} title="Edit Lecture">
        <form onSubmit={editLecForm.handleSubmit(onEditLecture)} className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2">Lecture Name</label>
            <input {...editLecForm.register("name", { required: true })} className={inputCls} autoFocus />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Link (optional)</label>
            <input {...editLecForm.register("link")} className={inputCls} placeholder="https://..." />
          </div>
          <button type="submit" className="w-full bg-primary text-primary-foreground font-semibold rounded-xl py-3.5 mt-4">
            Save Changes
          </button>
        </form>
      </BottomSheet>

      {/* ─── Add Exam sheet ───────────────────────────────────────────────── */}
      <BottomSheet isOpen={isAddExamOpen} onClose={() => setIsAddExamOpen(false)} title="New Exam">
        <form onSubmit={examForm.handleSubmit(onAddExam)} className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2">Exam Name</label>
            <input 
              {...examForm.register("name", { required: true })}
              className={inputCls}
              placeholder="e.g. Midterm 1"
              autoFocus
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Date (optional)</label>
              <input type="date" {...examForm.register("date")} className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Weight % (optional)</label>
              <input type="number" {...examForm.register("weight")} className={inputCls} placeholder="100" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Link (optional)</label>
            <input {...examForm.register("link")} className={inputCls} placeholder="https://..." />
          </div>
          <button type="submit" className="w-full bg-primary text-primary-foreground font-semibold rounded-xl py-3.5 mt-4">
            Save Exam
          </button>
        </form>
      </BottomSheet>

      {/* ─── Edit Exam sheet ──────────────────────────────────────────────── */}
      <BottomSheet isOpen={!!editingExamId} onClose={() => setEditingExamId(null)} title="Edit Exam">
        <form onSubmit={editExamForm.handleSubmit(onEditExam)} className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2">Exam Name</label>
            <input {...editExamForm.register("name", { required: true })} className={inputCls} autoFocus />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Date (optional)</label>
              <input type="date" {...editExamForm.register("date")} className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Weight %</label>
              <input type="number" {...editExamForm.register("weight")} className={inputCls} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Link (optional)</label>
            <input {...editExamForm.register("link")} className={inputCls} placeholder="https://..." />
          </div>
          <button type="submit" className="w-full bg-primary text-primary-foreground font-semibold rounded-xl py-3.5 mt-4">
            Save Changes
          </button>
        </form>
      </BottomSheet>

      {/* ─── Confirm delete lecture ───────────────────────────────────────── */}
      <ConfirmSheet
        isOpen={!!deletingLecId}
        onClose={() => setDeletingLecId(null)}
        onConfirm={() => { if (deletingLecId) { deleteLecture(subject.id, deletingLecId); setDeletingLecId(null); } }}
        title="Delete lecture?"
        message="This lecture will be permanently removed."
      />

      {/* ─── Confirm delete exam ──────────────────────────────────────────── */}
      <ConfirmSheet
        isOpen={!!deletingExamId}
        onClose={() => setDeletingExamId(null)}
        onConfirm={() => { if (deletingExamId) { deleteExam(subject.id, deletingExamId); setDeletingExamId(null); } }}
        title="Delete exam?"
        message="This exam and its grade will be permanently removed."
      />
    </div>
  );
}
