import { useState, useRef } from "react";
import { focusNext } from "@/lib/focusNext";
import { useStudyData, AttachmentFormat, AttachmentPriority, AttachmentType, StudyType } from "@/hooks/useStudyData";
import { GlassCard } from "@/components/shared/GlassCard";
import { BottomSheet } from "@/components/shared/BottomSheet";
import { ConfirmSheet } from "@/components/shared/ConfirmSheet";
import { SwipeRow } from "@/components/shared/SwipeRow";
import { LectureCoverBadge } from "@/components/study/LectureCoverBadge";
import { parseLectureExcel } from "@/lib/excelImport";
import {
  Plus, Trash2, ArrowLeft, ExternalLink, BookOpen, FileText, Pencil,
  FolderOpen, BarChart2, Link2, Paperclip, Info, Layers, Brain, ChevronRight, CheckSquare,
  Upload, ChevronLeft, FileSpreadsheet,
} from "lucide-react";
import { Link, useRoute, useLocation, useSearch } from "wouter";
import { useForm } from "react-hook-form";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";

type Tab = "details" | "lectures" | "exams" | "attachments";

const ATTACHMENT_TYPES: AttachmentType[] = ['Study Sheet', 'Exam', 'Degree'];
const ATTACHMENT_FORMATS: AttachmentFormat[] = ['File', 'Image'];
const ATTACHMENT_PRIORITIES: AttachmentPriority[] = ['Important', 'Not Important'];

