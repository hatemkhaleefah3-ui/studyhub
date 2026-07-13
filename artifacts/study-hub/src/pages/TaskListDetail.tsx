import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useStudyData } from "@/hooks/useStudyData";
import { type ImportanceLevel, type SubTask } from "@/hooks/useStudyData";
import { GlassCard } from "@/components/shared/GlassCard";
import { FabPortal } from "@/components/shared/FabPortal";
import { SwipeableRow } from "@/components/shared/SwipeableRow";
import { TaskForm, TaskFormValues, DEFAULT_TASK, IMPORTANCE_META } from "@/components/shared/TaskForm";
import {
  ArrowLeft, Plus, CheckCircle2, Circle, XCircle,
  Clock, Link as LinkIcon, ListChecks,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { format, parseISO, isToday, isPast } from "date-fns";

export function TaskListDetail() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const {
    checklist, subjects,
    toggleSubTask, addSubTask, updateSubTask, deleteSubTask,
  } = useStudyData();

  const [isAddOpen, setIsAddOpen]         = useState(false);
  const [editingSubTaskId, setEditingSubTaskId] = useState<string | null>(null);

  const item = checklist.find(c => c.id === id);

  if (!item) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <p className="text-muted-foreground">Task list not found.</p>
        <button
          onClick={() => navigate("/checklist")}
          className="text-primary hover:underline text-sm"
        >
          ← Back to Checklist
        </button>
      </div>
    );
  }

  const subject    = subjects.find(s => s.id === item.subjectId);
  const subTasks   = item.subTasks || [];
  const checkedCount = subTasks.filter(st => st.done).length;
  const skippedCount = subTasks.filter(st => st.didNotDo).length;
  const doneCount  = checkedCount + skippedCount;
  const progress   = subTasks.length > 0 ? doneCount / subTasks.length : 0;

  // ── Handlers ────────────────────────────────────────────────────────────────

  const onAddSubTask = (data: TaskFormValues) => {
    addSubTask(item.id, {
      text: data.text,
      description: data.description || undefined,
      importance: (data.importance as ImportanceLevel) || null,
      dueDate: data.dueDate || null,
      dueTime: data.dueTime || null,
      link: data.link || null,
      done: false,
      didNotDo: false,
    });
    setIsAddOpen(false);
  };

  const editingSubTask = editingSubTaskId
    ? subTasks.find(st => st.id === editingSubTaskId)
    : null;

  const getSubTaskDefaults = (st: SubTask): TaskFormValues => ({
    text: st.text,
    description: st.description || "",
    importance: st.importance || "",
    dueDate: st.dueDate || "",
    dueTime: st.dueTime || "",
    repeat: "none",
    subjectId: "",
    link: st.link || "",
  });

  const onEditSubTask = (data: TaskFormValues) => {
    if (!editingSubTaskId) return;
    updateSubTask(item.id, editingSubTaskId, {
      text: data.text,
      description: data.description || undefined,
      importance: (data.importance as ImportanceLevel) || null,
      dueDate: data.dueDate || null,
      dueTime: data.dueTime || null,
      link: data.link || null,
    });
    setEditingSubTaskId(null);
  };

  // ── Due badge ───────────────────────────────────────────────────────────────

  const dueBadge = (st: SubTask) => {
    if (!st.dueDate) return null;
    try {
      const date    = parseISO(st.dueDate);
      const overdue = !st.done && !st.didNotDo && isPast(date) && !isToday(date);
      const due     = isToday(date);
      return (
        <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${
          overdue ? "bg-rose-500/15 text-rose-500" :
          due     ? "bg-amber-500/15 text-amber-600" :
                    "bg-muted text-muted-foreground"
        }`}>
          <Clock className="w-3 h-3" />
          {due ? "Today" : overdue ? "Overdue" : format(date, "MMM d")}
        </span>
      );
    } catch { return null; }
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 pb-24">

      {/* Header */}
      <div className="flex items-start gap-2">
        <button
          onClick={() => navigate("/checklist")}
          className="mt-1 p-2 -ml-2 rounded-xl hover:bg-secondary/60 transition-colors text-muted-foreground hover:text-foreground shrink-0"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-0.5">
            <ListChecks className="w-5 h-5 text-primary shrink-0" />
            <h1 className="text-2xl font-bold tracking-tight">{item.text}</h1>
          </div>
          {subject && (
            <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-0.5">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: subject.color }} />
              {subject.name}
            </p>
          )}
          {item.description && (
            <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
          )}
        </div>
      </div>

      {/* Progress card */}
      <GlassCard className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Progress</span>
          <span className="text-sm font-bold tabular-nums">{doneCount} / {subTasks.length}</span>
        </div>

        {/* Bar */}
        <div className="w-full bg-secondary rounded-full h-2 overflow-hidden">
          <motion.div
            className={`h-full rounded-full ${item.didNotDo ? "bg-muted-foreground" : "bg-primary"}`}
            initial={{ width: 0 }}
            animate={{ width: `${progress * 100}%` }}
            transition={{ type: "spring", stiffness: 200, damping: 30 }}
          />
        </div>

        {/* Counts row */}
        {subTasks.length > 0 && (
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
              {checkedCount} checked
            </span>
            <span className="flex items-center gap-1">
              <XCircle className="w-3.5 h-3.5" />
              {skippedCount} skipped
            </span>
            <span>{subTasks.length - doneCount} remaining</span>
          </div>
        )}

        {/* Completion state */}
        {item.done && (
          <p className="text-xs font-semibold text-primary flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" /> List complete
          </p>
        )}
        {item.didNotDo && (
          <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
            <XCircle className="w-3.5 h-3.5" /> List skipped
          </p>
        )}
      </GlassCard>

      {/* Sub-tasks */}
      <div className="space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground px-1">
          Sub-tasks ({subTasks.length})
        </h2>

        {subTasks.length === 0 ? (
          <GlassCard className="p-10 text-center border-dashed border-2 bg-transparent">
            <p className="text-muted-foreground">No sub-tasks yet. Tap + to add one.</p>
          </GlassCard>
        ) : (
          <div className="space-y-2">
            <AnimatePresence initial={false}>
              {subTasks.map(st => {
                const imp = st.importance ? IMPORTANCE_META[st.importance] : null;

                return (
                  <motion.div
                    key={st.id}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ type: "spring", stiffness: 300, damping: 28 }}
                  >
                    <SwipeableRow
                      onEdit={() => setEditingSubTaskId(st.id)}
                      onDelete={() => deleteSubTask(item.id, st.id)}
                    >
                      <GlassCard
                        className={`transition-opacity duration-300 ${st.done || st.didNotDo ? "opacity-50" : "opacity-100"}`}
                      >
                        <div
                          className="p-4 flex items-start gap-3 cursor-pointer"
                          onClick={() => setEditingSubTaskId(st.id)}
                        >
                          {/* Content */}
                          <div className="flex-1 min-w-0 py-0.5">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`text-base font-medium ${
                                st.done     ? "line-through text-muted-foreground" :
                                st.didNotDo ? "line-through text-muted-foreground/60" : ""
                              }`}>
                                {st.text}
                              </span>
                              {st.didNotDo && (
                                <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full shrink-0">
                                  Skipped
                                </span>
                              )}
                            </div>

                            {st.description && (
                              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{st.description}</p>
                            )}

                            {(imp || st.dueDate || st.link) && (
                              <div className="flex items-center flex-wrap gap-1.5 mt-1.5">
                                {imp && (
                                  <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium bg-muted ${imp.color}`}>
                                    <span className={`w-1.5 h-1.5 rounded-full ${imp.dot}`} />
                                    {imp.label}
                                  </span>
                                )}
                                {dueBadge(st)}
                                {st.link && (
                                  <a
                                    href={st.link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={e => e.stopPropagation()}
                                    className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary"
                                  >
                                    <LinkIcon className="w-3 h-3" /> Link
                                  </a>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Status button — right, cycles undone → done → didNotDo */}
                          <button
                            onClick={e => { e.stopPropagation(); toggleSubTask(item.id, st.id); }}
                            className="shrink-0 mt-0.5 p-1 hover:scale-110 transition-transform focus:outline-none"
                          >
                            <motion.div whileTap={{ scale: 0.75 }}>
                              {st.done ? (
                                <CheckCircle2 className="w-6 h-6 text-primary" />
                              ) : st.didNotDo ? (
                                <XCircle className="w-6 h-6 text-muted-foreground" />
                              ) : (
                                <Circle className="w-6 h-6 text-muted-foreground hover:text-primary transition-colors" />
                              )}
                            </motion.div>
                          </button>
                        </div>
                      </GlassCard>
                    </SwipeableRow>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* FAB */}
      <FabPortal>
        <motion.button
          onClick={() => setIsAddOpen(true)}
          whileTap={{ scale: 0.88 }}
          className="fixed bottom-24 md:bottom-10 right-6 md:right-10 w-14 h-14 bg-primary text-primary-foreground rounded-full shadow-lg shadow-primary/30 flex items-center justify-center z-40"
        >
          <Plus className="w-6 h-6" />
        </motion.button>
      </FabPortal>

      {/* Add sub-task sheet */}
      {isAddOpen && (
        <TaskForm
          title="New Sub-task"
          defaultValues={DEFAULT_TASK}
          subjects={subjects}
          onSubmit={onAddSubTask}
          onClose={() => setIsAddOpen(false)}
          submitLabel="Add Sub-task"
          hideSubject
          hideRepeat
        />
      )}

      {/* Edit sub-task sheet */}
      {editingSubTaskId && editingSubTask && (
        <TaskForm
          title="Edit Sub-task"
          defaultValues={getSubTaskDefaults(editingSubTask)}
          subjects={subjects}
          onSubmit={onEditSubTask}
          onClose={() => setEditingSubTaskId(null)}
          submitLabel="Save Changes"
          hideSubject
          hideRepeat
        />
      )}
    </div>
  );
}
