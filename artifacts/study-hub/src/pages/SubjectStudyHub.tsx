import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, Reorder } from "framer-motion";
import { useLocation, useRoute, useSearch } from "wouter";
import {
  ArrowLeft, BookOpen, Brain, Check, CheckCircle2, ChevronRight, File,
  FileQuestion, GripVertical, Image, Layers, Link as LinkIcon, Paperclip,
  Pencil, Plus, Trash2, Upload,
} from "lucide-react";
import { GlassCard } from "@/components/shared/GlassCard";
import { SwipeRow } from "@/components/shared/SwipeRow";
import { BottomSheet } from "@/components/shared/BottomSheet";
import { ConfirmSheet } from "@/components/shared/ConfirmSheet";
import {
  useStudyData, type Attachment, type AttachmentFormat, type Exam,
  type ExamQuestion, type Lecture, type StudyType,
} from "@/hooks/useStudyData";
import { parseExamExcel, parseFlashcardExcel, parseLectureExcel } from "@/lib/excelImport";
import { parseFinalExamFiles, type FinalExamImportError } from "@/lib/finalExamImport";

type Section = "progress" | "lectures" | "attachments";
type ImportRequest = null | { kind: "mcq" | "flashcards"; lectureId: string };
type ManageMode = "normal" | "manage" | "select";
type CardInteraction = "normal" | "manage" | "select" | "drag";

const sections: [Section, string][] = [["progress", "Progress"], ["lectures", "Lectures"], ["attachments", "Attachments"]];
const motionPanel = { initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -8 }, transition: { duration: .2, ease: [.4, 0, .2, 1] as const } };
const toolbarMotion = { initial: { opacity: 0, y: -6, scale: .98 }, animate: { opacity: 1, y: 0, scale: 1 }, exit: { opacity: 0, y: 6, scale: .98 }, transition: { duration: .22, ease: [.4, 0, .2, 1] as const } };
const actionBarMotion = { initial: { opacity: 0, y: 24, scale: .98 }, animate: { opacity: 1, y: 0, scale: 1 }, exit: { opacity: 0, y: 24, scale: .98 }, transition: { duration: .24, ease: [.4, 0, .2, 1] as const } };
const examAccent = "hsl(280 67% 60%)";
const fromHere = () => `${window.location.pathname}${window.location.search}`;