export function SubjectDetail() {
  const [, params] = useRoute("/subjects/:id");
  const [, setLocation] = useLocation();
  const {
    subjects,
    addLecture,
    addExam, deleteExam,
    deleteSubject, updateSubject,
    addAttachment, updateAttachment, deleteAttachment,
  } = useStudyData();

  const subject = subjects.find(s => s.id === params?.id);
  const search = useSearch();
  const initialTab = (new URLSearchParams(search).get('tab') ?? 'details') as Tab;

  const [activeTab, setActiveTab] = useState<Tab>(initialTab);
  const [lectureTypeTab, setLectureTypeTab] = useState<StudyType>("theoretical");
  const [examTypeTab, setExamTypeTab] = useState<StudyType>("theoretical");

  // State setup
  const [isAddLectureOpen, setIsAddLectureOpen] = useState(false);
  const [isAddExamOpen, setIsAddExamOpen] = useState(false);
  const [deletingExamId, setDeletingExamId] = useState<string | null>(null);

  const [isAddAttachmentOpen, setIsAddAttachmentOpen] = useState(false);
  const [editingAttachmentId, setEditingAttachmentId] = useState<string | null>(null);
  const [viewingAttachmentId, setViewingAttachmentId] = useState<string | null>(null);
  const [deletingAttachmentId, setDeletingAttachmentId] = useState<string | null>(null);
  const [attachType, setAttachType] = useState<AttachmentType>('Study Sheet');
  const [attachFormat, setAttachFormat] = useState<AttachmentFormat>('File');
  const [attachPriority, setAttachPriority] = useState<AttachmentPriority>('Important');

  const [isEditDriveLinkOpen, setIsEditDriveLinkOpen] = useState(false);
  const [isDeletingSubject, setIsDeletingSubject] = useState(false);

  // Lecture swipe → flashcards panel per-card
  const [flashcardsSheetLecId, setFlashcardsSheetLecId] = useState<string | null>(null);
  // Lecture Excel bulk-import
  const lectureImportRef = useRef<HTMLInputElement>(null);
  const [lectureImportSummary, setLectureImportSummary] = useState<{ imported: number; skipped: number } | null>(null);
  const [isImportingLectures, setIsImportingLectures] = useState(false);

  const lecForm = useForm({ defaultValues: { name: "", link: "" } });
  const examForm = useForm({ defaultValues: { name: "", link: "", date: "", weight: 1 } });
  const attachForm = useForm({ defaultValues: { url: "", name: "" } });
  const editAttachForm = useForm({ defaultValues: { url: "", name: "" } });
  const driveLinkForm = useForm({ defaultValues: { driveLink: "" } });

  if (!subject) {
    return <div className="p-8 text-center text-muted-foreground">Subject not found</div>;
  }

  const lecturesByType = {
    theoretical: subject.lectures.filter(l => l.type === "theoretical"),
    practical: subject.lectures.filter(l => l.type === "practical"),
  };
  const examsByType = {
    theoretical: subject.exams.filter(e => e.type === "theoretical"),
    practical: subject.exams.filter(e => e.type === "practical"),
  };
  const totalLectures = subject.lectures.length;
  const totalExams = subject.exams.length;
  const finishedExams = subject.exams.filter(e => e.checked).length;
  const progress = totalExams > 0 ? Math.round((finishedExams / totalExams) * 100) : 0;

  const visibleLectures = lecturesByType[lectureTypeTab];
  const visibleExams = examsByType[examTypeTab];

  const onAddLecture = (data: any) => {
    addLecture(subject.id, { name: data.name, link: data.link, type: lectureTypeTab });
    lecForm.reset();
    setIsAddLectureOpen(false);
  };

  const handleLectureImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsImportingLectures(true);
    try {
      const { rows, skipped } = await parseLectureExcel(file);
      for (const row of rows) {
        addLecture(subject.id, { name: row.name, link: row.link, type: lectureTypeTab });
      }
      setLectureImportSummary({ imported: rows.length, skipped });
    } catch {
      setLectureImportSummary({ imported: 0, skipped: -1 }); // -1 signals parse error
    } finally {
      setIsImportingLectures(false);
      e.target.value = "";
    }
  };

  const onAddExam = (data: any) => {
    addExam(subject.id, {
      name: data.name,
      link: "",
      date: data.date || null,
      grade: null,
      weight: parseFloat(data.weight) || 1,
      type: examTypeTab,
    });
    examForm.reset();
    setIsAddExamOpen(false);
  };

  const onAddAttachment = (data: any) => {
    if (!data.url.trim()) return;
    addAttachment(subject.id, {
      url: data.url.trim(),
      name: data.name?.trim() || undefined,
      type: attachType,
      format: attachFormat,
      priority: attachPriority,
    });
    attachForm.reset();
    setAttachType('Study Sheet');
    setAttachFormat('File');
    setAttachPriority('Important');
    setIsAddAttachmentOpen(false);
  };

  const openEditAttachment = (id: string) => {
    const att = (subject.attachments || []).find(a => a.id === id);
    if (!att) return;
    editAttachForm.reset({ url: att.url, name: att.name || "" });
    setAttachType(att.type);
    setAttachFormat(att.format);
    setAttachPriority(att.priority);
    setEditingAttachmentId(id);
  };

  const onEditAttachment = (data: any) => {
    if (!editingAttachmentId) return;
    updateAttachment(subject.id, editingAttachmentId, {
      url: data.url.trim(),
      name: data.name?.trim() || undefined,
      type: attachType,
      format: attachFormat,
      priority: attachPriority,
    });
    setEditingAttachmentId(null);
  };

  const openEditDriveLink = () => {
    driveLinkForm.reset({ driveLink: subject.driveLink || "" });
    setIsEditDriveLinkOpen(true);
  };

  const onEditDriveLink = (data: any) => {
    updateSubject(subject.id, { driveLink: data.driveLink || undefined });
    setIsEditDriveLinkOpen(false);
  };

  const handleDeleteSubject = () => {
    deleteSubject(subject.id);
    setLocation("/subjects");
  };

  const inputCls = "w-full bg-background border border-border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground";

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "details", label: "Details", icon: <Info className="w-3.5 h-3.5" /> },
    { id: "lectures", label: "Lectures", icon: <BookOpen className="w-3.5 h-3.5" /> },
    { id: "exams", label: "Exams", icon: <FileText className="w-3.5 h-3.5" /> },
    { id: "attachments", label: "Files", icon: <Paperclip className="w-3.5 h-3.5" /> },
  ];

  const TypeSegmented = ({ value, onChange }: { value: StudyType; onChange: (v: StudyType) => void; }) => (
    <div className="bg-secondary/40 border border-border/50 p-1.5 rounded-2xl flex gap-1 mb-4">
      {(["theoretical", "practical"] as StudyType[]).map(t => (
        <button
          key={t}
          onClick={() => onChange(t)}
          className={`flex-1 py-2.5 rounded-xl text-sm font-semibold capitalize transition-all ${
            value === t ? "bg-background text-foreground shadow-sm ring-1 ring-border/50" : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
          }`}
        >
          {t}
        </button>
      ))}
    </div>
  );

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/subjects" className="w-10 h-10 rounded-full bg-secondary/80 hover:bg-secondary flex items-center justify-center transition-colors shrink-0 border border-border/50 shadow-sm">
          <ArrowLeft className="w-5 h-5 text-muted-foreground" />
        </Link>
        <div className="flex-1 min-w-0 flex items-center gap-3">
          <div className="w-3.5 h-3.5 rounded-full shadow-sm shrink-0 bg-primary" />
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight truncate text-foreground">
            {subject.name}
          </h1>
        </div>
        <button
          onClick={() => setIsDeletingSubject(true)}
          className="w-10 h-10 rounded-full bg-secondary/80 hover:bg-destructive/10 text-muted-foreground hover:text-destructive flex items-center justify-center transition-colors shrink-0 border border-border/50 shadow-sm"
          title="Delete subject"
        >
          <Trash2 className="w-5 h-5" />
        </button>
      </div>

      {/* Tabs */}
      <div className="overflow-x-auto -mx-4 px-4 pb-0.5 scrollbar-hide">
        <div className="bg-secondary/40 p-1.5 rounded-2xl flex gap-1 w-max md:w-full border border-border/50">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 px-4 md:px-6 py-2.5 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all text-sm whitespace-nowrap ${
                activeTab === tab.id
                  ? "bg-card text-foreground shadow-sm ring-1 ring-border/50"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.15 }}
        >
          {/* DETAILS TAB */}
          {activeTab === "details" && (
            <div className="space-y-4">
              <SwipeRow
                onSwipeRight={openEditDriveLink}
                rightLabel="Edit" rightIcon={Pencil} rightColor="#6366f1"
                onSwipeLeft={subject.driveLink ? () => { window.location.href = subject.driveLink!; } : undefined}
                leftLabel="Open" leftIcon={ExternalLink} leftColor="#0ea5e9"
              >
                {subject.driveLink ? (
                  <div className="block">
                    <GlassCard className="p-5 border-border/60 hover:shadow-md transition-all bg-card">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-4 min-w-0">
                          <div className="w-11 h-11 rounded-[14px] bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20 text-primary">
                            <FolderOpen className="w-5 h-5" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-sm text-foreground">Google Drive Folder</p>
                            <p className="text-[10px] font-bold mt-0.5 text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Connected</p>
                          </div>
                        </div>
                        <ExternalLink className="w-4 h-4 shrink-0 text-muted-foreground/40" />
                      </div>
                      <p className="text-[10px] text-muted-foreground/60 font-bold uppercase tracking-wider mt-4 text-center">← Swipe left to open · swipe right to change link</p>
                    </GlassCard>
                  </div>
                ) : (
                  <button className="w-full text-left" onClick={openEditDriveLink}>
                    <GlassCard className="p-5 border-border/60 hover:shadow-md transition-all group bg-card">
                      <div className="flex items-center gap-4">
                        <div className="w-11 h-11 rounded-[14px] bg-secondary/50 group-hover:bg-secondary flex items-center justify-center shrink-0 border border-border/50 transition-colors">
                          <FolderOpen className="w-5 h-5 text-muted-foreground/50 group-hover:text-muted-foreground transition-colors" />
                        </div>
                        <div>
                          <p className="font-semibold text-sm text-foreground">Google Drive Folder</p>
                          <p className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1 font-medium">
                            <Link2 className="w-3 h-3" /> Tap to add a folder link
                          </p>
                        </div>
                      </div>
                    </GlassCard>
                  </button>
                )}
              </SwipeRow>

              <GlassCard className="p-6 border-border/60 bg-card">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 rounded-[14px] bg-secondary flex items-center justify-center shrink-0 border border-border/50">
                    <BarChart2 className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <span className="font-bold text-foreground">Progress</span>
                </div>

                <div className="mb-2">
                  <div className="flex items-end justify-between mb-3">
                    <span className="text-3xl font-bold tracking-tight text-foreground">{progress}%</span>
                    <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{finishedExams} / {totalExams} exams checked</span>
                  </div>
                  <div className="h-3 bg-secondary/50 border border-border/40 rounded-full overflow-hidden shadow-inner">
                    <div className="h-full rounded-full transition-all duration-500 bg-primary" style={{ width: `${progress}%` }} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mt-6">
                  <div className="bg-secondary/40 border border-border/50 rounded-2xl p-4 flex flex-col justify-center text-center">
                    <p className="text-3xl font-bold tracking-tight">{totalLectures}</p>
                    <p className="text-[10px] text-muted-foreground mt-1.5 font-bold uppercase tracking-widest">Lectures</p>
                    <p className="text-[10px] text-primary/80 font-medium mt-1">
                      {lecturesByType.theoretical.length} Theo / {lecturesByType.practical.length} Prac
                    </p>
                  </div>
                  <div className="bg-secondary/40 border border-border/50 rounded-2xl p-4 flex flex-col justify-center text-center">
                    <p className="text-3xl font-bold tracking-tight">{totalExams}</p>
                    <p className="text-[10px] text-muted-foreground mt-1.5 font-bold uppercase tracking-widest">Exams</p>
                    <p className="text-[10px] text-primary/80 font-medium mt-1">
                      {examsByType.theoretical.length} Theo / {examsByType.practical.length} Prac
                    </p>
                  </div>
                </div>
              </GlassCard>
            </div>
          )}

          {/* LECTURES TAB */}
          {activeTab === "lectures" && (
            <div className="space-y-4">
              <TypeSegmented value={lectureTypeTab} onChange={setLectureTypeTab} />

              {visibleLectures.length === 0 ? (
                <GlassCard className="p-10 text-center text-muted-foreground border-dashed border-2 bg-transparent shadow-none">
                  <div className="w-12 h-12 rounded-[16px] bg-secondary/50 mx-auto flex items-center justify-center mb-4">
                    <BookOpen className="w-6 h-6 opacity-40" />
                  </div>
                  <p className="font-medium">No {lectureTypeTab} lectures yet</p>
                </GlassCard>
              ) : (
                <div className="space-y-3">
                  {visibleLectures.map(lec => (
                    <SwipeRow
                      key={lec.id}
                      onTap={() => setLocation(`/subjects/${subject.id}/lectures/${lec.id}`)}
                      onSwipeRight={() => setFlashcardsSheetLecId(lec.id)}
                      rightLabel="Flashcards" rightIcon={Layers} rightColor="#6366f1"
                      onSwipeLeft={() => setLocation(`/subjects/${subject.id}/lectures/${lec.id}/study`)}
                      leftLabel="Study" leftIcon={Brain} leftColor="#10b981"
                    >
                      <GlassCard className="p-4 flex items-center gap-4 cursor-pointer hover:shadow-md transition-all border-border/60 hover:border-border bg-card group">
                        <div className="w-10 h-10 rounded-[14px] bg-secondary flex items-center justify-center shrink-0 border border-border/50 text-muted-foreground group-hover:text-foreground transition-colors">
                          <BookOpen className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm truncate text-foreground">{lec.name}</p>
                          {lec.link && (
                            <span className="text-[11px] flex items-center gap-1 mt-0.5 text-primary/80 font-medium">
                              <Link2 className="w-3 h-3" /> Drive link set
                            </span>
                          )}
                        </div>
                        <LectureCoverBadge percentage={lec.readerLastPercentage} />
                        {/* Desktop arrow shortcuts */}
                        <div className="hidden md:flex items-center gap-1 ml-1 shrink-0">
                          <button
                            onClick={e => { e.stopPropagation(); setFlashcardsSheetLecId(lec.id); }}
                            className="p-1.5 rounded-lg hover:bg-indigo-500/15 text-muted-foreground hover:text-indigo-500 transition-colors"
                            title="Flashcards"
                          >
                            <Layers className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted-foreground/40 shrink-0 ml-1 md:hidden" />
                      </GlassCard>
                    </SwipeRow>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <button
                  onClick={() => setIsAddLectureOpen(true)}
                  className="flex-1 border-2 border-dashed border-border/60 rounded-2xl p-4 text-muted-foreground hover:text-foreground hover:border-foreground/30 hover:bg-secondary/20 transition-all flex items-center justify-center gap-2 font-semibold shadow-sm"
                >
                  <Plus className="w-4 h-4" /> Add {lectureTypeTab === "theoretical" ? "Theoretical" : "Practical"} Lecture
                </button>
                <button
                  onClick={() => lectureImportRef.current?.click()}
                  disabled={isImportingLectures}
                  className="border-2 border-dashed border-border/60 rounded-2xl px-4 py-4 text-muted-foreground hover:text-foreground hover:border-indigo-400/50 hover:bg-indigo-500/5 transition-all flex items-center justify-center gap-2 font-semibold shadow-sm shrink-0 disabled:opacity-50"
                  title="Upload Lectures from Excel/CSV"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span className="hidden sm:inline">Import</span>
                </button>
              </div>
              {/* Hidden file input for lecture import */}
              <input
                ref={lectureImportRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={handleLectureImport}
              />
            </div>
          )}

          {/* EXAMS TAB */}
          {activeTab === "exams" && (
            <div className="space-y-4">
              <TypeSegmented value={examTypeTab} onChange={setExamTypeTab} />

              {visibleExams.length === 0 ? (
                <GlassCard className="p-10 text-center text-muted-foreground border-dashed border-2 bg-transparent shadow-none">
                  <div className="w-12 h-12 rounded-full bg-secondary/50 mx-auto flex items-center justify-center mb-4">
                    <FileText className="w-6 h-6 opacity-40" />
                  </div>
                  <p className="font-medium">No {examTypeTab} exams yet</p>
                </GlassCard>
              ) : (
                <div className="space-y-3">
                  {visibleExams.map(exam => {
                    const isChecked = !!exam.checked;
                    return (
                      <SwipeRow
                        key={exam.id}
                        onTap={() => setLocation(`/subjects/${subject.id}/exams/${exam.id}/take`)}
                        onSwipeRight={() => setDeletingExamId(exam.id)}
                        rightLabel="Delete" rightIcon={Trash2} rightColor="#ef4444"
                        onSwipeLeft={() => setLocation(`/subjects/${subject.id}/exams/${exam.id}/edit`)}
                        leftLabel="Edit" leftIcon={Pencil} leftColor="#6366f1"
                      >
                        <GlassCard className={`p-4 cursor-pointer transition-all border group  ${isChecked ? 'bg-secondary/10 border-border/40' : 'bg-card border-border/60 hover:border-border hover:shadow-md'}`}>
                          <div className="flex items-center gap-4">
                            <div className={`w-10 h-10 rounded-[14px] flex items-center justify-center shrink-0 border transition-colors ${isChecked ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400' : 'bg-secondary border-border/50 text-muted-foreground group-hover:text-foreground'}`}>
                              {isChecked ? <CheckSquare className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={`font-semibold text-sm truncate ${isChecked ? 'text-foreground/70' : 'text-foreground'}`}>{exam.name}</p>
                              <div className="flex items-center gap-2 mt-1">
                                {exam.date && (
                                  <>
                                    <span className="text-[10px] font-bold text-muted-foreground tracking-wider uppercase">
                                      {format(new Date(exam.date), "MMM d, yyyy")}
                                    </span>
                                    <span className="w-1 h-1 rounded-full bg-border" />
                                  </>
                                )}
                                <span className="text-[10px] font-bold text-muted-foreground tracking-wider uppercase">
                                  {(exam.questions || []).length} Qs
                                </span>
                              </div>
                            </div>
                            {exam.lastScore ? (
                              <div className={`px-2.5 py-1 rounded-full text-[11px] font-bold flex items-center gap-1.5 border shadow-sm ${isChecked ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"}`}>
                                {exam.lastScore.percentage}%
                              </div>
                            ) : (
                              <div className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-secondary text-muted-foreground shrink-0 border border-border/50 uppercase tracking-wider">
                                Not taken
                              </div>
                            )}
                          </div>
                        </GlassCard>
                      </SwipeRow>
                    );
                  })}
                </div>
              )}
              <button
                onClick={() => setIsAddExamOpen(true)}
                className="w-full border-2 border-dashed border-border/60 rounded-2xl p-4 text-muted-foreground hover:text-foreground hover:border-foreground/30 hover:bg-secondary/20 transition-all flex items-center justify-center gap-2 font-semibold shadow-sm"
              >
                <Plus className="w-4 h-4" /> Add {examTypeTab === "theoretical" ? "Theoretical" : "Practical"} Exam
              </button>
            </div>
          )}

          {/* ATTACHMENTS TAB */}
          {activeTab === "attachments" && (
            <div className="space-y-4">
              {(subject.attachments || []).length === 0 ? (
                <GlassCard className="p-10 text-center text-muted-foreground border-dashed border-2 bg-transparent shadow-none">
                  <div className="w-12 h-12 rounded-full bg-secondary/50 mx-auto flex items-center justify-center mb-4">
                    <Paperclip className="w-6 h-6 opacity-40" />
                  </div>
                  <p className="font-medium">No attachments yet</p>
                  <p className="text-sm mt-1 opacity-70">Add links with tags</p>
                </GlassCard>
              ) : (
                <div className="space-y-3">
                  {(subject.attachments || []).map(att => (
                    <SwipeRow
                      key={att.id}
                      onTap={() => setViewingAttachmentId(att.id)}
                      onSwipeRight={() => setDeletingAttachmentId(att.id)}
                      rightLabel="Delete" rightIcon={Trash2} rightColor="#ef4444"
                      onSwipeLeft={() => openEditAttachment(att.id)}
                      leftLabel="Edit" leftIcon={Pencil} leftColor="#6366f1"
                    >
                      <GlassCard className="p-4 cursor-pointer hover:shadow-md transition-all border-border/60 hover:border-border bg-card ">
                        <div className="flex items-start gap-4">
                          <div className="w-10 h-10 rounded-[14px] bg-secondary flex items-center justify-center shrink-0 border border-border/50 text-muted-foreground">
                            <Paperclip className="w-5 h-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            {att.name && <p className="font-semibold text-sm truncate mb-0.5 text-foreground">{att.name}</p>}
                            <p className="text-[11px] truncate text-primary/80 font-medium">{att.url}</p>
                            <div className="flex flex-wrap gap-1.5 mt-2.5">
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-secondary text-secondary-foreground border border-border/50 uppercase tracking-wider">
                                {att.type}
                              </span>
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-secondary text-secondary-foreground border border-border/50 uppercase tracking-wider">
                                {att.format}
                              </span>
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wider flex items-center gap-1 ${att.priority === "Important" ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20" : "bg-secondary text-muted-foreground border-border/50"}`}>
                                {att.priority === "Important" && <span className="w-1 h-1 rounded-full bg-rose-500" />}
                                {att.priority}
                              </span>
                            </div>
                          </div>
                        </div>
                      </GlassCard>
                    </SwipeRow>
                  ))}
                </div>
              )}
              <button
                onClick={() => setIsAddAttachmentOpen(true)}
                className="w-full border-2 border-dashed border-border/60 rounded-2xl p-4 text-muted-foreground hover:text-foreground hover:border-foreground/30 hover:bg-secondary/20 transition-all flex items-center justify-center gap-2 font-semibold shadow-sm"
              >
                <Plus className="w-4 h-4" /> Add Attachment
              </button>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* MODALS */}

      {/* Flashcards panel — opens when swiping right on a lecture card */}
      <BottomSheet
        isOpen={!!flashcardsSheetLecId}
        onClose={() => setFlashcardsSheetLecId(null)}
        title="Flashcards"
      >
        <div className="space-y-3 pb-2">
          <button
            onClick={() => { setLocation(`/subjects/${subject.id}/lectures/${flashcardsSheetLecId}/flashcards`); setFlashcardsSheetLecId(null); }}
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
            onClick={() => { setLocation(`/subjects/${subject.id}/lectures/${flashcardsSheetLecId}/flashcards`); setFlashcardsSheetLecId(null); }}
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

      {/* Lecture import summary */}
      <BottomSheet
        isOpen={!!lectureImportSummary}
        onClose={() => setLectureImportSummary(null)}
        title="Import Complete"
      >
        <div className="space-y-5 pb-4">
          {lectureImportSummary?.skipped === -1 ? (
            <p className="text-destructive font-medium text-center">Could not parse the file. Make sure it's a valid Excel or CSV with Name and Link columns.</p>
          ) : (
            <>
              <p className="text-center text-foreground">
                <span className="text-3xl font-bold text-primary">{lectureImportSummary?.imported}</span>
                <span className="block text-sm text-muted-foreground mt-1">lectures imported</span>
              </p>
              {(lectureImportSummary?.skipped ?? 0) > 0 && (
                <p className="text-center text-sm text-muted-foreground">
                  {lectureImportSummary?.skipped} row{lectureImportSummary?.skipped !== 1 ? "s" : ""} skipped — missing Name or Link
                </p>
              )}
            </>
          )}
          <button
            onClick={() => setLectureImportSummary(null)}
            className="w-full bg-primary text-primary-foreground font-semibold rounded-xl py-3"
          >
            Done
          </button>
        </div>
      </BottomSheet>

      <BottomSheet isOpen={isAddLectureOpen} onClose={() => setIsAddLectureOpen(false)} title={`New ${lectureTypeTab === "theoretical" ? "Theoretical" : "Practical"} Lecture`}>
        <form onSubmit={lecForm.handleSubmit(onAddLecture)} className="space-y-5">
          <div>
            <label className="block text-sm font-medium mb-2">Lecture Name</label>
            <input {...lecForm.register("name", { required: true })} className={inputCls} placeholder="e.g. Chapter 3" onKeyDown={focusNext} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Link <span className="text-muted-foreground font-normal">(optional)</span></label>
            <input {...lecForm.register("link")} className={inputCls} placeholder="https://..." />
          </div>
          <button type="submit" className="w-full bg-primary text-primary-foreground font-semibold rounded-xl py-3.5 transition-opacity hover:opacity-90">Add Lecture</button>
        </form>
      </BottomSheet>

      <BottomSheet isOpen={isAddExamOpen} onClose={() => setIsAddExamOpen(false)} title={`New ${examTypeTab === "theoretical" ? "Theoretical" : "Practical"} Exam`}>
        <form onSubmit={examForm.handleSubmit(onAddExam)} className="space-y-5">
          <div>
            <label className="block text-sm font-medium mb-2">Exam Name</label>
            <input {...examForm.register("name", { required: true })} className={inputCls} placeholder="e.g. Midterm" onKeyDown={focusNext} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Weight</label>
            <input type="number" step="0.1" {...examForm.register("weight", { required: true, min: 0 })} className={inputCls} placeholder="1.0" />
          </div>
          <button type="submit" className="w-full bg-primary text-primary-foreground font-semibold rounded-xl py-3.5 transition-opacity hover:opacity-90">Add Exam</button>
        </form>
      </BottomSheet>

      <ConfirmSheet
        isOpen={!!deletingExamId} onClose={() => setDeletingExamId(null)}
        onConfirm={() => { if (deletingExamId) { deleteExam(subject.id, deletingExamId); setDeletingExamId(null); } }}
        title="Delete exam?" message="This will permanently delete this exam and its score." confirmLabel="Delete Exam"
      />

      <BottomSheet isOpen={isAddAttachmentOpen} onClose={() => setIsAddAttachmentOpen(false)} title="Add Attachment">
        <form onSubmit={attachForm.handleSubmit(onAddAttachment)} className="space-y-5">
          <div>
            <label className="block text-sm font-medium mb-2">URL or Link</label>
            <input {...attachForm.register("url", { required: true })} className={inputCls} placeholder="https://..." onKeyDown={focusNext} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Name <span className="text-muted-foreground font-normal">(optional)</span></label>
            <input {...attachForm.register("name")} className={inputCls} placeholder="e.g. Formulas PDF" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Type</label>
              <select value={attachType} onChange={e => setAttachType(e.target.value as any)} className={`${inputCls} appearance-none`}>
                {ATTACHMENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Format</label>
              <select value={attachFormat} onChange={e => setAttachFormat(e.target.value as any)} className={`${inputCls} appearance-none`}>
                {ATTACHMENT_FORMATS.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Priority</label>
            <select value={attachPriority} onChange={e => setAttachPriority(e.target.value as any)} className={`${inputCls} appearance-none`}>
              {ATTACHMENT_PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <button type="submit" className="w-full bg-primary text-primary-foreground font-semibold rounded-xl py-3.5 transition-opacity hover:opacity-90">Add Attachment</button>
        </form>
      </BottomSheet>

      <BottomSheet isOpen={!!editingAttachmentId} onClose={() => setEditingAttachmentId(null)} title="Edit Attachment">
        <form onSubmit={editAttachForm.handleSubmit(onEditAttachment)} className="space-y-5">
          <div>
            <label className="block text-sm font-medium mb-2">URL or Link</label>
            <input {...editAttachForm.register("url", { required: true })} className={inputCls} onKeyDown={focusNext} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Name <span className="text-muted-foreground font-normal">(optional)</span></label>
            <input {...editAttachForm.register("name")} className={inputCls} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Type</label>
              <select value={attachType} onChange={e => setAttachType(e.target.value as any)} className={`${inputCls} appearance-none`}>
                {ATTACHMENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Format</label>
              <select value={attachFormat} onChange={e => setAttachFormat(e.target.value as any)} className={`${inputCls} appearance-none`}>
                {ATTACHMENT_FORMATS.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Priority</label>
            <select value={attachPriority} onChange={e => setAttachPriority(e.target.value as any)} className={`${inputCls} appearance-none`}>
              {ATTACHMENT_PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <button type="submit" className="w-full bg-primary text-primary-foreground font-semibold rounded-xl py-3.5 transition-opacity hover:opacity-90">Save Changes</button>
        </form>
      </BottomSheet>

      <ConfirmSheet
        isOpen={!!deletingAttachmentId} onClose={() => setDeletingAttachmentId(null)}
        onConfirm={() => { if (deletingAttachmentId) { deleteAttachment(subject.id, deletingAttachmentId); setDeletingAttachmentId(null); } }}
        title="Delete attachment?" message="This will permanently remove the link." confirmLabel="Delete Attachment"
      />

      <BottomSheet isOpen={!!viewingAttachmentId} onClose={() => setViewingAttachmentId(null)} title="View Attachment">
        <div className="space-y-6 pt-2 pb-4">
          <p className="text-center text-muted-foreground text-sm">To open this link, tap below. The app will open it in a new tab or the native app if supported.</p>
          <button
            onClick={() => {
              const att = (subject.attachments || []).find(a => a.id === viewingAttachmentId);
              if (att && att.url) {
                let url = att.url;
                if (!url.startsWith('http')) url = 'https://' + url;
                window.open(url, "_blank", "noopener,noreferrer");
              }
              setViewingAttachmentId(null);
            }}
            className="w-full bg-primary text-primary-foreground font-semibold rounded-xl py-3.5 flex items-center justify-center gap-2"
          >
            Open Link <ExternalLink className="w-4 h-4" />
          </button>
        </div>
      </BottomSheet>

      <BottomSheet isOpen={isEditDriveLinkOpen} onClose={() => setIsEditDriveLinkOpen(false)} title="Google Drive Folder">
        <form onSubmit={driveLinkForm.handleSubmit(onEditDriveLink)} className="space-y-5">
          <div>
            <label className="block text-sm font-medium mb-2">Folder Link</label>
            <input {...driveLinkForm.register("driveLink")} className={inputCls} placeholder="https://drive.google.com/..." />
            <p className="text-xs text-muted-foreground mt-2">Leave blank to remove the connection.</p>
          </div>
          <button type="submit" className="w-full bg-primary text-primary-foreground font-semibold rounded-xl py-3.5">Save Link</button>
        </form>
      </BottomSheet>

      <ConfirmSheet
        isOpen={isDeletingSubject} onClose={() => setIsDeletingSubject(false)}
        onConfirm={handleDeleteSubject}
        title="Delete subject?" message="This will move the subject, along with its lectures, exams, and linked tasks, to the Archive." confirmLabel="Move to Archive"
      />
    </div>
  );
}
