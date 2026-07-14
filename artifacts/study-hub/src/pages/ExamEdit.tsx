import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { Link, useRoute, useLocation } from "wouter";
import { ArrowLeft, Trash2, Upload, CheckSquare, Square, AlertTriangle } from "lucide-react";
import { useStudyData, StudyType } from "@/hooks/useStudyData";
import { GlassCard } from "@/components/shared/GlassCard";
import { ConfirmSheet } from "@/components/shared/ConfirmSheet";
import { parseExamExcel } from "@/lib/excelImport";

/**
 * Exam settings/edit page — title, type, question source (Excel import),
 * and the same-type lecture-linking picker (spec 1.4).
 */
export function ExamEdit() {
  const [, params] = useRoute("/subjects/:subjectId/exams/:examId/edit");
  const [, setLocation] = useLocation();
  const { subjects, updateExam, deleteExam } = useStudyData();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const subject = subjects.find(s => s.id === params?.subjectId);
  const exam = subject?.exams.find(e => e.id === params?.examId);

  const [isDeleting, setIsDeleting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);

  const form = useForm({
    defaultValues: { name: exam?.name || "", date: exam?.date || "", weight: exam?.weight ?? 1 },
  });

  if (!subject || !exam) {
    return <div className="p-8 text-center text-muted-foreground">Exam not found</div>;
  }

  // No per-subject color theming anymore
  const inputCls =
    "w-full bg-background border border-border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground";

  const onSave = (data: any) => {
    updateExam(subject.id, exam.id, {
      name: data.name,
      date: data.date || null,
      weight: parseFloat(data.weight) || 1,
    });
  };

  const setType = (type: StudyType) => {
    // Changing type does not auto-unlink existing (possibly now cross-type)
    // linked lectures — see the mismatch warning below (spec 1.4).
    updateExam(subject.id, exam.id, { type });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportError(null);
    setImporting(true);
    try {
      const questions = await parseExamExcel(file);
      if (questions.length === 0) {
        setImportError("No questions found in that file — check the column format.");
      } else {
        updateExam(subject.id, exam.id, { questions });
      }
    } catch (err) {
      setImportError("Couldn't read that file. Make sure it's a valid .xlsx/.xls spreadsheet.");
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const sameTypeLectures = subject.lectures.filter(l => l.type === exam.type);
  const linkedIds = new Set(exam.linkedLectureIds || []);
  const mismatchedLinks = (exam.linkedLectureIds || [])
    .map(id => subject.lectures.find(l => l.id === id))
    .filter(l => l && l.type !== exam.type);

  const toggleLink = (lectureId: string) => {
    const next = new Set(linkedIds);
    if (next.has(lectureId)) next.delete(lectureId);
    else next.add(lectureId);
    updateExam(subject.id, exam.id, { linkedLectureIds: Array.from(next) });
  };

  const handleDelete = () => {
    deleteExam(subject.id, exam.id);
    setLocation(`/subjects/${subject.id}`);
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center gap-3">
        <Link
          href={`/subjects/${subject.id}?tab=exams`}
          className="p-2 rounded-full bg-secondary hover:bg-secondary/80 transition-colors shrink-0"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold tracking-tight truncate text-primary">
            {exam.name}
          </h1>
          <p className="text-sm text-muted-foreground">Edit exam</p>
        </div>
      </div>

      <GlassCard className="p-5 space-y-5">
        <form onSubmit={form.handleSubmit(onSave)} onBlur={form.handleSubmit(onSave)} className="space-y-5">
          <div>
            <label className="block text-sm font-medium mb-2">Exam Name</label>
            <input {...form.register("name", { required: true })} className={inputCls} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Weight %</label>
            <input type="number" min="0" max="100" {...form.register("weight")} className={inputCls} />
          </div>
          <button
            type="submit"
            className="w-full text-primary-foreground bg-primary font-semibold rounded-xl py-3 transition-opacity hover:opacity-90"
          >
            Save Changes
          </button>
        </form>
      </GlassCard>

      <GlassCard className="p-5 space-y-3">
        <label className="block text-sm font-medium mb-2">Type</label>
        <div className="bg-secondary/50 p-1 rounded-xl flex gap-1">
          {(["theoretical", "practical"] as StudyType[]).map(t => (
            <button
              key={t}
              onClick={() => setType(t)}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold capitalize transition-all ${
                exam.type === t ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
              
            >
              {t}
            </button>
          ))}
        </div>
      </GlassCard>

      <GlassCard className="p-5 space-y-4">
        <div className="flex items-center justify-between">
          <span className="font-semibold">Question Source</span>
          <span className="text-sm text-muted-foreground">{(exam.questions || []).length} questions</span>
        </div>
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={importing}
          className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-border rounded-2xl p-4 text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-all font-medium disabled:opacity-50"
        >
          <Upload className="w-4 h-4" /> {importing ? "Importing…" : "Upload Excel (.xlsx)"}
        </button>
        <input ref={fileInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFileChange} />
        {importError && <p className="text-sm text-destructive">{importError}</p>}
        <p className="text-xs text-muted-foreground">
          Columns: type (MCQ / Medical Case MCQ), question, choice 1-4, correct answer (1-4), labs, histo.
        </p>
      </GlassCard>

      <GlassCard className="p-5 space-y-3">
        <span className="font-semibold">Linked Lectures</span>
        <p className="text-xs text-muted-foreground -mt-1">
          Only {exam.type} lectures can be linked to a {exam.type} exam.
        </p>
        {mismatchedLinks.length > 0 && (
          <div className="flex items-start gap-2 bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 rounded-xl p-3 text-sm">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>Linked lecture type mismatch — some linked lectures don't match this exam's type.</span>
          </div>
        )}
        {sameTypeLectures.length === 0 ? (
          <p className="text-sm text-muted-foreground">No {exam.type} lectures yet.</p>
        ) : (
          <div className="space-y-1.5">
            {sameTypeLectures.map(lec => {
              const isLinked = linkedIds.has(lec.id);
              return (
                <button
                  key={lec.id}
                  onClick={() => toggleLink(lec.id)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-secondary/60 transition-colors text-left"
                >
                  {isLinked ? (
                    <CheckSquare className="w-4 h-4 shrink-0 text-primary" />
                  ) : (
                    <Square className="w-4 h-4 text-muted-foreground shrink-0" />
                  )}
                  <span className="text-sm truncate">{lec.name}</span>
                </button>
              );
            })}
          </div>
        )}
      </GlassCard>

      <button
        onClick={() => setIsDeleting(true)}
        className="w-full flex items-center justify-center gap-2 rounded-2xl py-3.5 font-semibold text-destructive bg-destructive/10 hover:bg-destructive/20 transition-colors"
      >
        <Trash2 className="w-4 h-4" /> Delete Exam
      </button>

      <ConfirmSheet
        isOpen={isDeleting}
        onClose={() => setIsDeleting(false)}
        onConfirm={handleDelete}
        title="Delete exam?"
        message="This exam and its results will be permanently removed."
      />
    </div>
  );
}
