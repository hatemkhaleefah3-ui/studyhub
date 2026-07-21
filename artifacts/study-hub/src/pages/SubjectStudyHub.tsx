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
type LectureMode = "normal" | "manage" | "select";

const sections: [Section, string][] = [["progress", "Progress"], ["lectures", "Lectures"], ["attachments", "Attachments"]];
const motionPanel = { initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -8 }, transition: { duration: .2, ease: [.4, 0, .2, 1] as const } };
const toolbarMotion = { initial: { opacity: 0, y: -6, scale: .98 }, animate: { opacity: 1, y: 0, scale: 1 }, exit: { opacity: 0, y: 6, scale: .98 }, transition: { duration: .22, ease: [.4, 0, .2, 1] as const } };
const examAccent = "hsl(280 67% 60%)";
const fromHere = () => `${window.location.pathname}${window.location.search}`;

function ActionTile({ icon: Icon, label, onClick }: { icon: any; label: string; onClick: () => void }) {
  return <button onClick={onClick} className="w-full min-h-24 rounded-2xl border-2 border-dashed border-border bg-secondary/20 p-4 text-muted-foreground transition-all duration-200 hover:border-primary/40 hover:bg-primary/5 hover:text-primary active:scale-[.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transform-none"><Icon className="mx-auto mb-2 h-5 w-5" /><span className="text-sm font-semibold">{label}</span></button>;
}

