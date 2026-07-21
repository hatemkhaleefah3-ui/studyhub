import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useLocation, useRoute, useSearch } from "wouter";
import { ArrowLeft, BookOpen, Brain, Check, ChevronRight, File, FileQuestion, Image, Layers, Link as LinkIcon, Paperclip, Pencil, Plus, Trash2, Upload, X } from "lucide-react";
import { GlassCard } from "@/components/shared/GlassCard";
import { SwipeRow } from "@/components/shared/SwipeRow";
import { BottomSheet } from "@/components/shared/BottomSheet";
import { ConfirmSheet } from "@/components/shared/ConfirmSheet";
import { useStudyData, type Attachment, type ExamQuestion, type StudyType } from "@/hooks/useStudyData";
import { parseExamExcel, parseFlashcardExcel, parseLectureExcel } from "@/lib/excelImport";

type Section = "progress" | "lectures" | "attachments";
type ImportAction = null | { kind: "final" | "mcq" | "flashcard"; lectureId?: string };
type AttachmentEditor = null | { mode: "add" | "edit"; id?: string; name: string; url: string; kind: "Image" | "File" | "Link" };
const sectionItems: { id: Section; label: string }[] = [{ id: "progress", label: "Progress" }, { id: "lectures", label: "Lectures" }, { id: "attachments", label: "Attachments" }];
const panelMotion = { initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -8 }, transition: { duration: 0.2, ease: [0.4, 0, 0.2, 1] as const } };
const examAccent = "hsl(276 100% 50%)";

function attachmentKind(a: Attachment): "Image" | "File" | "Link" {
  if (a.format === "Image") return "Image";
  return /\.(pdf|docx?|xlsx?|pptx?|zip)(\?|$)/i.test(a.url) ? "File" : "Link";
}
function attachmentIcon(a: Attachment) { return attachmentKind(a) === "Image" ? Image : attachmentKind(a) === "File" ? File : LinkIcon; }