function IconAction({ icon: Icon, label, onClick, active = false, destructive = false, disabled = false }: { icon: any; label: string; onClick: () => void; active?: boolean; destructive?: boolean; disabled?: boolean }) {
  const state = destructive
    ? "border-destructive/25 bg-destructive/10 text-destructive hover:bg-destructive/15"
    : active
      ? "border-primary/30 bg-primary/15 text-primary shadow-sm"
      : "border-border/60 bg-card text-muted-foreground hover:border-primary/30 hover:bg-primary/5 hover:text-primary";
  return <button type="button" aria-label={label} aria-pressed={active || undefined} disabled={disabled} onClick={onClick} className={`flex min-h-11 min-w-11 flex-1 items-center justify-center rounded-2xl border px-3 shadow-sm transition-all duration-200 ease-in-out hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 active:scale-[.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-40 motion-reduce:transform-none ${state}`}><Icon className="h-5 w-5" /></button>;
}

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
    subjects, addLecture, deleteLecture, addExam, updateExam, updateSubject,
    addFlashcard, addAttachment, updateAttachment, deleteAttachment,
  } = useStudyData();
  const id = nested?.id ?? base?.id;
  const subject = subjects.find(item => item.id === id);
  const raw = nested?.section as Section | undefined;
  const section = sections.some(([item]) => item === raw) ? raw! : "progress";
  const requestedType = new URLSearchParams(search).get("type");
  const [lectureType, setLectureType] = useState<StudyType>(requestedType === "practical" ? "practical" : "theoretical");

  const [lectureMode, setLectureMode] = useState<ManageMode>("normal");
  const [selectedLectures, setSelectedLectures] = useState<Set<string>>(new Set());
  const [lectureReorder, setLectureReorder] = useState(false);
  const [orderedLectures, setOrderedLectures] = useState<Lecture[]>([]);
  const orderedLecturesRef = useRef<Lecture[]>([]);

  const [attachmentMode, setAttachmentMode] = useState<ManageMode>("normal");
  const [selectedAttachments, setSelectedAttachments] = useState<Set<string>>(new Set());
  const [attachmentReorder, setAttachmentReorder] = useState(false);
  const [orderedAttachments, setOrderedAttachments] = useState<Attachment[]>([]);
  const orderedAttachmentsRef = useRef<Attachment[]>([]);

  const [notice, setNotice] = useState("");
  const [importRequest, setImportRequest] = useState<ImportRequest>(null);
  const [finalImportOpen, setFinalImportOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importErrors, setImportErrors] = useState<FinalExamImportError[]>([]);
  const lectureImportRef = useRef<HTMLInputElement>(null);
  const questionImportRef = useRef<HTMLInputElement>(null);
  const flashcardImportRef = useRef<HTMLInputElement>(null);
  const finalImportRef = useRef<HTMLInputElement>(null);
  const [attachmentOpen, setAttachmentOpen] = useState(false);
  const [editingAttachment, setEditingAttachment] = useState<Attachment | null>(null);
  const [deletingAttachment, setDeletingAttachment] = useState<Attachment | null>(null);
  const [attachmentName, setAttachmentName] = useState("");
  const [attachmentUrl, setAttachmentUrl] = useState("");
  const [attachmentFormat, setAttachmentFormat] = useState<"Image" | "Link" | "File">("Link");
  const reviewedKey = `studyhub:reviewed-attachments:${id ?? "unknown"}`;
  const [reviewed, setReviewed] = useState<string[]>(() => { try { return JSON.parse(localStorage.getItem(reviewedKey) ?? "[]"); } catch { return []; } });

  const lectures = subject?.lectures.filter(item => item.type === lectureType) ?? [];
  const attachments = subject?.attachments ?? [];

  useEffect(() => { if (id && location === `/subjects/${id}`) setLocation(`/subjects/${id}/progress`, { replace: true }); }, [id, location, setLocation]);
  useEffect(() => localStorage.setItem(reviewedKey, JSON.stringify(reviewed)), [reviewed, reviewedKey]);
  useEffect(() => {
    if (lectureReorder) return;
    orderedLecturesRef.current = lectures;
    setOrderedLectures(lectures);
    setSelectedLectures(new Set());
  }, [lectureType, subject?.lectures, lectureReorder]);
  useEffect(() => {
    if (attachmentReorder) return;
    orderedAttachmentsRef.current = attachments;
    setOrderedAttachments(attachments);
    setSelectedAttachments(new Set());
  }, [subject?.attachments, attachmentReorder]);

  if (!subject) return <div className="p-8 text-center text-muted-foreground">Subject not found</div>;

  const theoretical = subject.lectures.filter(item => item.type === "theoretical");
  const practical = subject.lectures.filter(item => item.type === "practical");
  const finalExam = subject.exams.find(item => item.type === lectureType && item.name === "Final Exam");
  const finalFlashcardKey = `studyhub:final-flashcards:${subject.id}:${lectureType}`;
  const finalFlashcards = JSON.parse(localStorage.getItem(finalFlashcardKey) ?? "[]");
  const completedLectures = subject.lectures.filter(item => item.checked).length;
  const completedExams = subject.exams.filter(item => item.checked || item.lastScore).length;
  const reviewedCount = attachments.filter(item => reviewed.includes(item.id)).length;
  const total = subject.lectures.length + subject.exams.length + attachments.length;
  const overall = total ? Math.round((completedLectures + completedExams + reviewedCount) / total * 100) : 0;

  const lectureExam = (lectureId: string) => subject.exams.find(item => item.linkedLectureIds?.includes(lectureId));
  const changeType = (next: StudyType) => { setLectureType(next); setLectureMode("normal"); setLocation(`/subjects/${subject.id}/lectures?type=${next}`, { replace: true }); };
  const importLectures = async (file?: File) => { if (!file) return; const { names, skipped } = await parseLectureExcel(file); names.forEach(name => addLecture(subject.id, { name, link: "", type: lectureType })); setNotice(`Imported ${names.length} lecture${names.length === 1 ? "" : "s"}${skipped ? `; skipped ${skipped}` : ""}.`); };
  const ensureFinalExam = (): Exam => { if (finalExam) return finalExam; const created: Exam = { id: crypto.randomUUID(), name: "Final Exam", link: "", grade: null, date: null, weight: 1, type: lectureType, linkedLectureIds: [], questions: [], lastScore: null, checked: false }; updateSubject(subject.id, { exams: [...subject.exams, created] }); return created; };
  const openFinalEdit = () => { const exam = ensureFinalExam(); setLocation(`/subjects/${subject.id}/exams/${exam.id}/edit?from=${encodeURIComponent(fromHere())}`); };
  const importFinalFiles = async (files: File[]) => { if (!files.length) return; setFinalImportOpen(false); setImporting(true); setImportErrors([]); try { const parsed = await parseFinalExamFiles(files); const exam = ensureFinalExam(); if (parsed.questions.length) updateExam(subject.id, exam.id, { questions: [...(exam.questions ?? []), ...parsed.questions] }); if (parsed.flashcards.length) localStorage.setItem(finalFlashcardKey, JSON.stringify([...finalFlashcards, ...parsed.flashcards])); setImportErrors(parsed.errors); const added = parsed.questions.length + parsed.flashcards.length; if (added) setNotice(`Imported ${parsed.questions.length} question${parsed.questions.length === 1 ? "" : "s"} and ${parsed.flashcards.length} flashcard${parsed.flashcards.length === 1 ? "" : "s"}.`); } finally { setImporting(false); } };
  const handleQuestionImport = async (file?: File) => { if (!file || !importRequest) return; setImporting(true); try { const questions: ExamQuestion[] = await parseExamExcel(file); const existing = lectureExam(importRequest.lectureId); const lecture = subject.lectures.find(item => item.id === importRequest.lectureId); if (existing) updateExam(subject.id, existing.id, { questions: [...(existing.questions ?? []), ...questions] }); else addExam(subject.id, { name: `${lecture?.name ?? "Lecture"} MCQs`, link: "", grade: null, date: null, weight: 1, type: lecture?.type ?? lectureType, linkedLectureIds: [importRequest.lectureId], questions }); setNotice(`Imported ${questions.length} questions.`); setImportRequest(null); } finally { setImporting(false); } };
  const handleFlashcardImport = async (file?: File) => { if (!file || !importRequest) return; setImporting(true); try { const { rows, skipped } = await parseFlashcardExcel(file); rows.forEach(row => addFlashcard(subject.id, importRequest.lectureId, row)); setNotice(`Imported ${rows.length} flashcards${skipped ? `; skipped ${skipped}` : ""}.`); setImportRequest(null); } finally { setImporting(false); } };

  const handleLectureReorder = (next: Lecture[]) => { orderedLecturesRef.current = next; setOrderedLectures(next); };
  const commitLectureReorder = () => { const next = orderedLecturesRef.current; let index = 0; updateSubject(subject.id, { lectures: subject.lectures.map(item => item.type === lectureType ? next[index++] : item) }); };
  const deleteSelectedLectures = () => { if (!selectedLectures.size) return; selectedLectures.forEach(lectureId => deleteLecture(subject.id, lectureId)); setSelectedLectures(new Set()); setLectureMode("manage"); setLectureReorder(false); setNotice("Selected lectures deleted."); };
  const toggleLecture = (lectureId: string) => setSelectedLectures(current => { const next = new Set(current); next.has(lectureId) ? next.delete(lectureId) : next.add(lectureId); return next; });

  const openAttachment = (attachment: Attachment) => { setReviewed(current => current.includes(attachment.id) ? current : [...current, attachment.id]); window.open(attachment.url, "_blank", "noopener,noreferrer"); };
  const beginAddAttachment = () => { setEditingAttachment(null); setAttachmentName(""); setAttachmentUrl(""); setAttachmentFormat("Link"); setAttachmentOpen(true); };
  const beginEditAttachment = (attachment: Attachment) => { setEditingAttachment(attachment); setAttachmentName(attachment.name ?? ""); setAttachmentUrl(attachment.url); setAttachmentFormat(attachment.format === "Image" ? "Image" : /^https?:\/\//.test(attachment.url) ? "Link" : "File"); setAttachmentOpen(true); };
  const saveAttachment = () => { if (!attachmentName.trim() || !attachmentUrl.trim()) return; const payload = { name: attachmentName.trim(), url: attachmentUrl.trim(), type: "Study Sheet" as const, format: (attachmentFormat === "Image" ? "Image" : "File") as AttachmentFormat, priority: "Not Important" as const }; editingAttachment ? updateAttachment(subject.id, editingAttachment.id, payload) : addAttachment(subject.id, payload); setAttachmentOpen(false); setNotice(editingAttachment ? "Attachment updated." : "Attachment added."); };
  const handleAttachmentReorder = (next: Attachment[]) => { orderedAttachmentsRef.current = next; setOrderedAttachments(next); };
  const commitAttachmentReorder = () => updateSubject(subject.id, { attachments: orderedAttachmentsRef.current });
  const toggleAttachment = (attachmentId: string) => setSelectedAttachments(current => { const next = new Set(current); next.has(attachmentId) ? next.delete(attachmentId) : next.add(attachmentId); return next; });
  const deleteSelectedAttachments = () => { if (!selectedAttachments.size) return; selectedAttachments.forEach(attachmentId => deleteAttachment(subject.id, attachmentId)); setSelectedAttachments(new Set()); setAttachmentMode("manage"); setAttachmentReorder(false); setNotice("Selected attachments deleted."); };

  const ProgressRow = ({ label, done, count }: { label: string; done: number; count: number }) => { const value = count ? Math.round(done / count * 100) : 0; return <div className="rounded-2xl border border-border/50 bg-secondary/30 p-4"><div className="mb-3 flex justify-between"><div><p className="font-semibold">{label}</p><p className="text-xs text-muted-foreground">{done} of {count}</p></div><b>{value}%</b></div><div className="h-2 overflow-hidden rounded-full bg-secondary"><motion.div initial={{ width: 0 }} animate={{ width: `${value}%` }} className="h-full rounded-full bg-primary" /></div></div>; };

  const renderLectureCard = (lecture: Lecture, index: number, interaction: CardInteraction = "normal") => {
    const exam = lectureExam(lecture.id), mcqs = exam?.questions?.length ?? 0, cards = lecture.flashcards?.length ?? 0, selected = selectedLectures.has(lecture.id), compact = interaction === "drag";
    const content = <GlassCard className={`relative bg-card ${compact ? "p-3" : "p-4"} transition-all duration-200 ${selected ? "border-primary ring-2 ring-primary/30 shadow-md" : "border-border/50"}`}><AnimatePresence>{selected && <motion.span initial={{ opacity: 0, scale: .6 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: .6 }} className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm"><CheckCircle2 className="h-4 w-4" /></motion.span>}</AnimatePresence><div className="flex items-center gap-4"><div className={`flex ${compact ? "h-10 w-10" : "h-12 w-12"} items-center justify-center rounded-2xl border border-border/50 bg-secondary/60 text-xs font-bold`}>{String(index + 1).padStart(2, "0")}</div><div className="min-w-0 flex-1 pr-7"><p className="truncate font-semibold">{lecture.name}</p><p className="mt-1 text-xs text-muted-foreground">{mcqs} MCQs · {cards} flashcards</p></div>{interaction === "drag" ? <GripVertical className="h-6 w-6 text-primary" /> : interaction === "normal" ? <ChevronRight className="h-4 w-4 text-muted-foreground" /> : null}</div></GlassCard>;
    if (interaction === "select") return <button type="button" onClick={() => toggleLecture(lecture.id)} className="w-full rounded-3xl text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{content}</button>;
    if (interaction === "manage" || interaction === "drag") return content;
    const from = encodeURIComponent(fromHere());
    return <SwipeRow onTap={() => setLocation(`/subjects/${subject.id}/lectures/${lecture.id}?from=${from}`)} onSwipeLeft={() => mcqs ? setLocation(`/subjects/${subject.id}/exams/${exam!.id}/take?from=${from}`) : setImportRequest({ kind: "mcq", lectureId: lecture.id })} leftLabel={mcqs ? "Examine MCQs" : "Import MCQs"} leftIcon={Brain} leftColor="hsl(var(--primary))" onSwipeRight={() => cards ? setLocation(`/subjects/${subject.id}/lectures/${lecture.id}/study?from=${from}`) : setImportRequest({ kind: "flashcards", lectureId: lecture.id })} rightLabel={cards ? "Examine Flashcards" : "Import Flashcards"} rightIcon={Layers} rightColor="hsl(var(--primary))">{content}</SwipeRow>;
  };

  const renderAttachmentCard = (attachment: Attachment, interaction: CardInteraction = "normal") => {
    const Icon = attachmentIcon(attachment), selected = selectedAttachments.has(attachment.id), compact = interaction === "drag";
    const content = <GlassCard className={`relative bg-card ${compact ? "p-3" : "p-4"} transition-all duration-200 ${selected ? "border-primary ring-2 ring-primary/30 shadow-md" : "border-border/50"}`}><AnimatePresence>{selected && <motion.span initial={{ opacity: 0, scale: .6 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: .6 }} className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm"><CheckCircle2 className="h-4 w-4" /></motion.span>}</AnimatePresence><div className="flex items-start gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-xl border border-border/50 bg-secondary/60"><Icon className="h-5 w-5" /></div><div className="min-w-0 flex-1 pr-7"><p className="truncate font-semibold">{attachment.name || attachment.type}</p><p className="mt-1 text-xs text-muted-foreground">{attachment.format}</p></div>{interaction === "drag" ? <GripVertical className="h-6 w-6 text-primary" /> : reviewed.includes(attachment.id) && interaction === "normal" ? <Check className="h-4 w-4 text-primary" /> : null}</div></GlassCard>;
    if (interaction === "select") return <button type="button" onClick={() => toggleAttachment(attachment.id)} className="w-full rounded-3xl text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{content}</button>;
    if (interaction === "manage" || interaction === "drag") return content;
    return <SwipeRow onTap={() => openAttachment(attachment)} onSwipeLeft={() => beginEditAttachment(attachment)} leftLabel="Edit" leftIcon={Pencil} leftColor="hsl(var(--primary))" onSwipeRight={() => setDeletingAttachment(attachment)} rightLabel="Delete" rightIcon={Trash2} rightColor="hsl(var(--destructive))">{content}</SwipeRow>;
  };

  const activeSelect = section === "lectures" ? lectureMode === "select" : section === "attachments" && attachmentMode === "select";
  const hidePageChrome = (section === "lectures" && lectureMode !== "normal") || (section === "attachments" && attachmentMode !== "normal");

  return <div className="space-y-6 pb-24">
    <AnimatePresence initial={false}>{!hidePageChrome && <motion.div key="page-chrome" {...toolbarMotion} className="space-y-6"><header className="flex items-center gap-3"><button onClick={() => setLocation("/subjects")} className="flex h-10 w-10 items-center justify-center rounded-full border border-border/50 bg-secondary/60"><ArrowLeft className="h-4 w-4" /></button><div><p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Subject</p><h1 className="text-2xl font-bold md:text-3xl">{subject.emoji ?? "📚"} {subject.name}</h1></div></header><nav className="scrollbar-hide overflow-x-auto rounded-2xl border border-border/50 bg-secondary/40 p-1.5"><div className="flex min-w-max gap-1 md:min-w-0">{sections.map(([key, label]) => <button key={key} onClick={() => setLocation(`/subjects/${subject.id}/${key}`)} className={`min-h-11 min-w-28 flex-1 rounded-xl px-4 text-sm font-semibold ${section === key ? "bg-card shadow-sm ring-1 ring-border/50" : "text-muted-foreground"}`}>{label}</button>)}</div></nav></motion.div>}</AnimatePresence>
    {notice && <div className="rounded-xl border border-border bg-secondary/40 px-4 py-3 text-sm">{notice}</div>}
    {importErrors.length > 0 && <div className="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">{importErrors.map(error => <p key={`${error.filename}-${error.reason}`}><b>{error.filename}:</b> {error.reason}</p>)}</div>}
    <AnimatePresence>{importing && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: .2 }} className="rounded-xl border border-border bg-secondary/40 px-4 py-3 text-sm">Parsing selected files…</motion.div>}</AnimatePresence>
    <AnimatePresence mode="wait">
      {section === "progress" && <motion.section key="progress" {...motionPanel} className="space-y-4"><GlassCard className="p-6 text-center"><p className="text-4xl font-bold">{overall}%</p><p className="text-muted-foreground">Overall progress</p></GlassCard><div className="grid gap-3 md:grid-cols-2"><ProgressRow label="Theoretical lectures" done={theoretical.filter(item => item.checked).length} count={theoretical.length} /><ProgressRow label="Practical lectures" done={practical.filter(item => item.checked).length} count={practical.length} /><ProgressRow label="Exam attempts" done={completedExams} count={subject.exams.length} /><ProgressRow label="Attachments reviewed" done={reviewedCount} count={attachments.length} /></div></motion.section>}
      {section === "lectures" && <motion.section key="lectures" {...motionPanel} className="space-y-4">
        {lectureMode === "normal" && <div className="grid grid-cols-2 gap-1 rounded-2xl border border-border/50 bg-secondary/40 p-1.5">{(["theoretical", "practical"] as StudyType[]).map(item => <button key={item} onClick={() => changeType(item)} className={`min-h-11 rounded-xl font-semibold capitalize ${lectureType === item ? "bg-card shadow-sm ring-1 ring-border/50" : "text-muted-foreground"}`}>{item}</button>)}</div>}
        <AnimatePresence mode="wait" initial={false}>
          {lectureMode === "normal" && <motion.div key="normal-toolbar" {...toolbarMotion} className="space-y-4"><div className="flex w-full gap-3"><IconAction icon={Plus} label="Add lecture" onClick={() => addLecture(subject.id, { name: `New ${lectureType} lecture`, link: "", type: lectureType })} /><IconAction icon={Upload} label="Import lectures" onClick={() => lectureImportRef.current?.click()} /><IconAction icon={Pencil} label="Edit lectures" onClick={() => { setLectureMode("manage"); setLectureReorder(false); }} /></div><FinalExamCard exam={finalExam} flashcardCount={finalFlashcards.length} subjectId={subject.id} type={lectureType} onImport={() => setFinalImportOpen(true)} onEdit={openFinalEdit} /></motion.div>}
          {lectureMode === "manage" && <ManageToolbar onBack={() => { setLectureMode("normal"); setLectureReorder(false); }} onDelete={() => { setLectureMode("select"); setLectureReorder(false); }} onDrag={() => setLectureReorder(current => !current)} dragActive={lectureReorder} entity="lectures" />}
          {lectureMode === "select" && <SelectAllToolbar active={lectures.length > 0 && selectedLectures.size === lectures.length} disabled={!lectures.length} onClick={() => setSelectedLectures(current => current.size === lectures.length ? new Set() : new Set(lectures.map(item => item.id)))} label="Select all lectures" />}
        </AnimatePresence>
        {lectureMode === "manage" && lectureReorder
          ? <Reorder.Group axis="y" values={orderedLectures} onReorder={handleLectureReorder} layoutScroll className="-mx-1 flex max-h-[68vh] flex-col gap-4 overflow-y-auto overscroll-contain px-1 py-4">{orderedLectures.map((lecture, index) => <Reorder.Item key={lecture.id} value={lecture} dragListener dragElastic={0.22} dragMomentum={false} layout="position" style={{ touchAction: "none" }} className="list-none cursor-grab select-none active:cursor-grabbing" onDragEnd={commitLectureReorder} whileDrag={{ scale: 1.045, y: -2, boxShadow: "0 20px 44px hsl(var(--foreground) / 0.18)", zIndex: 50 }} transition={{ type: "spring", stiffness: 520, damping: 32, mass: .65 }}>{renderLectureCard(lecture, index, "drag")}</Reorder.Item>)}</Reorder.Group>
          : lectureMode === "select"
            ? <div className="grid gap-3 md:grid-cols-2">{lectures.map((lecture, index) => <div key={lecture.id}>{renderLectureCard(lecture, index, "select")}</div>)}</div>
            : <div className="grid gap-3 md:grid-cols-2">{lectures.map((lecture, index) => <div key={lecture.id}>{renderLectureCard(lecture, index, lectureMode === "manage" ? "manage" : "normal")}</div>)}</div>}
        {!lectures.length && <GlassCard className="border-dashed border-2 bg-transparent p-10 text-center">No {lectureType} lectures yet.</GlassCard>}
      </motion.section>}
      {section === "attachments" && <motion.section key="attachments" {...motionPanel} className="space-y-4">
        {attachmentMode === "normal" && <motion.div {...toolbarMotion} className="flex w-full gap-3"><IconAction icon={Plus} label="Add attachment" onClick={beginAddAttachment} /><IconAction icon={Pencil} label="Edit attachments" onClick={() => { setAttachmentMode("manage"); setAttachmentReorder(false); }} /></motion.div>}
        <AnimatePresence mode="wait" initial={false}>
          {attachmentMode === "manage" && <ManageToolbar onBack={() => { setAttachmentMode("normal"); setAttachmentReorder(false); }} onDelete={() => { setAttachmentMode("select"); setAttachmentReorder(false); }} onDrag={() => setAttachmentReorder(current => !current)} dragActive={attachmentReorder} entity="attachments" />}
          {attachmentMode === "select" && <SelectAllToolbar active={attachments.length > 0 && selectedAttachments.size === attachments.length} disabled={!attachments.length} onClick={() => setSelectedAttachments(current => current.size === attachments.length ? new Set() : new Set(attachments.map(item => item.id)))} label="Select all attachments" />}
        </AnimatePresence>
        {attachmentMode === "manage" && attachmentReorder
          ? <Reorder.Group axis="y" values={orderedAttachments} onReorder={handleAttachmentReorder} layoutScroll className="-mx-1 flex max-h-[68vh] flex-col gap-4 overflow-y-auto overscroll-contain px-1 py-4">{orderedAttachments.map(attachment => <Reorder.Item key={attachment.id} value={attachment} dragListener dragElastic={0.22} dragMomentum={false} layout="position" style={{ touchAction: "none" }} className="list-none cursor-grab select-none active:cursor-grabbing" onDragEnd={commitAttachmentReorder} whileDrag={{ scale: 1.045, y: -2, boxShadow: "0 20px 44px hsl(var(--foreground) / 0.18)", zIndex: 50 }} transition={{ type: "spring", stiffness: 520, damping: 32, mass: .65 }}>{renderAttachmentCard(attachment, "drag")}</Reorder.Item>)}</Reorder.Group>
          : attachmentMode === "select"
            ? <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{attachments.map(attachment => <div key={attachment.id}>{renderAttachmentCard(attachment, "select")}</div>)}</div>
            : attachments.length ? <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{attachments.map(attachment => <div key={attachment.id}>{renderAttachmentCard(attachment, attachmentMode === "manage" ? "manage" : "normal")}</div>)}</div> : <GlassCard className="border-dashed border-2 bg-transparent p-10 text-center"><Paperclip className="mx-auto mb-3" />No attachments yet.</GlassCard>}
      </motion.section>}
    </AnimatePresence>

    <AnimatePresence>{activeSelect && <motion.div key="selection-actions" {...actionBarMotion} className="fixed inset-x-4 bottom-20 z-40 mx-auto flex max-w-md gap-3 rounded-3xl border border-border/60 bg-card p-3 shadow-xl md:bottom-8"><button type="button" disabled={section === "lectures" ? !selectedLectures.size : !selectedAttachments.size} onClick={section === "lectures" ? deleteSelectedLectures : deleteSelectedAttachments} className="min-h-12 flex-1 rounded-2xl bg-destructive px-4 font-semibold text-destructive-foreground transition-all duration-200 hover:opacity-90 active:scale-[.98] disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transform-none"><Trash2 className="mr-2 inline h-4 w-4" />Delete</button><button type="button" onClick={() => { if (section === "lectures") { setLectureMode("manage"); setSelectedLectures(new Set()); } else { setAttachmentMode("manage"); setSelectedAttachments(new Set()); } }} className="min-h-12 flex-1 rounded-2xl border border-border/60 bg-secondary px-4 font-semibold text-foreground transition-all duration-200 hover:bg-secondary/80 active:scale-[.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transform-none">Cancel</button></motion.div>}</AnimatePresence>

    <input ref={lectureImportRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={event => { importLectures(event.target.files?.[0]); event.target.value = ""; }} />
    <input ref={questionImportRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={event => { handleQuestionImport(event.target.files?.[0]); event.target.value = ""; }} />
    <input ref={flashcardImportRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={event => { handleFlashcardImport(event.target.files?.[0]); event.target.value = ""; }} />
    <input ref={finalImportRef} type="file" accept=".xlsx,.xls" multiple className="hidden" onChange={event => { importFinalFiles(Array.from(event.target.files ?? [])); event.target.value = ""; }} />
    <BottomSheet isOpen={!!importRequest} onClose={() => setImportRequest(null)} title={importRequest?.kind === "flashcards" ? "Import Flashcards" : "Import Questions"}><button disabled={importing} onClick={() => importRequest?.kind === "flashcards" ? flashcardImportRef.current?.click() : questionImportRef.current?.click()} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-4 font-semibold text-primary-foreground"><Upload className="h-5 w-5" />Import file</button></BottomSheet>
    <BottomSheet isOpen={finalImportOpen} onClose={() => setFinalImportOpen(false)} title="Import Final Exam content"><div className="space-y-3"><p className="text-sm text-muted-foreground">Select one or more Study Hub Exam or Flashcards spreadsheets.</p><button disabled={importing} onClick={() => finalImportRef.current?.click()} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-4 font-semibold text-primary-foreground disabled:opacity-50"><Upload className="h-5 w-5" />Import file</button></div></BottomSheet>
    <BottomSheet isOpen={attachmentOpen} onClose={() => setAttachmentOpen(false)} title={editingAttachment ? "Edit Attachment" : "Add Attachment"}><div className="space-y-4"><input value={attachmentName} onChange={event => setAttachmentName(event.target.value)} placeholder="Name" className="w-full rounded-xl border border-border bg-background px-4 py-3" /><input value={attachmentUrl} onChange={event => setAttachmentUrl(event.target.value)} placeholder="Link" className="w-full rounded-xl border border-border bg-background px-4 py-3" /><div className="grid grid-cols-3 gap-2">{(["Image", "Link", "File"] as const).map(item => <button key={item} onClick={() => setAttachmentFormat(item)} className={`rounded-xl border px-3 py-3 font-semibold ${attachmentFormat === item ? "border-primary bg-primary/10 text-primary" : "border-border"}`}>{item}</button>)}</div><button onClick={saveAttachment} className="w-full rounded-xl bg-primary py-3.5 font-semibold text-primary-foreground">{editingAttachment ? "Save Changes" : "Add Attachment"}</button></div></BottomSheet>
    <ConfirmSheet isOpen={!!deletingAttachment} onClose={() => setDeletingAttachment(null)} onConfirm={() => { if (deletingAttachment) { deleteAttachment(subject.id, deletingAttachment.id); setDeletingAttachment(null); } }} title="Delete attachment?" message="This removes the attachment card and its link from this subject." confirmLabel="Delete Attachment" />
  </div>;
}

function ManageToolbar({ onBack, onDelete, onDrag, dragActive, entity }: { onBack: () => void; onDelete: () => void; onDrag: () => void; dragActive: boolean; entity: string }) {
  return <motion.div key={`${entity}-manage`} {...toolbarMotion} className="flex items-center justify-between gap-3"><button onClick={onBack} className="flex min-h-11 items-center gap-2 rounded-2xl border border-border/60 bg-card px-4 font-semibold shadow-sm transition-all duration-200 hover:bg-secondary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><ArrowLeft className="h-4 w-4" />Back</button><div className="flex gap-2"><IconAction icon={Trash2} label={`Select ${entity} to delete`} destructive onClick={onDelete} /><IconAction icon={GripVertical} label={`Toggle ${entity} reordering`} active={dragActive} onClick={onDrag} /></div></motion.div>;
}

function SelectAllToolbar({ active, disabled, onClick, label }: { active: boolean; disabled: boolean; onClick: () => void; label: string }) {
  return <motion.div key={label} {...toolbarMotion} className="flex items-center justify-between"><span aria-hidden="true" /><div className="w-11"><IconAction icon={CheckCircle2} label={label} active={active} disabled={disabled} onClick={onClick} /></div></motion.div>;
}

function FinalExamCard({ exam, flashcardCount, subjectId, type, onImport, onEdit }: { exam?: Exam; flashcardCount: number; subjectId: string; type: StudyType; onImport: () => void; onEdit: () => void }) {
  const [, setLocation] = useLocation();
  const count = exam?.questions?.length ?? 0;
  const total = count + flashcardCount;
  const from = encodeURIComponent(fromHere());
  return <SwipeRow onTap={onEdit} onSwipeRight={onEdit} rightLabel="Edit" rightIcon={FileQuestion} rightColor={examAccent} onSwipeLeft={() => total && exam ? setLocation(`/subjects/${subjectId}/exams/${exam.id}/take?from=${from}`) : onImport()} leftLabel={total ? "Examine" : "Add Questions"} leftIcon={BookOpen} leftColor={examAccent}><GlassCard className="overflow-hidden bg-card p-0"><div className="h-1" style={{ backgroundColor: examAccent }} /><div className="p-5"><div className="flex items-center gap-4"><div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-purple-500/20 bg-purple-500/10 text-purple-500"><FileQuestion /></div><div className="flex-1"><p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Pinned · {type}</p><h3 className="mt-1 text-lg font-bold">Final Exam</h3><p className="mt-1 text-xs text-muted-foreground">{count} questions · {flashcardCount} flashcards</p></div><ChevronRight className="h-4 w-4" /></div></div></GlassCard></SwipeRow>;
}