function IconAction({ icon: Icon, label, onClick, active = false, destructive = false, disabled = false }: { icon: any; label: string; onClick: () => void; active?: boolean; destructive?: boolean; disabled?: boolean }) {
  const state = destructive
    ? "border-destructive/25 bg-destructive/10 text-destructive hover:bg-destructive/15"
    : active
      ? "border-primary/30 bg-primary/15 text-primary shadow-sm"
      : "border-border/60 bg-card text-muted-foreground hover:border-primary/30 hover:bg-primary/5 hover:text-primary";
  return <button type="button" aria-label={label} aria-pressed={active || undefined} disabled={disabled} onClick={onClick} className={`flex min-h-11 flex-1 items-center justify-center rounded-2xl border px-3 shadow-sm transition-all duration-200 ease-in-out hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 active:scale-[.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-40 motion-reduce:transform-none ${state}`}><Icon className="h-5 w-5" /></button>;
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
  const [lectureMode, setLectureMode] = useState<LectureMode>("normal");
  const [selectedLectures, setSelectedLectures] = useState<Set<string>>(new Set());
  const [reorderMode, setReorderMode] = useState(false);
  const [orderedLectures, setOrderedLectures] = useState<Lecture[]>([]);
  const [confirmDeleteLectures, setConfirmDeleteLectures] = useState(false);
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

  useEffect(() => { if (id && location === `/subjects/${id}`) setLocation(`/subjects/${id}/progress`, { replace: true }); }, [id, location, setLocation]);
  useEffect(() => localStorage.setItem(reviewedKey, JSON.stringify(reviewed)), [reviewed, reviewedKey]);

  if (!subject) return <div className="p-8 text-center text-muted-foreground">Subject not found</div>;

  const lectures = subject.lectures.filter(item => item.type === lectureType);
  const theoretical = subject.lectures.filter(item => item.type === "theoretical");
  const practical = subject.lectures.filter(item => item.type === "practical");
  const attachments = subject.attachments ?? [];
  const finalExam = subject.exams.find(item => item.type === lectureType && item.name === "Final Exam");
  const finalFlashcardKey = `studyhub:final-flashcards:${subject.id}:${lectureType}`;
  const finalFlashcards = JSON.parse(localStorage.getItem(finalFlashcardKey) ?? "[]");
  const completedLectures = subject.lectures.filter(item => item.checked).length;
  const completedExams = subject.exams.filter(item => item.checked || item.lastScore).length;
  const reviewedCount = attachments.filter(item => reviewed.includes(item.id)).length;
  const total = subject.lectures.length + subject.exams.length + attachments.length;
  const overall = total ? Math.round((completedLectures + completedExams + reviewedCount) / total * 100) : 0;

  useEffect(() => {
    setOrderedLectures(lectures);
    setSelectedLectures(new Set());
    setReorderMode(false);
  }, [lectureType, subject.lectures]);

  const lectureExam = (lectureId: string) => subject.exams.find(item => item.linkedLectureIds?.includes(lectureId));
  const changeType = (next: StudyType) => { setLectureType(next); setLectureMode("normal"); setLocation(`/subjects/${subject.id}/lectures?type=${next}`, { replace: true }); };
  const importLectures = async (file?: File) => { if (!file) return; const { names, skipped } = await parseLectureExcel(file); names.forEach(name => addLecture(subject.id, { name, link: "", type: lectureType })); setNotice(`Imported ${names.length} lecture${names.length === 1 ? "" : "s"}${skipped ? `; skipped ${skipped}` : ""}.`); };
  const ensureFinalExam = (): Exam => { if (finalExam) return finalExam; const created: Exam = { id: crypto.randomUUID(), name: "Final Exam", link: "", grade: null, date: null, weight: 1, type: lectureType, linkedLectureIds: [], questions: [], lastScore: null, checked: false }; updateSubject(subject.id, { exams: [...subject.exams, created] }); return created; };
  const openFinalEdit = () => { const exam = ensureFinalExam(); setLocation(`/subjects/${subject.id}/exams/${exam.id}/edit?from=${encodeURIComponent(fromHere())}`); };
  const importFinalFiles = async (files: File[]) => { if (!files.length) return; setFinalImportOpen(false); setImporting(true); setImportErrors([]); try { const parsed = await parseFinalExamFiles(files); const exam = ensureFinalExam(); if (parsed.questions.length) updateExam(subject.id, exam.id, { questions: [...(exam.questions ?? []), ...parsed.questions] }); if (parsed.flashcards.length) localStorage.setItem(finalFlashcardKey, JSON.stringify([...finalFlashcards, ...parsed.flashcards])); setImportErrors(parsed.errors); const added = parsed.questions.length + parsed.flashcards.length; if (added) setNotice(`Imported ${parsed.questions.length} question${parsed.questions.length === 1 ? "" : "s"} and ${parsed.flashcards.length} flashcard${parsed.flashcards.length === 1 ? "" : "s"}.`); } finally { setImporting(false); } };
  const handleQuestionImport = async (file?: File) => { if (!file || !importRequest) return; setImporting(true); try { const questions: ExamQuestion[] = await parseExamExcel(file); const existing = lectureExam(importRequest.lectureId); const lecture = subject.lectures.find(item => item.id === importRequest.lectureId); if (existing) updateExam(subject.id, existing.id, { questions: [...(existing.questions ?? []), ...questions] }); else addExam(subject.id, { name: `${lecture?.name ?? "Lecture"} MCQs`, link: "", grade: null, date: null, weight: 1, type: lecture?.type ?? lectureType, linkedLectureIds: [importRequest.lectureId], questions }); setNotice(`Imported ${questions.length} questions.`); setImportRequest(null); } finally { setImporting(false); } };
  const handleFlashcardImport = async (file?: File) => { if (!file || !importRequest) return; setImporting(true); try { const { rows, skipped } = await parseFlashcardExcel(file); rows.forEach(row => addFlashcard(subject.id, importRequest.lectureId, row)); setNotice(`Imported ${rows.length} flashcards${skipped ? `; skipped ${skipped}` : ""}.`); setImportRequest(null); } finally { setImporting(false); } };

  const enterManage = () => { setLectureMode("manage"); setSelectedLectures(new Set()); setReorderMode(false); };
  const exitManage = () => { setLectureMode("normal"); setSelectedLectures(new Set()); setReorderMode(false); };
  const enterSelect = () => { setLectureMode("select"); setSelectedLectures(new Set()); setReorderMode(false); };
  const exitSelect = () => { setLectureMode("manage"); setSelectedLectures(new Set()); setReorderMode(false); };
  const toggleLecture = (lectureId: string) => setSelectedLectures(current => { const next = new Set(current); next.has(lectureId) ? next.delete(lectureId) : next.add(lectureId); return next; });
  const persistReorder = (next: Lecture[]) => {
    setOrderedLectures(next);
    let index = 0;
    const merged = subject.lectures.map(item => item.type === lectureType ? next[index++] : item);
    updateSubject(subject.id, { lectures: merged });
  };
  const deleteSelected = () => {
    selectedLectures.forEach(lectureId => deleteLecture(subject.id, lectureId));
    setSelectedLectures(new Set());
    setReorderMode(false);
    setConfirmDeleteLectures(false);
    setNotice("Selected lectures deleted.");
  };

  const openAttachment = (attachment: Attachment) => { setReviewed(current => current.includes(attachment.id) ? current : [...current, attachment.id]); window.open(attachment.url, "_blank", "noopener,noreferrer"); };
  const beginAddAttachment = () => { setEditingAttachment(null); setAttachmentName(""); setAttachmentUrl(""); setAttachmentFormat("Link"); setAttachmentOpen(true); };
  const beginEditAttachment = (attachment: Attachment) => { setEditingAttachment(attachment); setAttachmentName(attachment.name ?? ""); setAttachmentUrl(attachment.url); setAttachmentFormat(attachment.format === "Image" ? "Image" : /^https?:\/\//.test(attachment.url) ? "Link" : "File"); setAttachmentOpen(true); };
  const saveAttachment = () => { if (!attachmentName.trim() || !attachmentUrl.trim()) return; const payload = { name: attachmentName.trim(), url: attachmentUrl.trim(), type: "Study Sheet" as const, format: (attachmentFormat === "Image" ? "Image" : "File") as AttachmentFormat, priority: "Not Important" as const }; editingAttachment ? updateAttachment(subject.id, editingAttachment.id, payload) : addAttachment(subject.id, payload); setAttachmentOpen(false); setNotice(editingAttachment ? "Attachment updated." : "Attachment added."); };
  const ProgressRow = ({ label, done, count }: { label: string; done: number; count: number }) => { const value = count ? Math.round(done / count * 100) : 0; return <div className="rounded-2xl border border-border/50 bg-secondary/30 p-4"><div className="mb-3 flex justify-between"><div><p className="font-semibold">{label}</p><p className="text-xs text-muted-foreground">{done} of {count}</p></div><b>{value}%</b></div><div className="h-2 overflow-hidden rounded-full bg-secondary"><motion.div initial={{ width: 0 }} animate={{ width: `${value}%` }} className="h-full rounded-full bg-primary" /></div></div>; };

  const renderLectureCard = (lecture: Lecture, index: number, selectable = false) => {
    const exam = lectureExam(lecture.id);
    const mcqs = exam?.questions?.length ?? 0;
    const cards = lecture.flashcards?.length ?? 0;
    const selected = selectedLectures.has(lecture.id);
    const content = <GlassCard className={`relative bg-card p-4 transition-all duration-200 ${selected ? "border-primary ring-2 ring-primary/30 shadow-md" : "border-border/50"}`}><AnimatePresence>{selected && <motion.span initial={{ opacity: 0, scale: .6 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: .6 }} className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm"><CheckCircle2 className="h-4 w-4" /></motion.span>}</AnimatePresence><div className="flex items-center gap-4"><div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-border/50 bg-secondary/60 text-xs font-bold">{String(index + 1).padStart(2, "0")}</div><div className="min-w-0 flex-1 pr-7"><p className="truncate font-semibold">{lecture.name}</p><p className="mt-1 text-xs text-muted-foreground">{mcqs} MCQs · {cards} flashcards</p></div>{selectable && reorderMode && selected ? <GripVertical className="h-5 w-5 text-primary" /> : !selectable ? <ChevronRight className="h-4 w-4 text-muted-foreground" /> : null}</div></GlassCard>;
    if (selectable) return <button type="button" onClick={() => !reorderMode && toggleLecture(lecture.id)} className="w-full rounded-3xl text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{content}</button>;
    const from = encodeURIComponent(fromHere());
    return <SwipeRow onTap={() => setLocation(`/subjects/${subject.id}/lectures/${lecture.id}?from=${from}`)} onSwipeLeft={() => mcqs ? setLocation(`/subjects/${subject.id}/exams/${exam!.id}/take?from=${from}`) : setImportRequest({ kind: "mcq", lectureId: lecture.id })} leftLabel={mcqs ? "Examine MCQs" : "Import MCQs"} leftIcon={Brain} leftColor="hsl(var(--primary))" onSwipeRight={() => cards ? setLocation(`/subjects/${subject.id}/lectures/${lecture.id}/study?from=${from}`) : setImportRequest({ kind: "flashcards", lectureId: lecture.id })} rightLabel={cards ? "Examine Flashcards" : "Import Flashcards"} rightIcon={Layers} rightColor="hsl(var(--primary))">{content}</SwipeRow>;
  };

  const hidePageChrome = section === "lectures" && lectureMode !== "normal";

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
          {lectureMode === "normal" && <motion.div key="normal-toolbar" {...toolbarMotion} className="space-y-4"><div className="flex w-full gap-3"><IconAction icon={Plus} label="Add lecture" onClick={() => addLecture(subject.id, { name: `New ${lectureType} lecture`, link: "", type: lectureType })} /><IconAction icon={Upload} label="Import lectures" onClick={() => lectureImportRef.current?.click()} /><IconAction icon={Pencil} label="Edit lectures" onClick={enterManage} /></div><FinalExamCard exam={finalExam} flashcardCount={finalFlashcards.length} subjectId={subject.id} type={lectureType} onImport={() => setFinalImportOpen(true)} onEdit={openFinalEdit} /></motion.div>}
          {lectureMode === "manage" && <motion.div key="manage-toolbar" {...toolbarMotion} className="flex items-center justify-between gap-3"><button onClick={exitManage} className="flex min-h-11 items-center gap-2 rounded-2xl border border-border/60 bg-card px-4 font-semibold shadow-sm transition-all duration-200 hover:bg-secondary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><ArrowLeft className="h-4 w-4" />Back</button><button onClick={enterSelect} className="min-h-11 rounded-2xl bg-primary px-5 font-semibold text-primary-foreground shadow-sm transition-all duration-200 hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Select</button></motion.div>}
          {lectureMode === "select" && <motion.div key="select-toolbar" {...toolbarMotion} className="flex items-center justify-between gap-3"><button onClick={exitSelect} className="flex min-h-11 items-center gap-2 rounded-2xl border border-border/60 bg-card px-4 font-semibold shadow-sm transition-all duration-200 hover:bg-secondary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><ArrowLeft className="h-4 w-4" />Back</button><div className="flex min-w-0 flex-1 justify-end gap-2"><IconAction icon={GripVertical} label="Toggle lecture reordering" active={reorderMode} disabled={!selectedLectures.size} onClick={() => setReorderMode(current => !current)} /><IconAction icon={Trash2} label="Delete selected lectures" destructive disabled={!selectedLectures.size} onClick={() => setConfirmDeleteLectures(true)} /></div></motion.div>}
        </AnimatePresence>
        {lectureMode === "select" ? <Reorder.Group axis="y" values={orderedLectures} onReorder={persistReorder} className="grid gap-3 md:grid-cols-2">{orderedLectures.map((lecture, index) => <Reorder.Item key={lecture.id} value={lecture} dragListener={reorderMode && selectedLectures.has(lecture.id)} className="list-none" whileDrag={{ scale: 1.02, boxShadow: "0 14px 30px hsl(var(--foreground) / 0.12)", zIndex: 20 }}>{renderLectureCard(lecture, index, true)}</Reorder.Item>)}</Reorder.Group> : <div className="grid gap-3 md:grid-cols-2">{lectures.map((lecture, index) => <div key={lecture.id}>{renderLectureCard(lecture, index)}</div>)}</div>}
        {!lectures.length && <GlassCard className="border-dashed border-2 bg-transparent p-10 text-center">No {lectureType} lectures yet.</GlassCard>}
      </motion.section>}
      {section === "attachments" && <motion.section key="attachments" {...motionPanel} className="space-y-4"><div><p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Library</p><h2 className="text-xl font-bold">Subject attachments</h2></div>{attachments.length ? <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{attachments.map(attachment => { const Icon = attachmentIcon(attachment); return <SwipeRow key={attachment.id} onTap={() => openAttachment(attachment)} onSwipeLeft={() => beginEditAttachment(attachment)} leftLabel="Edit" leftIcon={Pencil} leftColor="hsl(var(--primary))" onSwipeRight={() => setDeletingAttachment(attachment)} rightLabel="Delete" rightIcon={Trash2} rightColor="hsl(var(--destructive))"><GlassCard className="p-4"><div className="flex items-start gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-xl border border-border/50 bg-secondary/60"><Icon className="h-5 w-5" /></div><div className="min-w-0 flex-1"><p className="truncate font-semibold">{attachment.name || attachment.type}</p><p className="mt-1 text-xs text-muted-foreground">{attachment.format}</p></div>{reviewed.includes(attachment.id) && <Check className="h-4 w-4 text-primary" />}</div></GlassCard></SwipeRow>; })}</div> : <GlassCard className="border-dashed border-2 bg-transparent p-10 text-center"><Paperclip className="mx-auto mb-3" />No attachments yet.</GlassCard>}<ActionTile icon={Plus} label="Add Attachment" onClick={beginAddAttachment} /></motion.section>}
    </AnimatePresence>
    <input ref={lectureImportRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={event => { importLectures(event.target.files?.[0]); event.target.value = ""; }} />
    <input ref={questionImportRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={event => { handleQuestionImport(event.target.files?.[0]); event.target.value = ""; }} />
    <input ref={flashcardImportRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={event => { handleFlashcardImport(event.target.files?.[0]); event.target.value = ""; }} />
    <input ref={finalImportRef} type="file" accept=".xlsx,.xls" multiple className="hidden" onChange={event => { importFinalFiles(Array.from(event.target.files ?? [])); event.target.value = ""; }} />
    <BottomSheet isOpen={!!importRequest} onClose={() => setImportRequest(null)} title={importRequest?.kind === "flashcards" ? "Import Flashcards" : "Import Questions"}><button disabled={importing} onClick={() => importRequest?.kind === "flashcards" ? flashcardImportRef.current?.click() : questionImportRef.current?.click()} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-4 font-semibold text-primary-foreground"><Upload className="h-5 w-5" />Import file</button></BottomSheet>
    <BottomSheet isOpen={finalImportOpen} onClose={() => setFinalImportOpen(false)} title="Import Final Exam content"><div className="space-y-3"><p className="text-sm text-muted-foreground">Select one or more Study Hub Exam or Flashcards spreadsheets.</p><button disabled={importing} onClick={() => finalImportRef.current?.click()} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-4 font-semibold text-primary-foreground disabled:opacity-50"><Upload className="h-5 w-5" />Import file</button></div></BottomSheet>
    <BottomSheet isOpen={attachmentOpen} onClose={() => setAttachmentOpen(false)} title={editingAttachment ? "Edit Attachment" : "Add Attachment"}><div className="space-y-4"><input value={attachmentName} onChange={event => setAttachmentName(event.target.value)} placeholder="Name" className="w-full rounded-xl border border-border bg-background px-4 py-3" /><input value={attachmentUrl} onChange={event => setAttachmentUrl(event.target.value)} placeholder="Link" className="w-full rounded-xl border border-border bg-background px-4 py-3" /><div className="grid grid-cols-3 gap-2">{(["Image", "Link", "File"] as const).map(item => <button key={item} onClick={() => setAttachmentFormat(item)} className={`rounded-xl border px-3 py-3 font-semibold ${attachmentFormat === item ? "border-primary bg-primary/10 text-primary" : "border-border"}`}>{item}</button>)}</div><button onClick={saveAttachment} className="w-full rounded-xl bg-primary py-3.5 font-semibold text-primary-foreground">{editingAttachment ? "Save Changes" : "Add Attachment"}</button></div></BottomSheet>
    <ConfirmSheet isOpen={!!deletingAttachment} onClose={() => setDeletingAttachment(null)} onConfirm={() => { if (deletingAttachment) { deleteAttachment(subject.id, deletingAttachment.id); setDeletingAttachment(null); } }} title="Delete attachment?" message="This removes the attachment card and its link from this subject." confirmLabel="Delete Attachment" />
    <ConfirmSheet isOpen={confirmDeleteLectures} onClose={() => setConfirmDeleteLectures(false)} onConfirm={deleteSelected} title="Delete selected lectures?" message={`This permanently removes ${selectedLectures.size} selected lecture${selectedLectures.size === 1 ? "" : "s"} and their study content.`} confirmLabel="Delete Lectures" />
  </div>;
}

function FinalExamCard({ exam, flashcardCount, subjectId, type, onImport, onEdit }: { exam?: Exam; flashcardCount: number; subjectId: string; type: StudyType; onImport: () => void; onEdit: () => void }) {
  const [, setLocation] = useLocation();
  const count = exam?.questions?.length ?? 0;
  const total = count + flashcardCount;
  const from = encodeURIComponent(fromHere());
  return <SwipeRow onTap={onEdit} onSwipeRight={onEdit} rightLabel="Edit" rightIcon={FileQuestion} rightColor={examAccent} onSwipeLeft={() => total && exam ? setLocation(`/subjects/${subjectId}/exams/${exam.id}/take?from=${from}`) : onImport()} leftLabel={total ? "Examine" : "Add Questions"} leftIcon={BookOpen} leftColor={examAccent}><GlassCard className="overflow-hidden bg-card p-0"><div className="h-1" style={{ backgroundColor: examAccent }} /><div className="p-5"><div className="flex items-center gap-4"><div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-purple-500/20 bg-purple-500/10 text-purple-500"><FileQuestion /></div><div className="flex-1"><p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Pinned · {type}</p><h3 className="mt-1 text-lg font-bold">Final Exam</h3><p className="mt-1 text-xs text-muted-foreground">{count} questions · {flashcardCount} flashcards</p></div><ChevronRight className="h-4 w-4" /></div></div></GlassCard></SwipeRow>;
}