export function SubjectStudyHub() {
  const [, nestedParams] = useRoute("/subjects/:id/:section");
  const [, baseParams] = useRoute("/subjects/:id");
  const [location, setLocation] = useLocation();
  const search = useSearch();
  const { subjects, addLecture, addExam, updateExam, addFlashcard, addAttachment, updateAttachment, deleteAttachment, updateSubject } = useStudyData();
  const id = nestedParams?.id ?? baseParams?.id;
  const subject = subjects.find((item) => item.id === id);
  const rawSection = nestedParams?.section as Section | undefined;
  const section: Section = sectionItems.some((item) => item.id === rawSection) ? rawSection! : "progress";
  const requestedType = new URLSearchParams(search).get("type");
  const [lectureType, setLectureType] = useState<StudyType>(requestedType === "practical" ? "practical" : "theoretical");
  const [notice, setNotice] = useState("");
  const [importAction, setImportAction] = useState<ImportAction>(null);
  const [attachmentEditor, setAttachmentEditor] = useState<AttachmentEditor>(null);
  const [deleteAttachmentId, setDeleteAttachmentId] = useState<string | null>(null);
  const lectureImportRef = useRef<HTMLInputElement>(null);
  const questionImportRef = useRef<HTMLInputElement>(null);
  const flashcardImportRef = useRef<HTMLInputElement>(null);

  const reviewedKey = `studyhub:reviewed-attachments:${id ?? "unknown"}`;
  const [reviewedAttachments, setReviewedAttachments] = useState<string[]>(() => { try { return JSON.parse(localStorage.getItem(reviewedKey) ?? "[]"); } catch { return []; } });
  useEffect(() => { if (id && location === `/subjects/${id}`) setLocation(`/subjects/${id}/progress`, { replace: true }); }, [id, location, setLocation]);
  useEffect(() => { localStorage.setItem(reviewedKey, JSON.stringify(reviewedAttachments)); }, [reviewedAttachments, reviewedKey]);
  if (!subject) return <div className="p-8 text-center text-muted-foreground">Subject not found</div>;

  const lectures = subject.lectures.filter((l) => l.type === lectureType);
  const attachments = subject.attachments ?? [];
  const completedExams = subject.exams.filter((e) => e.checked || e.lastScore).length;
  const completedLectures = subject.lectures.filter((l) => l.checked).length;
  const reviewedCount = attachments.filter((a) => reviewedAttachments.includes(a.id)).length;
  const total = subject.lectures.length + subject.exams.length + attachments.length;
  const overall = total ? Math.round(((completedLectures + completedExams + reviewedCount) / total) * 100) : 0;
  const finalExam = subject.exams.find((e) => e.type === lectureType && e.name === "Final Exam");
  const lectureExam = (lectureId: string) => subject.exams.find((e) => e.linkedLectureIds?.includes(lectureId));

  const setType = (next: StudyType) => { setLectureType(next); setLocation(`/subjects/${subject.id}/lectures?type=${next}`, { replace: true }); };
  const importLectures = async (file?: File) => { if (!file) return; const { names, skipped } = await parseLectureExcel(file); names.forEach((name) => addLecture(subject.id, { name, link: "", type: lectureType })); setNotice(`Imported ${names.length} lectures${skipped ? `; skipped ${skipped}` : ""}.`); };
  const ensureFinalExam = () => {
    if (finalExam) return finalExam.id;
    const examId = crypto.randomUUID();
    updateSubject(subject.id, { exams: [...subject.exams, { id: examId, name: "Final Exam", link: "", grade: null, date: null, weight: 1, type: lectureType, checked: false, linkedLectureIds: [], questions: [], lastScore: null }] });
    return examId;
  };
  const importQuestions = async (file?: File) => {
    if (!file || !importAction || importAction.kind === "flashcard") return;
    const questions: ExamQuestion[] = await parseExamExcel(file);
    if (importAction.kind === "final") {
      const examId = ensureFinalExam(); const current = subject.exams.find((e) => e.id === examId);
      updateExam(subject.id, examId, { questions: [...(current?.questions ?? []), ...questions] });
    } else if (importAction.lectureId) {
      const existing = lectureExam(importAction.lectureId);
      if (existing) updateExam(subject.id, existing.id, { questions: [...(existing.questions ?? []), ...questions] });
      else { const lecture = subject.lectures.find((l) => l.id === importAction.lectureId)!; addExam(subject.id, { name: `${lecture.name} MCQs`, link: "", grade: null, date: null, weight: 1, type: lecture.type, linkedLectureIds: [lecture.id], questions }); }
    }
    setNotice(`Imported ${questions.length} questions.`); setImportAction(null);
  };
  const importFlashcards = async (file?: File) => { if (!file || importAction?.kind !== "flashcard" || !importAction.lectureId) return; const { rows, skipped } = await parseFlashcardExcel(file); rows.forEach((row) => addFlashcard(subject.id, importAction.lectureId!, row)); setNotice(`Imported ${rows.length} flashcards${skipped ? `; skipped ${skipped}` : ""}.`); setImportAction(null); };
  const saveAttachment = () => {
    if (!attachmentEditor || !attachmentEditor.name.trim() || !attachmentEditor.url.trim()) return;
    const format = attachmentEditor.kind === "Image" ? "Image" : "File";
    const data = { name: attachmentEditor.name.trim(), url: attachmentEditor.url.trim(), type: "Study Sheet" as const, format: format as "Image" | "File", priority: "Not Important" as const };
    if (attachmentEditor.mode === "edit" && attachmentEditor.id) updateAttachment(subject.id, attachmentEditor.id, data); else addAttachment(subject.id, data);
    setAttachmentEditor(null); setNotice("Attachment saved.");
  };

  return <div className="space-y-6 pb-24">
    <header className="flex items-center gap-3"><button onClick={() => window.history.length > 1 ? window.history.back() : setLocation("/subjects")} className="flex h-10 w-10 items-center justify-center rounded-full border border-border/50 bg-secondary/60 shadow-sm"><ArrowLeft className="h-4 w-4" /></button><div className="min-w-0 flex-1"><p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Subject</p><h1 className="truncate text-2xl font-bold md:text-3xl">{subject.emoji ?? "📚"} {subject.name}</h1></div></header>
    <nav className="scrollbar-hide overflow-x-auto rounded-2xl border border-border/50 bg-secondary/40 p-1.5"><div className="flex min-w-max gap-1 md:min-w-0">{sectionItems.map((item) => <button key={item.id} onClick={() => setLocation(`/subjects/${subject.id}/${item.id}`)} className={`min-h-11 min-w-28 flex-1 rounded-xl px-4 text-sm font-semibold transition-all ${section === item.id ? "bg-card shadow-sm ring-1 ring-border/50" : "text-muted-foreground"}`}>{item.label}</button>)}</div></nav>
    {notice && <div className="flex items-center justify-between rounded-xl border border-border bg-secondary/40 px-4 py-3 text-sm"><span>{notice}</span><button onClick={() => setNotice("")}><X className="h-4 w-4" /></button></div>}
    <AnimatePresence mode="wait">
      {section === "progress" && <motion.section key="progress" {...panelMotion} className="space-y-4"><GlassCard className="p-6"><div className="flex items-center gap-6"><div className="flex h-28 w-28 shrink-0 items-center justify-center rounded-full border-8 border-primary/20"><span className="text-2xl font-bold">{overall}%</span></div><div><p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Overall progress</p><h2 className="mt-2 text-2xl font-bold">Keep building momentum</h2><p className="mt-2 text-sm text-muted-foreground">{completedLectures} lectures · {completedExams} exams · {reviewedCount} attachments completed</p></div></div></GlassCard></motion.section>}
      {section === "lectures" && <motion.section key="lectures" {...panelMotion} className="space-y-4">
        <div className="grid grid-cols-2 gap-1 rounded-2xl border border-border/50 bg-secondary/40 p-1.5">{(["theoretical", "practical"] as StudyType[]).map((t) => <button key={t} onClick={() => setType(t)} className={`min-h-11 rounded-xl font-semibold capitalize ${lectureType === t ? "bg-card shadow-sm ring-1 ring-border/50" : "text-muted-foreground"}`}>{t}</button>)}</div>
        <SwipeRow onTap={() => finalExam ? setLocation(`/subjects/${subject.id}/exams/${finalExam.id}/edit`) : setImportAction({kind:"final"})} onSwipeRight={() => finalExam ? setLocation(`/subjects/${subject.id}/exams/${finalExam.id}/edit`) : setImportAction({kind:"final"})} rightLabel="Edit" rightIcon={Pencil} rightColor={examAccent} onSwipeLeft={() => finalExam?.questions?.length ? setLocation(`/subjects/${subject.id}/exams/${finalExam.id}/take`) : setImportAction({kind:"final"})} leftLabel={finalExam?.questions?.length ? "Examine" : "Import Questions"} leftIcon={BookOpen} leftColor={examAccent}><GlassCard className="overflow-hidden p-0 shadow-sm"><div className="h-1" style={{backgroundColor:examAccent}}/><div className="flex items-center gap-4 p-5"><div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-purple-500/20 bg-purple-500/10 text-purple-500"><FileQuestion/></div><div className="flex-1"><p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Pinned · {lectureType}</p><h3 className="mt-1 text-lg font-bold">Final Exam</h3><p className="text-xs text-muted-foreground">{finalExam?.questions?.length ?? 0} questions</p></div><ChevronRight className="h-4 w-4 text-muted-foreground"/></div></GlassCard></SwipeRow>
        <div className="grid gap-3 md:grid-cols-2">{lectures.map((lecture,index)=>{const exam=lectureExam(lecture.id);const mcqs=exam?.questions?.length??0;const cards=lecture.flashcards?.length??0;const from=encodeURIComponent(`/subjects/${subject.id}/lectures?type=${lectureType}`);return <SwipeRow key={lecture.id} onTap={()=>setLocation(`/subjects/${subject.id}/lectures/${lecture.id}?from=${from}`)} onSwipeLeft={()=>mcqs?setLocation(`/subjects/${subject.id}/exams/${exam!.id}/take`):setImportAction({kind:"mcq",lectureId:lecture.id})} leftLabel={mcqs?"Examine MCQs":"Import MCQs"} leftIcon={Brain} leftColor="hsl(var(--primary))" onSwipeRight={()=>cards?setLocation(`/subjects/${subject.id}/lectures/${lecture.id}/study`):setImportAction({kind:"flashcard",lectureId:lecture.id})} rightLabel={cards?"Examine Flashcards":"Import Flashcards"} rightIcon={Layers} rightColor="hsl(var(--primary))" onLongPress={lecture.link?()=>window.open(lecture.link,"_blank","noopener,noreferrer"):undefined}><GlassCard className="p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"><div className="flex items-center gap-4"><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary/60 text-xs font-bold">{String(index+1).padStart(2,"0")}</div><div className="min-w-0 flex-1"><p className="truncate font-semibold">{lecture.name}</p><p className="mt-1 text-xs text-muted-foreground">{mcqs} MCQs · {cards} flashcards</p></div><ChevronRight className="h-4 w-4 text-muted-foreground"/></div></GlassCard></SwipeRow>})}</div>
        <div className="grid grid-cols-2 gap-3"><button onClick={()=>addLecture(subject.id,{name:`New ${lectureType} lecture`,link:"",type:lectureType})} className="min-h-24 rounded-2xl border-2 border-dashed border-border p-4"><Plus className="mx-auto mb-2"/>Add Lecture</button><button onClick={()=>lectureImportRef.current?.click()} className="min-h-24 rounded-2xl border-2 border-dashed border-border p-4"><Upload className="mx-auto mb-2"/>Import Lectures</button></div>
      </motion.section>}
      {section === "attachments" && <motion.section key="attachments" {...panelMotion} className="space-y-4"><div className="flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Library</p><h2 className="text-xl font-bold">Attachments</h2></div><button onClick={()=>setAttachmentEditor({mode:"add",name:"",url:"",kind:"Link"})} className="flex items-center gap-2 rounded-xl bg-primary px-4 py-3 font-semibold text-primary-foreground"><Plus className="h-4 w-4"/>Add Attachment</button></div><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{attachments.map((a)=>{const Icon=attachmentIcon(a);return <SwipeRow key={a.id} onTap={()=>{setReviewedAttachments(v=>v.includes(a.id)?v:[...v,a.id]);window.open(a.url,"_blank","noopener,noreferrer")}} onSwipeLeft={()=>setAttachmentEditor({mode:"edit",id:a.id,name:a.name||a.type,url:a.url,kind:attachmentKind(a)})} leftLabel="Edit" leftIcon={Pencil} leftColor="hsl(var(--primary))" onSwipeRight={()=>setDeleteAttachmentId(a.id)} rightLabel="Delete" rightIcon={Trash2} rightColor="hsl(var(--destructive))"><GlassCard className="p-4 shadow-sm"><div className="flex items-start gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-xl bg-secondary/60"><Icon className="h-5 w-5"/></div><div className="min-w-0 flex-1"><p className="truncate font-semibold">{a.name||a.type}</p><p className="mt-1 text-xs text-muted-foreground">{attachmentKind(a)}</p></div>{reviewedAttachments.includes(a.id)&&<Check className="h-4 w-4 text-primary"/>}</div></GlassCard></SwipeRow>})}</div>{!attachments.length&&<GlassCard className="border-dashed border-2 p-10 text-center text-muted-foreground"><Paperclip className="mx-auto mb-3"/>No attachments yet.</GlassCard>}</motion.section>}
    </AnimatePresence>
    <input ref={lectureImportRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={(e)=>{importLectures(e.target.files?.[0]);e.target.value=""}}/>
    <input ref={questionImportRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={(e)=>{importQuestions(e.target.files?.[0]);e.target.value=""}}/>
    <input ref={flashcardImportRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={(e)=>{importFlashcards(e.target.files?.[0]);e.target.value=""}}/>
    <BottomSheet isOpen={!!importAction} onClose={()=>setImportAction(null)} title={importAction?.kind==="flashcard"?"Import Flashcards":"Import Questions"}><div className="space-y-3 pb-2"><p className="text-sm text-muted-foreground">Choose the matching Study Hub Excel file. The import is added to existing content.</p><button onClick={()=>importAction?.kind==="flashcard"?flashcardImportRef.current?.click():questionImportRef.current?.click()} className="flex w-full items-center gap-4 rounded-2xl border border-border bg-secondary/50 p-4 text-left"><Upload className="h-5 w-5 text-primary"/><div><p className="font-bold">Select Excel file</p><p className="text-xs text-muted-foreground">.xlsx or .xls</p></div></button></div></BottomSheet>
    <BottomSheet isOpen={!!attachmentEditor} onClose={()=>setAttachmentEditor(null)} title={attachmentEditor?.mode==="edit"?"Edit Attachment":"Add Attachment"}>{attachmentEditor&&<div className="space-y-4"><input value={attachmentEditor.name} onChange={(e)=>setAttachmentEditor({...attachmentEditor,name:e.target.value})} placeholder="Name" className="w-full rounded-xl border border-border bg-background px-4 py-3"/><input value={attachmentEditor.url} onChange={(e)=>setAttachmentEditor({...attachmentEditor,url:e.target.value})} placeholder="https://..." className="w-full rounded-xl border border-border bg-background px-4 py-3"/><div className="grid grid-cols-3 gap-2">{(["Image","Link","File"] as const).map(k=><button key={k} onClick={()=>setAttachmentEditor({...attachmentEditor,kind:k})} className={`rounded-xl py-3 font-semibold ${attachmentEditor.kind===k?"bg-primary text-primary-foreground":"bg-secondary"}`}>{k}</button>)}</div><button onClick={saveAttachment} className="w-full rounded-xl bg-primary py-3.5 font-semibold text-primary-foreground">Save Attachment</button></div>}</BottomSheet>
    <ConfirmSheet isOpen={!!deleteAttachmentId} onClose={()=>setDeleteAttachmentId(null)} onConfirm={()=>{if(deleteAttachmentId)deleteAttachment(subject.id,deleteAttachmentId);setDeleteAttachmentId(null)}} title="Delete attachment?" message="This removes the attachment from this subject." confirmLabel="Delete Attachment"/>
  </div>;
}
