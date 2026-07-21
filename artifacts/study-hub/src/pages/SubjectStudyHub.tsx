import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useLocation, useRoute, useSearch } from "wouter";
import {
  ArrowLeft, BookOpen, Brain, Check, ChevronRight, File, FileQuestion,
  Image, Layers, Link as LinkIcon, Paperclip, Pencil, Plus, Trash2, Upload,
} from "lucide-react";
import { GlassCard } from "@/components/shared/GlassCard";
import { SwipeRow } from "@/components/shared/SwipeRow";
import { BottomSheet } from "@/components/shared/BottomSheet";
import { ConfirmSheet } from "@/components/shared/ConfirmSheet";
import { useStudyData, type Attachment, type AttachmentFormat, type ExamQuestion, type StudyType } from "@/hooks/useStudyData";
import { parseExamExcel, parseFlashcardExcel, parseLectureExcel } from "@/lib/excelImport";

type Section = "progress" | "lectures" | "attachments";
type ImportRequest = null | { kind: "mcq" | "flashcards" | "final"; lectureId?: string };
const sections: { id: Section; label: string }[] = [
  { id: "progress", label: "Progress" }, { id: "lectures", label: "Lectures" }, { id: "attachments", label: "Attachments" },
];
const motionPanel = { initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -8 }, transition: { duration: 0.2, ease: [0.4, 0, 0.2, 1] as const } };
const examAccent = "hsl(276 100% 50%)";

