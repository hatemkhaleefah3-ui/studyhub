import { useState } from "react";
import { focusNext } from "@/lib/focusNext";
import { useStudyData, Attachment, AttachmentFormat, AttachmentPriority, AttachmentType, StudyType } from "@/hooks/useStudyData";
import { GlassCard } from "@/components/shared/GlassCard";
import { BottomSheet } from "@/components/shared/BottomSheet";
import { ConfirmSheet } from "@/components/shared/ConfirmSheet";
import { SwipeRow } from "@/components/shared/SwipeRow";
import { LectureCoverBadge } from "@/components/study/LectureCoverBadge";
import {
  Plus, Trash2, ArrowLeft, ExternalLink, BookOpen, FileText, Pencil,
  FolderOpen, BarChart2, Link2, Paperclip, Info, Layers, Brain, ChevronRight,
} from "lucide-react";
import { Link, useRoute, useLocation } from "wouter";
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

  const [activeTab, setActiveTab] = useState<Tab>("details");
  const [lectureTypeTab, setLectureTypeTab] = useState<StudyType>("theoretical");
  const [examTypeTab, setExamTypeTab] = useState<StudyType>("theoretical");

  // Lecture state
  const [isAddLectureOpen, setIsAddLectureOpen] = useState(false);

  // Exam state
  const [isAddExamOpen, setIsAddExamOpen] = useState(false);
  const [deletingExamId, setDeletingExamId] = useState<string | null>(null);

  // Attachment state
  const [isAddAttachmentOpen, setIsAddAttachmentOpen] = useState(false);
  const [editingAttachmentId, setEditingAttachmentId] = useState<string | null>(null);
  const [viewingAttachmentId, setViewingAttachmentId] = useState<string | null>(null);
  const [deletingAttachmentId, setDeletingAttachmentId] = useState<string | null>(null);
  const [attachType, setAttachType] = useState<AttachmentType>('Study Sheet');
  const [attachFormat, setAttachFormat] = useState<AttachmentFormat>('File');
  const [attachPriority, setAttachPriority] = useState<AttachmentPriority>('Important');

  // Details edit state — Drive link only; lecture/exam counts are now computed live.
  const [isEditDriveLinkOpen, setIsEditDriveLinkOpen] = useState(false);

  // Confirm delete subject
  const [isDeletingSubject, setIsDeletingSubject] = useState(false);

  const lecForm = useForm({ defaultValues: { name: "", link: "" } });
  const examForm = useForm({ defaultValues: { name: "", link: "", date: "", weight: 1 } });
  const attachForm = useForm({ defaultValues: { url: "", name: "" } });
  const editAttachForm = useForm({ defaultValues: { url: "", name: "" } });
  const driveLinkForm = useForm({ defaultValues: { driveLink: "" } });

  if (!subject) {
    return <div className="p-8 text-center text-muted-foreground">Subject not found</div>;
  }

  const accentColor = subject.color;

  // ── Computed counts (live, not stored fields — spec 1.2) ─────────────────
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

  // ─── Lecture handlers ────────────────────────────────────────────────────
  const onAddLecture = (data: any) => {
    addLecture(subject.id, { name: data.name, link: data.link, type: lectureTypeTab });
    lecForm.reset();
    setIsAddLectureOpen(false);
  };

  // ─── Exam handlers ────────────────────────────────────────────────────────
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

  // ─── Attachment handlers ──────────────────────────────────────────────────
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

  // ─── Details handlers ─────────────────────────────────────────────────────
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

  const inputCls =
    "w-full bg-background border border-border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground";


  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "details", label: "Details", icon: <Info className="w-3.5 h-3.5" /> },
    { id: "lectures", label: "Lectures", icon: <BookOpen className="w-3.5 h-3.5" /> },
    { id: "exams", label: "Exams", icon: <FileText className="w-3.5 h-3.5" /> },
    { id: "attachments", label: "Files", icon: <Paperclip className="w-3.5 h-3.5" /> },
  ];

  const TagButton = ({
    active,
    onClick,
    children,
  }: {
    active: boolean;
    onClick: () => void;
    children: React.ReactNode;
  }) => (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
        active ? "text-white" : "bg-secondary/60 text-muted-foreground hover:bg-secondary"
      }`}
      style={active ? { backgroundColor: accentColor } : {}}
    >
      {children}
    </button>
  );

  const TypeSegmented = ({
    value,
    onChange,
  }: {
    value: StudyType;
    onChange: (v: StudyType) => void;
  }) => (
    <div className="bg-secondary/50 p-1 rounded-xl flex gap-1 mb-3">
      {(["theoretical", "practical"] as StudyType[]).map(t => (
        <button
          key={t}
          onClick={() => onChange(t)}
          className={`flex-1 py-2 rounded-lg text-sm font-semibold capitalize transition-all ${
            value === t ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"
          }`}
          style={value === t ? { color: accentColor } : {}}
        >
          {t}
        </button>
      ))}
    </div>
  );

  return (
    <div className="space-y-6 pb-20">
      {/* ─── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <Link
          href="/subjects"
          className="p-2 rounded-full bg-secondary hover:bg-secondary/80 transition-colors shrink-0"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1 min-w-0">
          <h1
            className="text-2xl md:text-3xl font-bold tracking-tight truncate"
            style={{ color: accentColor }}
          >
            {subject.name}
          </h1>
        </div>
        <button
          onClick={() => setIsDeletingSubject(true)}
          className="p-2 rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors shrink-0"
          title="Delete subject"
        >
          <Trash2 className="w-5 h-5" />
        </button>
      </div>

      {/* ─── Tabs ───────────────────────────────────────────────────────────── */}
      <div className="overflow-x-auto -mx-4 px-4 pb-0.5">
        <div className="bg-secondary/50 p-1.5 rounded-2xl flex gap-1 w-max md:w-full">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 px-3 md:px-5 py-2 rounded-xl font-semibold flex items-center justify-center gap-1.5 transition-all text-sm whitespace-nowrap ${
                activeTab === tab.id
                  ? "bg-background shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              style={activeTab === tab.id ? { color: accentColor } : {}}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ─── Tab Content ────────────────────────────────────────────────────── */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.15 }}
        >
          {/* ── DETAILS TAB ─────────────────────────────────────────────────── */}
          {activeTab === "details" && (
            <div className="space-y-4">
              {/* Drive Link card — tap or swipe left to open, swipe right to edit */}
              <SwipeRow
                onTap={() => {
                  if (subject.driveLink) window.open(subject.driveLink, "_blank", "noreferrer");
                  else openEditDriveLink();
                }}
                onSwipeLeft={() => subject.driveLink && window.open(subject.driveLink, "_blank", "noreferrer")}
                leftLabel="Open"
                leftIcon={ExternalLink}
                leftColor={accentColor}
                onSwipeRight={openEditDriveLink}
                rightLabel="Edit"
                rightIcon={Pencil}
                rightColor="#6366f1"
              >
                <GlassCard className="p-5">
                  <div className="flex items-center gap-2.5 mb-3">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                      style={{ backgroundColor: `${accentColor}20` }}
                    >
                      <FolderOpen className="w-4 h-4" style={{ color: accentColor }} />
                    </div>
                    <span className="font-semibold">Google Drive Folder</span>
                  </div>
                  {subject.driveLink ? (
                    <p className="flex items-center gap-2 text-sm font-medium truncate" style={{ color: accentColor }}>
                      <ExternalLink className="w-4 h-4 shrink-0" />
                      <span className="truncate">{subject.driveLink}</span>
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                      <Link2 className="w-3.5 h-3.5" /> Swipe right to add a folder link
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-2">
                    Swipe left to open &middot; swipe right to edit
                  </p>
                </GlassCard>
              </SwipeRow>

              {/* Progress card */}
              <GlassCard className="p-5">
                <div className="flex items-center gap-2.5 mb-4">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                    style={{ backgroundColor: `${accentColor}20` }}
                  >
                    <BarChart2 className="w-4 h-4" style={{ color: accentColor }} />
                  </div>
                  <span className="font-semibold">Progress</span>
                </div>

                <div className="mb-1">
                  <div className="flex items-end justify-between mb-2">
                    <span className="text-3xl font-bold" style={{ color: accentColor }}>
                      {progress}%
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {finishedExams} / {totalExams} exams checked
                    </span>
                  </div>
                  <div className="h-2.5 bg-secondary rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${progress}%`, backgroundColor: accentColor }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mt-5">
                  <div className="bg-secondary/50 rounded-xl p-3">
                    <p className="text-2xl font-bold text-center">{totalLectures}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 font-medium uppercase tracking-wide text-center">
                      Lectures
                    </p>
                    <p className="text-xs text-muted-foreground text-center mt-1">
                      {lecturesByType.theoretical.length} Theoretical / {lecturesByType.practical.length} Practical
                    </p>
                  </div>
                  <div className="bg-secondary/50 rounded-xl p-3">
                    <p className="text-2xl font-bold text-center">{totalExams}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 font-medium uppercase tracking-wide text-center">
                      Exams
                    </p>
                    <p className="text-xs text-muted-foreground text-center mt-1">
                      {examsByType.theoretical.length} Theoretical / {examsByType.practical.length} Practical
                    </p>
                  </div>
                </div>
              </GlassCard>
            </div>
          )}

          {/* ── LECTURES TAB ─────────────────────────────────────────────────── */}
          {activeTab === "lectures" && (
            <div className="space-y-3">
              <TypeSegmented value={lectureTypeTab} onChange={setLectureTypeTab} />

              {visibleLectures.length === 0 ? (
                <GlassCard className="p-10 text-center text-muted-foreground border-dashed border-2 bg-transparent">
                  <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">No {lectureTypeTab} lectures yet</p>
                </GlassCard>
              ) : (
                visibleLectures.map(lec => (
                  <SwipeRow
                    key={lec.id}
                    onTap={() => setLocation(`/subjects/${subject.id}/lectures/${lec.id}`)}
                    onSwipeRight={() => setLocation(`/subjects/${subject.id}/lectures/${lec.id}/flashcards`)}
                    rightLabel="Flashcards"
                    rightIcon={Layers}
                    rightColor="#6366f1"
                    onSwipeLeft={() => setLocation(`/subjects/${subject.id}/lectures/${lec.id}/study`)}
                    leftLabel="Study"
                    leftIcon={Brain}
                    leftColor="#0ea5e9"
                  >
                    <GlassCard className="p-4 flex items-center gap-3 cursor-pointer">
                      <div
                        className="w-8 h-8 rounded-lg shrink-0 flex items-center justify-center"
                        style={{ backgroundColor: `${accentColor}20` }}
                      >
                        <BookOpen className="w-4 h-4" style={{ color: accentColor }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold truncate">{lec.name}</p>
                        {lec.link && (
                          <span className="text-xs flex items-center gap-1 mt-0.5" style={{ color: accentColor }}>
                            <ExternalLink className="w-3 h-3" /> Has material link
                          </span>
                        )}
                      </div>
                      <LectureCoverBadge percentage={lec.readerLastPercentage} />
                      <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                    </GlassCard>
                  </SwipeRow>
                ))
              )}
              <button
                onClick={() => setIsAddLectureOpen(true)}
                className="w-full border-2 border-dashed border-border rounded-2xl p-4 text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-all flex items-center justify-center gap-2 font-medium"
              >
                <Plus className="w-4 h-4" /> Add {lectureTypeTab === "theoretical" ? "Theoretical" : "Practical"} Lecture
              </button>
            </div>
          )}

          {/* ── EXAMS TAB ────────────────────────────────────────────────────── */}
          {activeTab === "exams" && (
            <div className="space-y-3">
              <TypeSegmented value={examTypeTab} onChange={setExamTypeTab} />

              {visibleExams.length === 0 ? (
                <GlassCard className="p-10 text-center text-muted-foreground border-dashed border-2 bg-transparent">
                  <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">No {examTypeTab} exams yet</p>
                </GlassCard>
              ) : (
                visibleExams.map(exam => {
                  const isChecked = !!exam.checked;
                  return (
                    <SwipeRow
                      key={exam.id}
                      onTap={() => setLocation(`/subjects/${subject.id}/exams/${exam.id}/take`)}
                      onSwipeRight={() => setDeletingExamId(exam.id)}
                      rightLabel="Delete"
                      rightIcon={Trash2}
                      rightColor="#ef4444"
                      onSwipeLeft={() => setLocation(`/subjects/${subject.id}/exams/${exam.id}/edit`)}
                      leftLabel="Edit"
                      leftIcon={Pencil}
                      leftColor="#6366f1"
                    >
                      <GlassCard className="p-4 cursor-pointer">
                        <div className="flex items-start gap-3">
                          <div
                            className="w-8 h-8 rounded-lg shrink-0 flex items-center justify-center mt-0.5"
                            style={{ backgroundColor: isChecked ? `${accentColor}20` : undefined }}
                          >
                            <FileText className="w-4 h-4" style={{ color: isChecked ? accentColor : undefined }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold truncate">{exam.name}</p>
                            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
                              {exam.date && (
                                <span className="text-xs text-muted-foreground">
                                  {format(new Date(exam.date), "MMM d, yyyy")}
                                </span>
                              )}
                              <span className="text-xs text-muted-foreground">
                                {(exam.questions || []).length} question{(exam.questions || []).length === 1 ? "" : "s"}
                              </span>
                            </div>
                          </div>
                          {exam.lastScore ? (
                            <span
                              className="px-2.5 py-0.5 rounded-md text-xs font-bold text-white shrink-0"
                              style={{ backgroundColor: isChecked ? accentColor : "#eab308" }}
                            >
                              {exam.lastScore.percentage}%
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 rounded-md text-xs font-medium bg-secondary text-muted-foreground shrink-0">
                              Not taken
                            </span>
                          )}
                        </div>
                      </GlassCard>
                    </SwipeRow>
                  );
                })
              )}
              <button
                onClick={() => setIsAddExamOpen(true)}
                className="w-full border-2 border-dashed border-border rounded-2xl p-4 text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-all flex items-center justify-center gap-2 font-medium"
              >
                <Plus className="w-4 h-4" /> Add {examTypeTab === "theoretical" ? "Theoretical" : "Practical"} Exam
              </button>
            </div>
          )}

          {/* ── ATTACHMENTS ("Files") TAB ────────────────────────────────────── */}
          {activeTab === "attachments" && (
            <div className="space-y-3">
              {(subject.attachments || []).length === 0 ? (
                <GlassCard className="p-10 text-center text-muted-foreground border-dashed border-2 bg-transparent">
                  <Paperclip className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">No attachments yet</p>
                  <p className="text-sm mt-1 opacity-70">Add Telegram links with tags</p>
                </GlassCard>
              ) : (
                (subject.attachments || []).map(att => (
                  <SwipeRow
                    key={att.id}
                    onTap={() => setViewingAttachmentId(att.id)}
                    onSwipeRight={() => setDeletingAttachmentId(att.id)}
                    rightLabel="Delete"
                    rightIcon={Trash2}
                    rightColor="#ef4444"
                    onSwipeLeft={() => openEditAttachment(att.id)}
                    leftLabel="Edit"
                    leftIcon={Pencil}
                    leftColor="#6366f1"
                  >
                    <GlassCard className="p-4 cursor-pointer">
                      <div className="flex items-start gap-3">
                        <div
                          className="w-8 h-8 rounded-lg shrink-0 flex items-center justify-center mt-0.5"
                          style={{ backgroundColor: `${accentColor}20` }}
                        >
                          <Paperclip className="w-4 h-4" style={{ color: accentColor }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          {att.name && (
                            <p className="font-semibold text-sm truncate mb-0.5">{att.name}</p>
                          )}
                          <p className="text-xs truncate" style={{ color: accentColor }}>{att.url}</p>
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            <span
                              className="px-2 py-0.5 rounded-md text-xs font-medium text-white"
                              style={{ backgroundColor: accentColor }}
                            >
                              {att.type}
                            </span>
                            <span className="px-2 py-0.5 rounded-md text-xs font-medium bg-secondary text-foreground">
                              {att.format}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded-md text-xs font-medium ${
                                att.priority === "Important"
                                  ? "bg-orange-500/15 text-orange-600 dark:text-orange-400"
                                  : "bg-secondary text-muted-foreground"
                              }`}
                            >
                              {att.priority}
                            </span>
                          </div>
                        </div>
                      </div>
                    </GlassCard>
                  </SwipeRow>
                ))
              )}
              <button
                onClick={() => setIsAddAttachmentOpen(true)}
                className="w-full border-2 border-dashed border-border rounded-2xl p-4 text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-all flex items-center justify-center gap-2 font-medium"
              >
                <Plus className="w-4 h-4" /> Add Attachment
              </button>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* ═══════════════ MODALS ═══════════════ */}

      {/* Add Lecture */}
      <BottomSheet isOpen={isAddLectureOpen} onClose={() => setIsAddLectureOpen(false)} title={`New ${lectureTypeTab === "theoretical" ? "Theoretical" : "Practical"} Lecture`}>
        <form onSubmit={lecForm.handleSubmit(onAddLecture)} className="space-y-5">
          <div>
            <label className="block text-sm font-medium mb-2">Lecture Name</label>
            <input
              {...lecForm.register("name", { required: true })}
              className={inputCls}
              placeholder="e.g. Chapter 3 — Neural Networks"
              onKeyDown={focusNext}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">
              Link <span className="text-muted-foreground font-normal">(optional)</span>
            </label>
            <input {...lecForm.register("link")} className={inputCls} placeholder="https://..." />
          </div>
          <button
            type="submit"
            className="w-full text-white font-semibold rounded-xl py-3.5 transition-opacity hover:opacity-90"
            style={{ backgroundColor: accentColor }}
          >
            Add Lecture
          </button>
        </form>
      </BottomSheet>

      {/* Add Exam */}
      <BottomSheet isOpen={isAddExamOpen} onClose={() => setIsAddExamOpen(false)} title={`New ${examTypeTab === "theoretical" ? "Theoretical" : "Practical"} Exam`}>
        <form onSubmit={examForm.handleSubmit(onAddExam)} className="space-y-5">
          <div>
            <label className="block text-sm font-medium mb-2">Exam Name</label>
            <input
              {...examForm.register("name", { required: true })}
              className={inputCls}
              placeholder="e.g. Midterm Exam"
              onKeyDown={focusNext}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-2">
                Date <span className="text-muted-foreground font-normal">(opt.)</span>
              </label>
              <input type="date" {...examForm.register("date")} className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Weight %</label>
              <input type="number" min="0" max="100" {...examForm.register("weight")} className={inputCls} />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Add questions and lecture links afterward from the exam's edit page.
          </p>
          <button
            type="submit"
            className="w-full text-white font-semibold rounded-xl py-3.5 transition-opacity hover:opacity-90"
            style={{ backgroundColor: accentColor }}
          >
            Add Exam
          </button>
        </form>
      </BottomSheet>

      {/* Add Attachment */}
      <BottomSheet
        isOpen={isAddAttachmentOpen}
        onClose={() => setIsAddAttachmentOpen(false)}
        title="New Attachment"
      >
        <form onSubmit={attachForm.handleSubmit(onAddAttachment)} className="space-y-5">
          <div>
            <label className="block text-sm font-medium mb-2">Telegram Link</label>
            <input
              {...attachForm.register("url", { required: true })}
              className={inputCls}
              placeholder="https://t.me/..."
              onKeyDown={focusNext}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">
              Label <span className="text-muted-foreground font-normal">(optional)</span>
            </label>
            <input
              {...attachForm.register("name")}
              className={inputCls}
              placeholder="e.g. Chapter 5 notes"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Type</label>
            <div className="flex flex-wrap gap-2">
              {ATTACHMENT_TYPES.map(t => (
                <TagButton key={t} active={attachType === t} onClick={() => setAttachType(t)}>
                  {t}
                </TagButton>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Format</label>
            <div className="flex gap-2">
              {ATTACHMENT_FORMATS.map(f => (
                <TagButton key={f} active={attachFormat === f} onClick={() => setAttachFormat(f)}>
                  {f}
                </TagButton>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Priority</label>
            <div className="flex gap-2">
              {ATTACHMENT_PRIORITIES.map(p => (
                <TagButton key={p} active={attachPriority === p} onClick={() => setAttachPriority(p)}>
                  {p}
                </TagButton>
              ))}
            </div>
          </div>
          <button
            type="submit"
            className="w-full text-white font-semibold rounded-xl py-3.5 transition-opacity hover:opacity-90"
            style={{ backgroundColor: accentColor }}
          >
            Save Attachment
          </button>
        </form>
      </BottomSheet>

      {/* Edit Attachment (swipe right-to-left) */}
      <BottomSheet
        isOpen={!!editingAttachmentId}
        onClose={() => setEditingAttachmentId(null)}
        title="Edit Attachment"
      >
        <form onSubmit={editAttachForm.handleSubmit(onEditAttachment)} className="space-y-5">
          <div>
            <label className="block text-sm font-medium mb-2">Telegram Link</label>
            <input {...editAttachForm.register("url", { required: true })} className={inputCls} onKeyDown={focusNext} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">
              Label <span className="text-muted-foreground font-normal">(optional)</span>
            </label>
            <input {...editAttachForm.register("name")} className={inputCls} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Type</label>
            <div className="flex flex-wrap gap-2">
              {ATTACHMENT_TYPES.map(t => (
                <TagButton key={t} active={attachType === t} onClick={() => setAttachType(t)}>
                  {t}
                </TagButton>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Format</label>
            <div className="flex gap-2">
              {ATTACHMENT_FORMATS.map(f => (
                <TagButton key={f} active={attachFormat === f} onClick={() => setAttachFormat(f)}>
                  {f}
                </TagButton>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Priority</label>
            <div className="flex gap-2">
              {ATTACHMENT_PRIORITIES.map(p => (
                <TagButton key={p} active={attachPriority === p} onClick={() => setAttachPriority(p)}>
                  {p}
                </TagButton>
              ))}
            </div>
          </div>
          <button
            type="submit"
            className="w-full text-white font-semibold rounded-xl py-3.5 transition-opacity hover:opacity-90"
            style={{ backgroundColor: accentColor }}
          >
            Save Changes
          </button>
        </form>
      </BottomSheet>

      {/* View Attachment (tap) */}
      <BottomSheet
        isOpen={!!viewingAttachmentId}
        onClose={() => setViewingAttachmentId(null)}
        title="Attachment"
      >
        {(() => {
          const att = (subject.attachments || []).find(a => a.id === viewingAttachmentId);
          if (!att) return null;
          return (
            <div className="space-y-4">
              {att.name && <p className="font-semibold text-lg">{att.name}</p>}
              <a
                href={att.url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 text-sm font-medium hover:underline break-all"
                style={{ color: accentColor }}
              >
                <ExternalLink className="w-4 h-4 shrink-0" /> {att.url}
              </a>
              <div className="flex flex-wrap gap-1.5">
                <span className="px-2 py-0.5 rounded-md text-xs font-medium text-white" style={{ backgroundColor: accentColor }}>
                  {att.type}
                </span>
                <span className="px-2 py-0.5 rounded-md text-xs font-medium bg-secondary text-foreground">{att.format}</span>
                <span className="px-2 py-0.5 rounded-md text-xs font-medium bg-secondary text-muted-foreground">{att.priority}</span>
              </div>
              <p className="text-xs text-muted-foreground pt-2">Swipe left to edit &middot; swipe right to delete</p>
            </div>
          );
        })()}
      </BottomSheet>

      {/* Edit Drive Link */}
      <BottomSheet
        isOpen={isEditDriveLinkOpen}
        onClose={() => setIsEditDriveLinkOpen(false)}
        title="Edit Drive Folder Link"
      >
        <form onSubmit={driveLinkForm.handleSubmit(onEditDriveLink)} className="space-y-5">
          <div>
            <label className="block text-sm font-medium mb-2">Google Drive Folder Link</label>
            <input
              {...driveLinkForm.register("driveLink")}
              className={inputCls}
              placeholder="https://drive.google.com/..."

            />
          </div>
          <button
            type="submit"
            className="w-full text-white font-semibold rounded-xl py-3.5 transition-opacity hover:opacity-90"
            style={{ backgroundColor: accentColor }}
          >
            Save Link
          </button>
        </form>
      </BottomSheet>

      {/* Confirm delete subject */}
      <ConfirmSheet
        isOpen={isDeletingSubject}
        onClose={() => setIsDeletingSubject(false)}
        onConfirm={handleDeleteSubject}
        title="Delete subject?"
        message="This will move the subject, its lectures, exams, and linked tasks to the Archive."
        confirmLabel="Move to Archive"
      />

      {/* Confirm delete exam (swipe left-to-right) */}
      <ConfirmSheet
        isOpen={!!deletingExamId}
        onClose={() => setDeletingExamId(null)}
        onConfirm={() => {
          if (deletingExamId) {
            deleteExam(subject.id, deletingExamId);
            setDeletingExamId(null);
          }
        }}
        title="Delete exam?"
        message="This exam and its results will be permanently removed."
      />

      {/* Confirm delete attachment (swipe right-to-left) */}
      <ConfirmSheet
        isOpen={!!deletingAttachmentId}
        onClose={() => setDeletingAttachmentId(null)}
        onConfirm={() => {
          if (deletingAttachmentId) {
            deleteAttachment(subject.id, deletingAttachmentId);
            setDeletingAttachmentId(null);
          }
        }}
        title="Delete attachment?"
        message="This attachment will be permanently removed."
      />
    </div>
  );
}
