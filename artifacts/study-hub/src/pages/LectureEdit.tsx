import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useRoute, useLocation } from "wouter";
import { ArrowLeft, Trash2, Layers, Brain, Settings as SettingsIcon } from "lucide-react";
import { useStudyData, StudyType } from "@/hooks/useStudyData";
import { GlassCard } from "@/components/shared/GlassCard";
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

      <div className="flex gap-3">
        <button
          onClick={() => setLocation(`/subjects/${subject.id}/lectures/${lecture.id}/flashcards`)}
          className="flex-1 flex items-center justify-center gap-2 rounded-2xl py-3.5 font-semibold text-primary-foreground bg-primary hover:bg-primary/90 transition-colors"
        >
          <Layers className="w-4 h-4" /> Flashcards Maker
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
              Link <span className="text-muted-foreground font-normal">(optional)</span>
            </label>
            <input {...form.register("link")} className={inputCls} placeholder="https://..." />
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