function attachmentIcon(attachment: Attachment) {
  if (attachment.format === "Image") return Image;
  if (/^https?:\/\//.test(attachment.url)) return LinkIcon;
  return File;
}

export function SubjectStudyHub() {
  const [, nested] = useRoute("/subjects/:id/:section");
  const [, base] = useRoute("/subjects/:id");
  const [location, setLocation] = useLocation();
  const search = useSearch();
  const {
    subjects, addLecture, addExam, updateExam, addFlashcard,
    addAttachment, updateAttachment, deleteAttachment,
  } = useStudyData();
  const id = nested?.id ?? base?.id;
  const subject = subjects.find((item) => item.id === id);
  const rawSection = nested?.section as Section | undefined;
  const section: Section = sections.some((item) => item.id === rawSection) ? rawSection! : "progress";
  const requestedType = new URLSearchParams(search).get("type");
  const [lectureType, setLectureType] = useState<StudyType>(requestedType === "practical" ? "practical" : "theoretical");
  const [notice, setNotice] = useState("");
  const [importRequest, setImportRequest] = useState<ImportRequest>(null);
  const [importing, setImporting] = useState(false);
  const lectureImportRef = useRef<HTMLInputElement>(null);
  const questionImportRef = useRef<HTMLInputElement>(null);
  const flashcardImportRef = useRef<HTMLInputElement>(null);

  const [attachmentOpen, setAttachmentOpen] = useState(false);
  const [editingAttachment, setEditingAttachment] = useState<Attachment | null>(null);
  const [deletingAttachment, setDeletingAttachment] = useState<Attachment | null>(null);
  const [attachmentName, setAttachmentName] = useState("");
  const [attachmentUrl, setAttachmentUrl] = useState("");
  const [attachmentFormat, setAttachmentFormat] = useState<"Image" | "Link" | "File">("Link");

  const reviewedKey = `studyhub:reviewed-attachments:${id ?? "unknown"}`;
  const [reviewed, setReviewed] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem(reviewedKey) ?? "[]"); } catch { return []; }
  });

  useEffect(() => { if (id && location === `/subjects/${id}`) setLocation(`/subjects/${id}/progress`, { replace: true }); }, [id, location, setLocation]);
  useEffect(() => { localStorage.setItem(reviewedKey, JSON.stringify(reviewed)); }, [reviewed, reviewedKey]);

  if (!subject) return <div className="p-8 text-center text-muted-foreground">Subject not found</div>;

  const lectures = subject.lectures.filter((item) => item.type === lectureType);
  const theoretical = subject.lectures.filter((item) => item.type === "theoretical");
  const practical = subject.lectures.filter((item) => item.type === "practical");
  const attachments = subject.attachments ?? [];
  const finalExam = subject.exams.find((item) => item.type === lectureType && item.name === "Final Exam");
  const completedLectures = subject.lectures.filter((item) => item.checked).length;
  const completedExams = subject.exams.filter((item) => item.checked || item.lastScore).length;
  const reviewedCount = attachments.filter((item) => reviewed.includes(item.id)).length;
  const total = subject.lectures.length + subject.exams.length + attachments.length;
  const overall = total ? Math.round(((completedLectures + completedExams + reviewedCount) / total) * 100) : 0;

  const lectureExam = (lectureId: string) => subject.exams.find((item) => item.linkedLectureIds?.includes(lectureId));
  const changeType = (next: StudyType) => { setLectureType(next); setLocation(`/subjects/${subject.id}/lectures?type=${next}`, { replace: true }); };

  const importLectures = async (file?: File) => {
    if (!file) return;
    const { names, skipped } = await parseLectureExcel(file);
    names.forEach((name) => addLecture(subject.id, { name, link: "", type: lectureType }));
    setNotice(`Imported ${names.length} lecture${names.length === 1 ? "" : "s"}${skipped ? `; skipped ${skipped}` : ""}.`);
  };

  const handleQuestionImport = async (file?: File) => {
    if (!file || !importRequest) return;
    setImporting(true);
    try {
      const questions: ExamQuestion[] = await parseExamExcel(file);
      if (importRequest.kind === "final") {
        if (finalExam) updateExam(subject.id, finalExam.id, { questions: [...(finalExam.questions ?? []), ...questions] });
        else addExam(subject.id, { name: "Final Exam", link: "", grade: null, date: null, weight: 1, type: lectureType, linkedLectureIds: [], questions });
      } else if (importRequest.lectureId) {
        const existing = lectureExam(importRequest.lectureId);
        const lecture = subject.lectures.find((item) => item.id === importRequest.lectureId);
        if (existing) updateExam(subject.id, existing.id, { questions: [...(existing.questions ?? []), ...questions] });
        else addExam(subject.id, { name: `${lecture?.name ?? "Lecture"} MCQs`, link: "", grade: null, date: null, weight: 1, type: lecture?.type ?? lectureType, linkedLectureIds: [importRequest.lectureId], questions });
      }
      setNotice(`Imported ${questions.length} question${questions.length === 1 ? "" : "s"}.`);
      setImportRequest(null);
    } finally { setImporting(false); }
  };

  const handleFlashcardImport = async (file?: File) => {
    if (!file || !importRequest?.lectureId) return;
    setImporting(true);
    try {
      const { rows, skipped } = await parseFlashcardExcel(file);
      rows.forEach((row) => addFlashcard(subject.id, importRequest.lectureId!, row));
      setNotice(`Imported ${rows.length} flashcard${rows.length === 1 ? "" : "s"}${skipped ? `; skipped ${skipped}` : ""}.`);
      setImportRequest(null);
    } finally { setImporting(false); }
  };

  const openAttachment = (attachment: Attachment) => {
    setReviewed((current) => current.includes(attachment.id) ? current : [...current, attachment.id]);
    window.open(attachment.url, "_blank", "noopener,noreferrer");
  };
  const beginAddAttachment = () => { setEditingAttachment(null); setAttachmentName(""); setAttachmentUrl(""); setAttachmentFormat("Link"); setAttachmentOpen(true); };
  const beginEditAttachment = (attachment: Attachment) => {
    setEditingAttachment(attachment); setAttachmentName(attachment.name ?? ""); setAttachmentUrl(attachment.url);
    setAttachmentFormat(attachment.format === "Image" ? "Image" : /^https?:\/\//.test(attachment.url) ? "Link" : "File"); setAttachmentOpen(true);
  };
  const saveAttachment = () => {
    if (!attachmentName.trim() || !attachmentUrl.trim()) return;
    const payload = { name: attachmentName.trim(), url: attachmentUrl.trim(), type: "Study Sheet" as const, format: (attachmentFormat === "Image" ? "Image" : "File") as AttachmentFormat, priority: "Not Important" as const };
    if (editingAttachment) updateAttachment(subject.id, editingAttachment.id, payload); else addAttachment(subject.id, payload);
    setAttachmentOpen(false); setNotice(editingAttachment ? "Attachment updated." : "Attachment added.");
  };

  const ProgressRow = ({ label, done, count }: { label: string; done: number; count: number }) => {
    const value = count ? Math.round((done / count) * 100) : 0;
    return <div className="rounded-2xl border border-border/50 bg-secondary/30 p-4"><div className="mb-3 flex justify-between gap-3"><div><p className="font-semibold">{label}</p><p className="text-xs text-muted-foreground">{done} of {count}</p></div><span className="font-bold">{value}%</span></div><div className="h-2 overflow-hidden rounded-full bg-secondary"><motion.div initial={{ width: 0 }} animate={{ width: `${value}%` }} transition={{ duration: 0.45 }} className="h-full rounded-full bg-primary" /></div></div>;
  };

  return <div className="space-y-6 pb-24">
    <header className="flex items-center gap-3"><button onClick={() => setLocation("/subjects")} className="flex h-10 w-10 items-center justify-center rounded-full border border-border/50 bg-secondary/60"><ArrowLeft className="h-4 w-4" /></button><div className="min-w-0"><p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Subject</p><h1 className="truncate text-2xl font-bold md:text-3xl">{subject.emoji ?? "📚"} {subject.name}</h1></div></header>
    <nav className="scrollbar-hide overflow-x-auto rounded-2xl border border-border/50 bg-secondary/40 p-1.5"><div className="flex min-w-max gap-1 md:min-w-0">{sections.map((item) => <button key={item.id} onClick={() => setLocation(`/subjects/${subject.id}/${item.id}`)} className={`min-h-11 min-w-28 flex-1 rounded-xl px-4 text-sm font-semibold ${section === item.id ? "bg-card shadow-sm ring-1 ring-border/50" : "text-muted-foreground"}`}>{item.label}</button>)}</div></nav>
    {notice && <div className="rounded-xl border border-border bg-secondary/40 px-4 py-3 text-sm">{notice}</div>}

    <AnimatePresence mode="wait">
      {section === "progress" && <motion.section key="progress" {...motionPanel} className="space-y-4"><GlassCard className="p-6"><div className="grid gap-6 md:grid-cols-[auto_1fr] md:items-center"><div className="relative mx-auto flex h-36 w-36 items-center justify-center rounded-full bg-secondary/40"><svg className="h-full w-full -rotate-90" viewBox="0 0 120 120"><circle cx="60" cy="60" r="50" fill="none" stroke="currentColor" strokeWidth="9" className="text-secondary"/><motion.circle cx="60" cy="60" r="50" fill="none" stroke="currentColor" strokeWidth="9" strokeLinecap="round" className="text-primary" strokeDasharray={314.16} initial={{strokeDashoffset:314.16}} animate={{strokeDashoffset:314.16*(1-overall/100)}} transition={{duration:.55}}/></svg><div className="absolute text-center"><p className="text-3xl font-bold">{overall}%</p><p className="text-[10px] uppercase text-muted-foreground">Overall</p></div></div><div><p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Study progress</p><h2 className="mt-2 text-2xl font-bold">Keep building momentum</h2></div></div></GlassCard><div className="grid gap-3 md:grid-cols-2"><ProgressRow label="Theoretical lectures" done={theoretical.filter(x=>x.checked).length} count={theoretical.length}/><ProgressRow label="Practical lectures" done={practical.filter(x=>x.checked).length} count={practical.length}/><ProgressRow label="Exam attempts" done={completedExams} count={subject.exams.length}/><ProgressRow label="Attachments reviewed" done={reviewedCount} count={attachments.length}/></div></motion.section>}

      {section === "lectures" && <motion.section key="lectures" {...motionPanel} className="space-y-4"><div className="grid grid-cols-2 gap-1 rounded-2xl border border-border/50 bg-secondary/40 p-1.5">{(["theoretical","practical"] as StudyType[]).map((item)=><button key={item} onClick={()=>changeType(item)} className={`min-h-11 rounded-xl font-semibold capitalize ${lectureType===item?"bg-card shadow-sm ring-1 ring-border/50":"text-muted-foreground"}`}>{item}</button>)}</div>
        <FinalExamCard exam={finalExam} subjectId={subject.id} type={lectureType} onImport={() => setImportRequest({kind:"final"})}/>
        <div className="grid gap-3 md:grid-cols-2">{lectures.map((lecture,index)=>{const exam=lectureExam(lecture.id);const mcqs=exam?.questions?.length??0;const cards=lecture.flashcards?.length??0;return <SwipeRow key={lecture.id} onTap={()=>setLocation(`/subjects/${subject.id}/lectures/${lecture.id}`)} onSwipeLeft={()=>mcqs?setLocation(`/subjects/${subject.id}/exams/${exam!.id}/take`):setImportRequest({kind:"mcq",lectureId:lecture.id})} leftLabel={mcqs?"Examine MCQs":"Import MCQs"} leftIcon={Brain} leftColor="hsl(var(--primary))" onSwipeRight={()=>cards?setLocation(`/subjects/${subject.id}/lectures/${lecture.id}/study`):setImportRequest({kind:"flashcards",lectureId:lecture.id})} rightLabel={cards?"Examine Flashcards":"Import Flashcards"} rightIcon={Layers} rightColor="hsl(var(--primary))" onLongPress={lecture.link?()=>window.open(lecture.link,"_blank","noopener,noreferrer"):undefined}><GlassCard className="p-4"><div className="flex items-center gap-4"><div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-border/50 bg-secondary/60 text-xs font-bold">{String(index+1).padStart(2,"0")}</div><div className="min-w-0 flex-1"><p className="truncate font-semibold">{lecture.name}</p><p className="mt-1 text-xs text-muted-foreground">{mcqs} MCQs · {cards} flashcards</p></div><ChevronRight className="h-4 w-4 text-muted-foreground"/></div></GlassCard></SwipeRow>})}</div>
        {lectures.length===0&&<GlassCard className="border-dashed border-2 bg-transparent p-10 text-center text-muted-foreground">No {lectureType} lectures yet.</GlassCard>}
        <div className="grid grid-cols-2 gap-3"><button onClick={()=>addLecture(subject.id,{name:`New ${lectureType} lecture`,link:"",type:lectureType})} className="min-h-24 rounded-2xl border-2 border-dashed border-border"><Plus className="mx-auto mb-2"/>Add Lecture</button><button onClick={()=>lectureImportRef.current?.click()} className="min-h-24 rounded-2xl border-2 border-dashed border-border"><Upload className="mx-auto mb-2"/>Import Lectures</button></div>
      </motion.section>}

      {section === "attachments" && <motion.section key="attachments" {...motionPanel} className="space-y-4"><div className="flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Library</p><h2 className="text-xl font-bold">Subject attachments</h2></div><button onClick={beginAddAttachment} className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 font-semibold text-primary-foreground"><Plus className="h-4 w-4"/>Add Attachment</button></div>
        {attachments.length?<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{attachments.map((attachment)=>{const Icon=attachmentIcon(attachment);return <SwipeRow key={attachment.id} onTap={()=>openAttachment(attachment)} onSwipeLeft={()=>beginEditAttachment(attachment)} leftLabel="Edit" leftIcon={Pencil} leftColor="hsl(var(--primary))" onSwipeRight={()=>setDeletingAttachment(attachment)} rightLabel="Delete" rightIcon={Trash2} rightColor="hsl(var(--destructive))"><GlassCard className="p-4"><div className="flex items-start gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-xl border border-border/50 bg-secondary/60"><Icon className="h-5 w-5"/></div><div className="min-w-0 flex-1"><p className="truncate font-semibold">{attachment.name||attachment.type}</p><p className="mt-1 text-xs text-muted-foreground">{attachment.format}</p></div>{reviewed.includes(attachment.id)&&<Check className="h-4 w-4 text-primary"/>}</div></GlassCard></SwipeRow>})}</div>:<GlassCard className="border-dashed border-2 bg-transparent p-10 text-center text-muted-foreground"><Paperclip className="mx-auto mb-3"/>No attachments yet.</GlassCard>}
      </motion.section>}
    </AnimatePresence>

    <input ref={lectureImportRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={(e)=>{importLectures(e.target.files?.[0]);e.target.value=""}}/>
    <input ref={questionImportRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={(e)=>{handleQuestionImport(e.target.files?.[0]);e.target.value=""}}/>
    <input ref={flashcardImportRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={(e)=>{handleFlashcardImport(e.target.files?.[0]);e.target.value=""}}/>

    <BottomSheet isOpen={!!importRequest} onClose={()=>setImportRequest(null)} title={importRequest?.kind==="flashcards"?"Import Flashcards":"Import Questions"}><div className="space-y-4"><p className="text-sm text-muted-foreground">Choose the existing Study Hub Excel format. The file is validated and appended to the current collection.</p><button disabled={importing} onClick={()=>importRequest?.kind==="flashcards"?flashcardImportRef.current?.click():questionImportRef.current?.click()} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-4 font-semibold text-primary-foreground disabled:opacity-50"><Upload className="h-5 w-5"/>{importing?"Importing…":"Choose Excel file"}</button></div></BottomSheet>

    <BottomSheet isOpen={attachmentOpen} onClose={()=>setAttachmentOpen(false)} title={editingAttachment?"Edit Attachment":"Add Attachment"}><div className="space-y-4"><div><label className="mb-2 block text-sm font-semibold">Name</label><input value={attachmentName} onChange={(e)=>setAttachmentName(e.target.value)} className="w-full rounded-xl border border-border bg-background px-4 py-3"/></div><div><label className="mb-2 block text-sm font-semibold">Link</label><input value={attachmentUrl} onChange={(e)=>setAttachmentUrl(e.target.value)} placeholder="https://…" className="w-full rounded-xl border border-border bg-background px-4 py-3"/></div><div><label className="mb-2 block text-sm font-semibold">Type</label><div className="grid grid-cols-3 gap-2">{(["Image","Link","File"] as const).map((item)=><button key={item} onClick={()=>setAttachmentFormat(item)} className={`rounded-xl border px-3 py-3 font-semibold ${attachmentFormat===item?"border-primary bg-primary/10 text-primary":"border-border bg-secondary/40"}`}>{item}</button>)}</div></div><button onClick={saveAttachment} className="w-full rounded-xl bg-primary py-3.5 font-semibold text-primary-foreground">{editingAttachment?"Save Changes":"Add Attachment"}</button></div></BottomSheet>
    <ConfirmSheet isOpen={!!deletingAttachment} onClose={()=>setDeletingAttachment(null)} onConfirm={()=>{if(deletingAttachment){deleteAttachment(subject.id,deletingAttachment.id);setDeletingAttachment(null);setNotice("Attachment deleted.")}}} title="Delete attachment?" message="This removes the attachment card and its link from this subject." confirmLabel="Delete Attachment"/>
  </div>;
}

function FinalExamCard({ exam, subjectId, type, onImport }: { exam: any; subjectId: string; type: StudyType; onImport: () => void }) {
  const [, setLocation] = useLocation();
  const count = exam?.questions?.length ?? 0;
  return <SwipeRow onTap={()=>exam?setLocation(`/subjects/${subjectId}/exams/${exam.id}/edit`):onImport()} onSwipeRight={()=>exam?setLocation(`/subjects/${subjectId}/exams/${exam.id}/edit`):onImport()} rightLabel="Edit" rightIcon={FileQuestion} rightColor={examAccent} onSwipeLeft={()=>count&&exam?setLocation(`/subjects/${subjectId}/exams/${exam.id}/take`):onImport()} leftLabel={count?"Examine":"Import Questions"} leftIcon={BookOpen} leftColor={examAccent}><GlassCard className="overflow-hidden p-0"><div className="h-1" style={{backgroundColor:examAccent}}/><div className="p-5"><div className="flex items-center gap-4"><div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-purple-500/20 bg-purple-500/10 text-purple-500"><FileQuestion/></div><div className="min-w-0 flex-1"><p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Pinned · {type}</p><h3 className="mt-1 text-lg font-bold">Final Exam</h3><p className="mt-1 text-xs text-muted-foreground">{count} questions · {exam?.lastScore?`${exam.lastScore.percentage}% last score`:"Not taken"}</p></div><ChevronRight className="h-4 w-4 text-muted-foreground"/></div></div></GlassCard></SwipeRow>;
}
