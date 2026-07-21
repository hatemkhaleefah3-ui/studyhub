import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useLocation, useRoute, useSearch } from "wouter";
import {
  ArrowLeft, BookOpen, Check, ChevronRight, File, FileQuestion,
  Image, Link as LinkIcon, Paperclip, Plus, Upload,
} from "lucide-react";
import { GlassCard } from "@/components/shared/GlassCard";
import { SwipeRow } from "@/components/shared/SwipeRow";
import { useStudyData, type Attachment, type Exam, type StudyType } from "@/hooks/useStudyData";
import { parseLectureExcel } from "@/lib/excelImport";

type Section = "progress" | "lectures" | "attachments";

const sectionItems: { id: Section; label: string }[] = [
  { id: "progress", label: "Progress" },
  { id: "lectures", label: "Lectures" },
  { id: "attachments", label: "Attachments" },
];

const panelMotion = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: 0.2, ease: [0.4, 0, 0.2, 1] as const },
};

function attachmentIcon(attachment: Attachment) {
  if (attachment.format === "Image") return Image;
  if (attachment.format === "File") return File;
  return LinkIcon;
}

export function SubjectStudyHub() {
  const [, nestedParams] = useRoute("/subjects/:id/:section");
  const [, baseParams] = useRoute("/subjects/:id");
  const [location, setLocation] = useLocation();
  const search = useSearch();
  const { subjects, addLecture } = useStudyData();
  const id = nestedParams?.id ?? baseParams?.id;
  const subject = subjects.find((item) => item.id === id);
  const rawSection = nestedParams?.section as Section | undefined;
  const section: Section = sectionItems.some((item) => item.id === rawSection) ? rawSection! : "progress";
  const requestedType = new URLSearchParams(search).get("type");
  const [lectureType, setLectureType] = useState<StudyType>(requestedType === "practical" ? "practical" : "theoretical");
  const lectureImportRef = useRef<HTMLInputElement>(null);
  const [notice, setNotice] = useState("");

  const reviewedKey = `studyhub:reviewed-attachments:${id ?? "unknown"}`;
  const [reviewedAttachments, setReviewedAttachments] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem(reviewedKey) ?? "[]"); } catch { return []; }
  });

  useEffect(() => {
    if (id && location === `/subjects/${id}`) setLocation(`/subjects/${id}/progress`, { replace: true });
  }, [id, location, setLocation]);

  useEffect(() => {
    localStorage.setItem(reviewedKey, JSON.stringify(reviewedAttachments));
  }, [reviewedAttachments, reviewedKey]);

  if (!subject) return <div className="p-8 text-center text-muted-foreground">Subject not found</div>;

  const lectures = subject.lectures.filter((lecture) => lecture.type === lectureType);
  const theoretical = subject.lectures.filter((lecture) => lecture.type === "theoretical");
  const practical = subject.lectures.filter((lecture) => lecture.type === "practical");
  const completedTheoretical = theoretical.filter((lecture) => lecture.checked).length;
  const completedPractical = practical.filter((lecture) => lecture.checked).length;
  const completedExams = subject.exams.filter((exam) => exam.checked || exam.lastScore).length;
  const attachments = subject.attachments ?? [];
  const reviewedCount = attachments.filter((attachment) => reviewedAttachments.includes(attachment.id)).length;
  const totalProgressItems = theoretical.length + practical.length + subject.exams.length + attachments.length;
  const completedProgressItems = completedTheoretical + completedPractical + completedExams + reviewedCount;
  const overall = totalProgressItems ? Math.round((completedProgressItems / totalProgressItems) * 100) : 0;
  const finalExam = subject.exams.find((exam) => exam.type === lectureType && exam.name === "Final Exam");

  const setSection = (next: Section) => setLocation(`/subjects/${subject.id}/${next}`);
  const setType = (next: StudyType) => {
    setLectureType(next);
    setLocation(`/subjects/${subject.id}/lectures?type=${next}`, { replace: true });
  };

  const importLectures = async (file?: File) => {
    if (!file) return;
    const { names, skipped } = await parseLectureExcel(file);
    names.forEach((name) => addLecture(subject.id, { name, link: "", type: lectureType }));
    setNotice(`Imported ${names.length} lecture${names.length === 1 ? "" : "s"}${skipped ? `; skipped ${skipped}` : ""}.`);
  };

  const openAttachment = (attachment: Attachment) => {
    setReviewedAttachments((current) => current.includes(attachment.id) ? current : [...current, attachment.id]);
    window.open(attachment.url, "_blank", "noopener,noreferrer");
  };

  const ProgressRow = ({ label, done, total }: { label: string; done: number; total: number }) => {
    const value = total ? Math.round((done / total) * 100) : 0;
    return (
      <div className="rounded-2xl border border-border/50 bg-secondary/30 p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <p className="font-semibold text-foreground">{label}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{done} of {total} completed</p>
          </div>
          <span className="text-sm font-bold text-foreground">{value}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-secondary">
          <motion.div initial={{ width: 0 }} animate={{ width: `${value}%` }} transition={{ duration: 0.45, ease: "easeInOut" }} className="h-full rounded-full bg-primary motion-reduce:transition-none" />
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 pb-24">
      <header className="flex items-center gap-3">
        <button onClick={() => setLocation("/subjects")} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border/50 bg-secondary/60 text-muted-foreground shadow-sm hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Subject</p>
          <h1 className="truncate text-2xl font-bold tracking-tight md:text-3xl">{subject.emoji ?? "📚"} {subject.name}</h1>
        </div>
      </header>

      <nav className="scrollbar-hide overflow-x-auto rounded-2xl border border-border/50 bg-secondary/40 p-1.5" aria-label="Subject sections">
        <div className="flex min-w-max gap-1 md:min-w-0">
          {sectionItems.map((item) => (
            <button key={item.id} onClick={() => setSection(item.id)} className={`min-h-11 min-w-28 flex-1 rounded-xl px-4 text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${section === item.id ? "bg-card text-foreground shadow-sm ring-1 ring-border/50" : "text-muted-foreground hover:bg-secondary/70 hover:text-foreground"}`}>
              {item.label}
            </button>
          ))}
        </div>
      </nav>

      {notice && <div className="rounded-xl border border-border bg-secondary/40 px-4 py-3 text-sm text-foreground">{notice}</div>}

      <AnimatePresence mode="wait">
        {section === "progress" && (
          <motion.section key="progress" {...panelMotion} className="space-y-4">
            <GlassCard className="overflow-hidden border-border/60 bg-card p-6 shadow-sm">
              <div className="grid gap-6 md:grid-cols-[auto_1fr] md:items-center">
                <div className="relative mx-auto flex h-36 w-36 items-center justify-center rounded-full bg-secondary/40">
                  <svg className="h-full w-full -rotate-90" viewBox="0 0 120 120" aria-label={`${overall}% complete`}>
                    <circle cx="60" cy="60" r="50" fill="none" stroke="currentColor" strokeWidth="9" className="text-secondary" />
                    <motion.circle cx="60" cy="60" r="50" fill="none" stroke="currentColor" strokeWidth="9" strokeLinecap="round" className="text-primary" strokeDasharray={314.16} initial={{ strokeDashoffset: 314.16 }} animate={{ strokeDashoffset: 314.16 * (1 - overall / 100) }} transition={{ duration: 0.55, ease: "easeInOut" }} />
                  </svg>
                  <div className="absolute text-center"><p className="text-3xl font-bold">{overall}%</p><p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Overall</p></div>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Study progress</p>
                  <h2 className="mt-2 text-2xl font-bold tracking-tight">Keep building momentum</h2>
                  <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">Progress combines completed lectures, completed exam attempts, and attachments opened from this subject.</p>
                </div>
              </div>
            </GlassCard>
            <div className="grid gap-3 md:grid-cols-2">
              <ProgressRow label="Theoretical lectures" done={completedTheoretical} total={theoretical.length} />
              <ProgressRow label="Practical lectures" done={completedPractical} total={practical.length} />
              <ProgressRow label="Exam attempts" done={completedExams} total={subject.exams.length} />
              <ProgressRow label="Attachments reviewed" done={reviewedCount} total={attachments.length} />
            </div>
          </motion.section>
        )}

        {section === "lectures" && (
          <motion.section key="lectures" {...panelMotion} className="space-y-4">
            <div className="grid grid-cols-2 gap-1 rounded-2xl border border-border/50 bg-secondary/40 p-1.5" role="tablist" aria-label="Lecture type">
              {(["theoretical", "practical"] as StudyType[]).map((item) => (
                <button key={item} role="tab" aria-selected={lectureType === item} onClick={() => setType(item)} className={`min-h-11 rounded-xl px-3 text-sm font-semibold capitalize transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${lectureType === item ? "bg-card text-foreground shadow-sm ring-1 ring-border/50" : "text-muted-foreground hover:text-foreground"}`}>{item}</button>
              ))}
            </div>

            <FinalExamCard subjectId={subject.id} exam={finalExam} type={lectureType} />

            <div className="grid gap-3 md:grid-cols-2">
              {lectures.map((lecture, index) => {
                const lectureExam = subject.exams.find((exam) => exam.linkedLectureIds?.includes(lecture.id));
                return (
                  <button key={lecture.id} onClick={() => setLocation(`/subjects/${subject.id}/lectures/${lecture.id}`)} className="group text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-2xl">
                    <GlassCard className="h-full border-border/60 bg-card p-4 shadow-sm transition-all duration-200 group-hover:-translate-y-0.5 group-hover:shadow-md motion-reduce:transform-none">
                      <div className="flex items-center gap-4">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-border/50 bg-secondary/60 text-xs font-bold text-muted-foreground">{String(index + 1).padStart(2, "0")}</div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-semibold text-foreground">{lecture.name}</p>
                          <p className="mt-1 text-xs text-muted-foreground">{lectureExam?.questions?.length ?? 0} MCQs · {lecture.flashcards?.length ?? 0} flashcards</p>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transform-none" />
                      </div>
                    </GlassCard>
                  </button>
                );
              })}
            </div>

            {lectures.length === 0 && <GlassCard className="border-dashed border-2 bg-transparent p-10 text-center text-muted-foreground">No {lectureType} lectures yet.</GlassCard>}

            <div className="grid grid-cols-2 gap-3 pt-1">
              <button onClick={() => addLecture(subject.id, { name: `New ${lectureType} lecture`, link: "", type: lectureType })} className="min-h-24 rounded-2xl border-2 border-dashed border-border bg-secondary/20 p-4 text-muted-foreground transition-all duration-200 hover:border-primary/40 hover:bg-primary/5 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><Plus className="mx-auto mb-2 h-5 w-5" /><span className="text-sm font-semibold">Add Lecture</span></button>
              <button onClick={() => lectureImportRef.current?.click()} className="min-h-24 rounded-2xl border-2 border-dashed border-border bg-secondary/20 p-4 text-muted-foreground transition-all duration-200 hover:border-primary/40 hover:bg-primary/5 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><Upload className="mx-auto mb-2 h-5 w-5" /><span className="text-sm font-semibold">Import Lectures</span></button>
            </div>
          </motion.section>
        )}

        {section === "attachments" && (
          <motion.section key="attachments" {...panelMotion} className="space-y-4">
            <div className="flex items-end justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Library</p><h2 className="mt-1 text-xl font-bold">Subject attachments</h2></div><span className="text-sm text-muted-foreground">{attachments.length} items</span></div>
            {attachments.length ? <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {attachments.map((attachment) => {
                const Icon = attachmentIcon(attachment);
                const reviewed = reviewedAttachments.includes(attachment.id);
                return <button key={attachment.id} onClick={() => openAttachment(attachment)} className="group text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-2xl">
                  <GlassCard className="h-full border-border/60 bg-card p-4 shadow-sm transition-all duration-200 group-hover:-translate-y-0.5 group-hover:shadow-md motion-reduce:transform-none">
                    <div className="flex items-start gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border/50 bg-secondary/60 text-muted-foreground"><Icon className="h-5 w-5" /></div>
                      <div className="min-w-0 flex-1"><p className="truncate font-semibold text-foreground">{attachment.name || attachment.type}</p><p className="mt-1 text-xs text-muted-foreground">{attachment.format} · {attachment.priority}</p></div>
                      {reviewed ? <Check className="h-4 w-4 text-primary" /> : <LinkIcon className="h-4 w-4 text-muted-foreground" />}
                    </div>
                  </GlassCard>
                </button>;
              })}
            </div> : <GlassCard className="border-dashed border-2 bg-transparent p-10 text-center text-muted-foreground"><Paperclip className="mx-auto mb-3 h-7 w-7 opacity-50" />No attachments yet.</GlassCard>}
          </motion.section>
        )}
      </AnimatePresence>

      <input ref={lectureImportRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={(event) => { importLectures(event.target.files?.[0]); event.target.value = ""; }} />
    </div>
  );
}

function FinalExamCard({ subjectId, exam, type }: { subjectId: string; exam?: Exam; type: StudyType }) {
  const [, setLocation] = useLocation();
  const hasQuestions = !!exam?.questions?.length;
  return (
    <SwipeRow
      onSwipeRight={exam ? () => setLocation(`/subjects/${subjectId}/exams/${exam.id}/edit`) : undefined}
      rightLabel="Edit" rightIcon={FileQuestion} rightColor="hsl(var(--primary))"
      onSwipeLeft={hasQuestions ? () => setLocation(`/subjects/${subjectId}/exams/${exam!.id}/take`) : undefined}
      leftLabel={hasQuestions ? "Examine" : "No questions"} leftIcon={BookOpen} leftColor="hsl(var(--primary))"
    >
      <GlassCard className="overflow-hidden border-primary/20 bg-card p-0 shadow-sm">
        <div className="h-1 bg-primary" />
        <div className="p-5">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary"><FileQuestion className="h-5 w-5" /></div>
            <div className="min-w-0 flex-1"><p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Pinned · {type}</p><h3 className="mt-1 text-lg font-bold">Final Exam</h3><p className="mt-1 text-xs text-muted-foreground">{exam?.questions?.length ?? 0} questions · {exam?.lastScore ? `${exam.lastScore.percentage}% last score` : "Not taken"}</p></div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </div>
        </div>
      </GlassCard>
    </SwipeRow>
  );
}