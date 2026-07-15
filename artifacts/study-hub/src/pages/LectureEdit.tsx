import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { Link, useRoute, useLocation } from "wouter";
import { ArrowLeft, Trash2, Layers, Brain, Settings as SettingsIcon, Upload, ChevronLeft, ChevronRight } from "lucide-react";
import { useStudyData, StudyType } from "@/hooks/useStudyData";
import { GlassCard } from "@/components/shared/GlassCard";
import { BottomSheet } from "@/components/shared/BottomSheet";
import { ConfirmSheet } from "@/components/shared/ConfirmSheet";
import { LectureCoverBadge } from "@/components/study/LectureCoverBadge";

/**
 * Dedicated lecture edit page. Clicking a lecture row on the Pages
 * sub-page opens this page — editing fields and deleting the lecture
 * both live here now (spec 1.3), instead of an inline edit sheet + a
 * swipe-to-delete gesture.
 */
export function LectureEdit() {
  const [, params] = useRoute("/subjects/:subjectId/lectures/:lectureId");
  const [, setLocation] = useLocation();
  const { subjects, updateLecture, deleteLecture } = useStudyData();

  const subject = subjects.find(s => s.id === params?.subjectId);
  const lecture = subject?.lectures.find(l => l.id === params?.lectureId);

  const [isDeleting, setIsDeleting] = useState(false);
  const [flashcardsOpen, setFlashcardsOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm({
    defaultValues: { name: lecture?.name || "", link: lecture?.link || "" },
  });

  if (!subject || !lecture) {
    return <div className="p-8 text-center text-muted-foreground">Lecture not found</div>;
  }

  // No per-subject color theming anymore
  const inputCls =
    "w-full bg-background border border-border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground";

  const onSave = (data: any) => {
    updateLecture(subject.id, lecture.id, { name: data.name, link: data.link });
  };

  const setType = (type: StudyType) => {
    updateLecture(subject.id, lecture.id, { type });
  };

  const handleDelete = () => {
    deleteLecture(subject.id, lecture.id);
    setLocation(`/subjects/${subject.id}`);
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center gap-3">
        <Link
          href={`/subjects/${subject.id}?tab=lectures`}
          className="p-2 rounded-full bg-secondary hover:bg-secondary/80 transition-colors shrink-0"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold tracking-tight truncate text-primary">
            {lecture.name}
          </h1>
          <p className="text-sm text-muted-foreground">Edit lecture</p>
        </div>
        <LectureCoverBadge percentage={lecture.readerLastPercentage} />
      </div>

      {/* Navigation strip — swipe hint for mobile, arrows for desktop */}
      <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground font-medium select-none">
        <ChevronLeft className="w-3.5 h-3.5 opacity-50" />
        <span className="opacity-60">Flashcards</span>
        <span className="mx-1.5 opacity-30">·</span>
        <span className="font-bold text-foreground px-1.5 py-0.5 rounded-md bg-secondary/60 border border-border/50 text-xs">Lecture</span>
        <span className="mx-1.5 opacity-30">·</span>
        <span className="opacity-60">File Reader</span>
        <ChevronRight className="w-3.5 h-3.5 opacity-50" />
      </div>

      <div className="flex gap-3">
        <button
          onClick={() => setFlashcardsOpen(true)}
          className="flex-1 flex items-center justify-center gap-2 rounded-2xl py-3.5 font-semibold text-primary-foreground bg-primary hover:bg-primary/90 transition-colors"
        >
          <Layers className="w-4 h-4" /> Flashcards
        </button>
        <button
          onClick={() => setLocation(`/subjects/${subject.id}/lectures/${lecture.id}/study`)}
          className="flex-1 flex items-center justify-center gap-2 rounded-2xl py-3.5 font-semibold bg-secondary hover:bg-secondary/80 transition-colors"
        >
          <Brain className="w-4 h-4" /> Study (Reader)
        </button>
      </div>

      <GlassCard className="p-5 space-y-5">
        <form onSubmit={form.handleSubmit(onSave)} onBlur={form.handleSubmit(onSave)} className="space-y-5">
          <div>
            <label className="block text-sm font-medium mb-2">Lecture Name</label>
            <input {...form.register("name", { required: true })} className={inputCls} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">
              Lecture File Link <span className="text-muted-foreground font-normal">(optional URL)</span>
            </label>
            <input {...form.register("link")} className={inputCls} placeholder="https://..." />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Upload Lecture File</label>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-border rounded-2xl p-4 text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-all font-medium"
            >
              <Upload className="w-4 h-4" /> Upload File (PDF, DOCX, PPTX, image…)
            </button>
            <input ref={fileInputRef} type="file" accept="*/*" className="hidden" onChange={() => {}} />
            <p className="text-xs text-muted-foreground mt-2">File storage via Google Drive — connect in Settings.</p>
          </div>
          <button
            type="submit"
            className="w-full text-primary-foreground bg-primary font-semibold rounded-xl py-3 transition-opacity hover:opacity-90"
          >
            Save Changes
          </button>
        </form>
      </GlassCard>

      {/* Settings — type toggle */}
      <GlassCard className="p-5 space-y-3">
        <div className="flex items-center gap-2 mb-2">
          <SettingsIcon className="w-4 h-4 text-muted-foreground" />
          <span className="font-semibold">Settings</span>
        </div>
        <label className="block text-sm font-medium mb-2">Type</label>
        <div className="bg-secondary/50 p-1 rounded-xl flex gap-1">
          {(["theoretical", "practical"] as StudyType[]).map(t => (
            <button
              key={t}
              onClick={() => setType(t)}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold capitalize transition-all ${
                lecture.type === t ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
              
            >
              {t}
            </button>
          ))}
        </div>
      </GlassCard>

      <button
        onClick={() => setIsDeleting(true)}
        className="w-full flex items-center justify-center gap-2 rounded-2xl py-3.5 font-semibold text-destructive bg-destructive/10 hover:bg-destructive/20 transition-colors"
      >
        <Trash2 className="w-4 h-4" /> Delete Lecture
      </button>

      {/* Flashcards panel — opened by Flashcards button */}
      <BottomSheet isOpen={flashcardsOpen} onClose={() => setFlashcardsOpen(false)} title="Flashcards">
        <div className="space-y-3 pb-2">
          <button
            onClick={() => { setLocation(`/subjects/${subject.id}/lectures/${lecture.id}/flashcards`); setFlashcardsOpen(false); }}
            className="w-full flex items-center gap-3 rounded-2xl p-4 bg-secondary/60 hover:bg-secondary transition-colors text-left"
          >
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20 shrink-0">
              <Layers className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-semibold text-foreground">Make Flashcards</p>
              <p className="text-xs text-muted-foreground">Create front / back cards manually</p>
            </div>
          </button>
          <button
            onClick={() => { setLocation(`/subjects/${subject.id}/lectures/${lecture.id}/study`); setFlashcardsOpen(false); }}
            className="w-full flex items-center gap-3 rounded-2xl p-4 bg-secondary/60 hover:bg-secondary transition-colors text-left"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 shrink-0">
              <Brain className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="font-semibold text-foreground">Study Flashcards</p>
              <p className="text-xs text-muted-foreground">Flip-card review mode</p>
            </div>
          </button>
          <button
            onClick={() => { setLocation(`/subjects/${subject.id}/lectures/${lecture.id}/flashcards`); setFlashcardsOpen(false); }}
            className="w-full flex items-center gap-3 rounded-2xl p-4 bg-secondary/60 hover:bg-secondary transition-colors text-left"
          >
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20 shrink-0">
              <Upload className="w-5 h-5 text-indigo-500" />
            </div>
            <div>
              <p className="font-semibold text-foreground">Upload Flashcards</p>
              <p className="text-xs text-muted-foreground">Bulk-import from Excel / CSV (Col A = front, Col B = back)</p>
            </div>
          </button>
        </div>
      </BottomSheet>

      <ConfirmSheet
        isOpen={isDeleting}
        onClose={() => setIsDeleting(false)}
        onConfirm={handleDelete}
        title="Delete lecture?"
        message="This lecture and its flashcards will be permanently removed."
      />
    </div>
  );
}
