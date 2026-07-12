import { useState } from "react";
import { useStudyData, Attachment, AttachmentFormat, AttachmentPriority, AttachmentType } from "@/hooks/useStudyData";
import { GlassCard } from "@/components/shared/GlassCard";
import { BottomSheet } from "@/components/shared/BottomSheet";
import { ConfirmSheet } from "@/components/shared/ConfirmSheet";
import {
  Plus, Trash2, ArrowLeft, ExternalLink, BookOpen, FileText, Pencil,
  FolderOpen, BarChart2, Link2, Paperclip, Info,
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
    addLecture, updateLecture, deleteLecture,
    addExam, updateExam, deleteExam,
    deleteSubject, updateSubject,
    addAttachment, deleteAttachment,
  } = useStudyData();

  const subject = subjects.find(s => s.id === params?.id);

  const [activeTab, setActiveTab] = useState<Tab>("details");

  // Lecture state
  const [isAddLectureOpen, setIsAddLectureOpen] = useState(false);
  const [editingLecId, setEditingLecId] = useState<string | null>(null);
  const [deletingLecId, setDeletingLecId] = useState<string | null>(null);

  // Exam state
  const [isAddExamOpen, setIsAddExamOpen] = useState(false);
  const [editingExamId, setEditingExamId] = useState<string | null>(null);
  const [deletingExamId, setDeletingExamId] = useState<string | null>(null);

  // Attachment state
  const [isAddAttachmentOpen, setIsAddAttachmentOpen] = useState(false);
  const [deletingAttachmentId, setDeletingAttachmentId] = useState<string | null>(null);
  const [attachType, setAttachType] = useState<AttachmentType>('Study Sheet');
  const [attachFormat, setAttachFormat] = useState<AttachmentFormat>('File');
  const [attachPriority, setAttachPriority] = useState<AttachmentPriority>('Important');

  // Details edit state
  const [isEditDetailsOpen, setIsEditDetailsOpen] = useState(false);

  // Confirm delete subject
  const [isDeletingSubject, setIsDeletingSubject] = useState(false);

  const lecForm = useForm({ defaultValues: { name: "", link: "" } });
  const editLecForm = useForm({ defaultValues: { name: "", link: "" } });
  const examForm = useForm({ defaultValues: { name: "", link: "", date: "", weight: 1 } });
  const editExamForm = useForm({ defaultValues: { name: "", link: "", date: "", weight: 1 } });
  const attachForm = useForm({ defaultValues: { url: "", name: "" } });
  const detailsForm = useForm({ defaultValues: { driveLink: "", lectureCount: 0, examCount: 0 } });

  if (!subject) {
    return <div className="p-8 text-center text-muted-foreground">Subject not found</div>;
  }

  const finishedExams = subject.exams.filter(e => e.grade !== null && e.grade !== '').length;
  const totalExams = subject.exams.length;
  const progress = totalExams > 0 ? Math.round((finishedExams / totalExams) * 100) : 0;
  const accentColor = subject.color;

  // ─── Lecture handlers ────────────────────────────────────────────────────
  const onAddLecture = (data: any) => {
    addLecture(subject.id, data);
    lecForm.reset();
    setIsAddLectureOpen(false);
  };

  const openEditLecture = (id: string) => {
    const lec = subject.lectures.find(l => l.id === id);
    if (!lec) return;
    editLecForm.reset({ name: lec.name, link: lec.link || "" });
    setEditingLecId(id);
  };

  const onEditLecture = (data: any) => {
    if (!editingLecId) return;
    updateLecture(subject.id, editingLecId, data);
    setEditingLecId(null);
  };

  // ─── Exam handlers ────────────────────────────────────────────────────────
  const onAddExam = (data: any) => {
    addExam(subject.id, {
      name: data.name,
      link: data.link,
      date: data.date || null,
      grade: null,
      weight: parseFloat(data.weight) || 1,
    });
    examForm.reset();
    setIsAddExamOpen(false);
  };

  const openEditExam = (id: string) => {
    const exam = subject.exams.find(e => e.id === id);
    if (!exam) return;
    editExamForm.reset({
      name: exam.name,
      link: exam.link || "",
      date: exam.date || "",
      weight: exam.weight ?? 1,
    });
    setEditingExamId(id);
  };

  const onEditExam = (data: any) => {
    if (!editingExamId) return;
    updateExam(subject.id, editingExamId, {
      name: data.name,
      link: data.link,
      date: data.date || null,
      weight: parseFloat(data.weight) || 1,
    });
    setEditingExamId(null);
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

  // ─── Details handlers ─────────────────────────────────────────────────────
  const openEditDetails = () => {
    detailsForm.reset({
      driveLink: subject.driveLink || "",
      lectureCount: subject.lectureCount ?? 0,
      examCount: subject.examCount ?? 0,
    });
    setIsEditDetailsOpen(true);
  };

  const onEditDetails = (data: any) => {
    updateSubject(subject.id, {
      driveLink: data.driveLink || undefined,
      lectureCount: parseInt(data.lectureCount) || 0,
      examCount: parseInt(data.examCount) || 0,
    });
    setIsEditDetailsOpen(false);
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
              {/* Drive Link card */}
              <GlassCard className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                      style={{ backgroundColor: `${accentColor}20` }}
                    >
                      <FolderOpen className="w-4 h-4" style={{ color: accentColor }} />
                    </div>
                    <span className="font-semibold">Google Drive Folder</span>
                  </div>
                  <button
                    onClick={openEditDetails}
                    className="p-1.5 rounded-lg hover:bg-secondary transition-colors text-muted-foreground"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                </div>
                {subject.driveLink ? (
                  <a
                    href={subject.driveLink}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 text-sm font-medium hover:underline"
                    style={{ color: accentColor }}
                  >
                    <ExternalLink className="w-4 h-4 shrink-0" />
                    <span className="truncate">{subject.driveLink}</span>
                  </a>
                ) : (
                  <button
                    onClick={openEditDetails}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5"
                  >
                    <Link2 className="w-3.5 h-3.5" /> Add Drive folder link
                  </button>
                )}
              </GlassCard>

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
                      {finishedExams} / {totalExams} exams graded
                    </span>
                  </div>
                  <div className="h-2.5 bg-secondary rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${progress}%`, backgroundColor: accentColor }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 mt-5">
                  <div className="bg-secondary/50 rounded-xl p-3 text-center">
                    <p className="text-2xl font-bold">{subject.lectureCount ?? 0}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 font-medium uppercase tracking-wide">
                      Lectures
                    </p>
                  </div>
                  <div className="bg-secondary/50 rounded-xl p-3 text-center">
                    <p className="text-2xl font-bold">
                      {subject.examCount ?? subject.exams.length}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5 font-medium uppercase tracking-wide">
                      Exams
                    </p>
                  </div>
                  <div className="bg-secondary/50 rounded-xl p-3 text-center">
                    <p className="text-2xl font-bold">{finishedExams}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 font-medium uppercase tracking-wide">
                      Done
                    </p>
                  </div>
                </div>

                <button
                  onClick={openEditDetails}
                  className="mt-4 text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                >
                  <Pencil className="w-3 h-3" /> Edit lecture & exam counts
                </button>
              </GlassCard>
            </div>
          )}

          {/* ── LECTURES TAB ─────────────────────────────────────────────────── */}
          {activeTab === "lectures" && (
            <div className="space-y-3">
              {subject.lectures.length === 0 ? (
                <GlassCard className="p-10 text-center text-muted-foreground border-dashed border-2 bg-transparent">
                  <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">No lectures yet</p>
                </GlassCard>
              ) : (
                subject.lectures.map(lec => (
                  <GlassCard key={lec.id} className="p-4 flex items-center gap-3 group">
                    <div
                      className="w-8 h-8 rounded-lg shrink-0 flex items-center justify-center"
                      style={{ backgroundColor: `${accentColor}20` }}
                    >
                      <BookOpen className="w-4 h-4" style={{ color: accentColor }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate">{lec.name}</p>
                      {lec.link && (
                        <a
                          href={lec.link}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs flex items-center gap-1 mt-0.5 hover:underline"
                          style={{ color: accentColor }}
                        >
                          <ExternalLink className="w-3 h-3" /> Open Material
                        </a>
                      )}
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <button
                        onClick={() => openEditLecture(lec.id)}
                        className="p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground rounded-lg transition-all"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeletingLecId(lec.id)}
                        className="p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive rounded-lg transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </GlassCard>
                ))
              )}
              <button
                onClick={() => setIsAddLectureOpen(true)}
                className="w-full border-2 border-dashed border-border rounded-2xl p-4 text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-all flex items-center justify-center gap-2 font-medium"
              >
                <Plus className="w-4 h-4" /> Add Lecture
              </button>
            </div>
          )}

          {/* ── EXAMS TAB ────────────────────────────────────────────────────── */}
          {activeTab === "exams" && (
            <div className="space-y-3">
              {subject.exams.length === 0 ? (
                <GlassCard className="p-10 text-center text-muted-foreground border-dashed border-2 bg-transparent">
                  <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">No exams yet</p>
                </GlassCard>
              ) : (
                subject.exams.map(exam => {
                  const isDone = exam.grade !== null && exam.grade !== "";
                  return (
                    <GlassCard key={exam.id} className="p-4 group">
                      <div className="flex items-start gap-3">
                        <div
                          className="w-8 h-8 rounded-lg shrink-0 flex items-center justify-center mt-0.5"
                          style={{
                            backgroundColor: isDone ? `${accentColor}20` : undefined,
                          }}
                        >
                          <FileText
                            className="w-4 h-4"
                            style={{ color: isDone ? accentColor : undefined }}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold truncate">{exam.name}</p>
                          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
                            {exam.date && (
                              <span className="text-xs text-muted-foreground">
                                {format(new Date(exam.date), "MMM d, yyyy")}
                              </span>
                            )}
                            {exam.weight !== undefined && (
                              <span className="text-xs text-muted-foreground">
                                Weight: {exam.weight}%
                              </span>
                            )}
                          </div>
                          {exam.link && (
                            <a
                              href={exam.link}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs flex items-center gap-1 mt-1 hover:underline"
                              style={{ color: accentColor }}
                            >
                              <ExternalLink className="w-3 h-3" /> Open
                            </a>
                          )}
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                          <button
                            onClick={() => openEditExam(exam.id)}
                            className="p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground rounded-lg transition-all"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeletingExamId(exam.id)}
                            className="p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive rounded-lg transition-all"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Grade inline editor */}
                      <div className="mt-3 pt-3 border-t border-border/50 flex items-center gap-3">
                        <span className="text-xs text-muted-foreground shrink-0 font-medium">Grade:</span>
                        {isDone ? (
                          <span
                            className="px-2.5 py-0.5 rounded-md text-xs font-bold text-white"
                            style={{ backgroundColor: accentColor }}
                          >
                            {exam.grade}
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-md text-xs font-medium bg-secondary text-muted-foreground">
                            Not graded
                          </span>
                        )}
                        <input
                          type="text"
                          defaultValue={exam.grade || ""}
                          placeholder="Enter grade…"
                          onBlur={e => {
                            const val = e.target.value.trim();
                            updateExam(subject.id, exam.id, { grade: val || null });
                          }}
                          className="flex-1 bg-secondary/50 border border-border/50 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50"
                        />
                      </div>
                    </GlassCard>
                  );
                })
              )}
              <button
                onClick={() => setIsAddExamOpen(true)}
                className="w-full border-2 border-dashed border-border rounded-2xl p-4 text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-all flex items-center justify-center gap-2 font-medium"
              >
                <Plus className="w-4 h-4" /> Add Exam
              </button>
            </div>
          )}

          {/* ── ATTACHMENTS TAB ──────────────────────────────────────────────── */}
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
                  <GlassCard key={att.id} className="p-4 group">
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
                        <a
                          href={att.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs flex items-center gap-1 hover:underline"
                          style={{ color: accentColor }}
                        >
                          <ExternalLink className="w-3 h-3 shrink-0" />
                          <span className="truncate">{att.url}</span>
                        </a>
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
                      <button
                        onClick={() => setDeletingAttachmentId(att.id)}
                        className="p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive rounded-lg transition-all opacity-0 group-hover:opacity-100 shrink-0 mt-0.5"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </GlassCard>
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
      <BottomSheet isOpen={isAddLectureOpen} onClose={() => setIsAddLectureOpen(false)} title="New Lecture">
        <form onSubmit={lecForm.handleSubmit(onAddLecture)} className="space-y-5">
          <div>
            <label className="block text-sm font-medium mb-2">Lecture Name</label>
            <input
              {...lecForm.register("name", { required: true })}
              className={inputCls}
              placeholder="e.g. Chapter 3 — Neural Networks"
              autoFocus
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

      {/* Edit Lecture */}
      <BottomSheet isOpen={!!editingLecId} onClose={() => setEditingLecId(null)} title="Edit Lecture">
        <form onSubmit={editLecForm.handleSubmit(onEditLecture)} className="space-y-5">
          <div>
            <label className="block text-sm font-medium mb-2">Lecture Name</label>
            <input {...editLecForm.register("name", { required: true })} className={inputCls} autoFocus />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">
              Link <span className="text-muted-foreground font-normal">(optional)</span>
            </label>
            <input {...editLecForm.register("link")} className={inputCls} placeholder="https://..." />
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

      {/* Add Exam */}
      <BottomSheet isOpen={isAddExamOpen} onClose={() => setIsAddExamOpen(false)} title="New Exam">
        <form onSubmit={examForm.handleSubmit(onAddExam)} className="space-y-5">
          <div>
            <label className="block text-sm font-medium mb-2">Exam Name</label>
            <input
              {...examForm.register("name", { required: true })}
              className={inputCls}
              placeholder="e.g. Midterm Exam"
              autoFocus
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
          <div>
            <label className="block text-sm font-medium mb-2">
              Link <span className="text-muted-foreground font-normal">(optional)</span>
            </label>
            <input {...examForm.register("link")} className={inputCls} placeholder="https://..." />
          </div>
          <button
            type="submit"
            className="w-full text-white font-semibold rounded-xl py-3.5 transition-opacity hover:opacity-90"
            style={{ backgroundColor: accentColor }}
          >
            Add Exam
          </button>
        </form>
      </BottomSheet>

      {/* Edit Exam */}
      <BottomSheet isOpen={!!editingExamId} onClose={() => setEditingExamId(null)} title="Edit Exam">
        <form onSubmit={editExamForm.handleSubmit(onEditExam)} className="space-y-5">
          <div>
            <label className="block text-sm font-medium mb-2">Exam Name</label>
            <input
              {...editExamForm.register("name", { required: true })}
              className={inputCls}
              autoFocus
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-2">
                Date <span className="text-muted-foreground font-normal">(opt.)</span>
              </label>
              <input type="date" {...editExamForm.register("date")} className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Weight %</label>
              <input
                type="number"
                min="0"
                max="100"
                {...editExamForm.register("weight")}
                className={inputCls}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">
              Link <span className="text-muted-foreground font-normal">(optional)</span>
            </label>
            <input {...editExamForm.register("link")} className={inputCls} placeholder="https://..." />
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
              autoFocus
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

      {/* Edit Details */}
      <BottomSheet
        isOpen={isEditDetailsOpen}
        onClose={() => setIsEditDetailsOpen(false)}
        title="Edit Details"
      >
        <form onSubmit={detailsForm.handleSubmit(onEditDetails)} className="space-y-5">
          <div>
            <label className="block text-sm font-medium mb-2">Google Drive Folder Link</label>
            <input
              {...detailsForm.register("driveLink")}
              className={inputCls}
              placeholder="https://drive.google.com/..."
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-2">Number of Lectures</label>
              <input
                type="number"
                min="0"
                {...detailsForm.register("lectureCount")}
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Number of Exams</label>
              <input
                type="number"
                min="0"
                {...detailsForm.register("examCount")}
                className={inputCls}
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground -mt-2">
            Finished exams are tracked automatically as you enter grades.
          </p>
          <button
            type="submit"
            className="w-full text-white font-semibold rounded-xl py-3.5 transition-opacity hover:opacity-90"
            style={{ backgroundColor: accentColor }}
          >
            Save Details
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

      {/* Confirm delete lecture */}
      <ConfirmSheet
        isOpen={!!deletingLecId}
        onClose={() => setDeletingLecId(null)}
        onConfirm={() => {
          if (deletingLecId) {
            deleteLecture(subject.id, deletingLecId);
            setDeletingLecId(null);
          }
        }}
        title="Delete lecture?"
        message="This lecture will be permanently removed."
      />

      {/* Confirm delete exam */}
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
        message="This exam and its grade will be permanently removed."
      />

      {/* Confirm delete attachment */}
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
