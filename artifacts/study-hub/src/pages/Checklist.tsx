import { useState, useMemo } from "react";
import { useStudyData } from "@/hooks/useStudyData";
import { type ImportanceLevel, type RepeatInterval } from "@/hooks/useStudyData";
import { GlassCard } from "@/components/shared/GlassCard";
import { BottomSheet } from "@/components/shared/BottomSheet";
import { FabPortal } from "@/components/shared/FabPortal";
import { SwipeableRow } from "@/components/shared/SwipeableRow";
import {
  Plus, Trash2, CheckCircle2, Circle, XCircle,
  List, ListChecks, ChevronDown, ChevronRight, X, Pencil,
  SlidersHorizontal, RotateCcw, Link as LinkIcon,
  AlertCircle, Clock, Repeat, Settings2,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { motion, AnimatePresence } from "framer-motion";
import { format, isToday, isPast, parseISO } from "date-fns";

// ── Constants ────────────────────────────────────────────────────────────────

const IMPORTANCE_META: Record<ImportanceLevel, { label: string; color: string; dot: string }> = {
  high:   { label: "High",   color: "text-rose-500",   dot: "bg-rose-500" },
  medium: { label: "Medium", color: "text-amber-500",  dot: "bg-amber-500" },
  low:    { label: "Low",    color: "text-emerald-500", dot: "bg-emerald-500" },
};

const REPEAT_META: Record<RepeatInterval, string> = {
  none: "No repeat", daily: "Daily", weekly: "Weekly", monthly: "Monthly",
};

// ── Filter types ─────────────────────────────────────────────────────────────

interface Filters {
  importance: ImportanceLevel[];
  status: ("done" | "undone" | "didNotDo")[];
  repeat: ("repeating" | "oneTime")[];
  hasDueDate: boolean | null;
}

const EMPTY_FILTERS: Filters = { importance: [], status: [], repeat: [], hasDueDate: null };

function toggleArr<T>(arr: T[], val: T): T[] {
  return arr.includes(val) ? arr.filter(v => v !== val) : [...arr, val];
}

function activeFilterCount(f: Filters) {
  return f.importance.length + f.status.length + f.repeat.length + (f.hasDueDate !== null ? 1 : 0);
}

// ── Form value types ──────────────────────────────────────────────────────────

interface TaskFormValues {
  text: string;
  description: string;
  importance: ImportanceLevel | "";
  dueDate: string;
  dueTime: string;
  repeat: RepeatInterval;
  subjectId: string;
  link: string;
}

const DEFAULT_TASK: TaskFormValues = {
  text: "", description: "", importance: "", dueDate: "", dueTime: "",
  repeat: "none", subjectId: "", link: "",
};

// ── Shared TaskForm component ─────────────────────────────────────────────────

function TaskForm({
  title, defaultValues, subjects, onSubmit, onClose, submitLabel,
}: {
  title: string;
  defaultValues: TaskFormValues;
  subjects: { id: string; name: string }[];
  onSubmit: (data: TaskFormValues) => void;
  onClose: () => void;
  submitLabel: string;
}) {
  // Auto-expand advanced section if the task already has advanced values
  const hasAdvancedValues = !!(
    defaultValues.importance ||
    defaultValues.dueDate ||
    (defaultValues.repeat && defaultValues.repeat !== 'none') ||
    defaultValues.link
  );
  const [showAdvanced, setShowAdvanced] = useState(hasAdvancedValues);

  const { register, handleSubmit, reset } = useForm<TaskFormValues>({ defaultValues });

  const submit = (data: TaskFormValues) => {
    onSubmit(data);
    reset();
  };

  const fieldCls =
    "w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition-shadow";

  const Section = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-0.5">{label}</p>
      {children}
    </div>
  );

  return (
    <BottomSheet isOpen title={title} onClose={onClose}>
      <form onSubmit={handleSubmit(submit)} className="space-y-5 pb-2">

        {/* ── Basic fields (always visible) ─────────────────────────────── */}
        <Section label="Task">
          <input
            {...register("text", { required: true })}
            className={fieldCls}
            placeholder="Task name…"
            autoFocus
          />
          <textarea
            {...register("description")}
            className={`${fieldCls} resize-none min-h-[64px]`}
            placeholder="Description (optional)"
          />
        </Section>

        <Section label="Category / Subject">
          <select {...register("subjectId")} className={fieldCls}>
            <option value="">No subject</option>
            {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </Section>

        {/* ── Advanced Settings toggle ────────────────────────────────────── */}
        <button
          type="button"
          onClick={() => setShowAdvanced(v => !v)}
          className="flex items-center gap-2 w-full px-4 py-3 rounded-xl border border-border bg-secondary/40 hover:bg-secondary/70 transition-colors text-sm font-medium text-foreground"
        >
          <Settings2 className="w-4 h-4 text-muted-foreground shrink-0" />
          <span className="flex-1 text-left">Advanced Settings</span>
          {/* show a summary of what's set when collapsed */}
          {!showAdvanced && hasAdvancedValues && (
            <span className="text-xs text-primary font-normal">
              {[
                defaultValues.importance && IMPORTANCE_META[defaultValues.importance as ImportanceLevel]?.label,
                defaultValues.dueDate && 'Due date',
                defaultValues.repeat && defaultValues.repeat !== 'none' && REPEAT_META[defaultValues.repeat as RepeatInterval],
                defaultValues.link && 'Link',
              ].filter(Boolean).join(' · ')}
            </span>
          )}
          <ChevronDown
            className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform duration-200 ${showAdvanced ? 'rotate-180' : ''}`}
          />
        </button>

        {/* ── Advanced fields (collapsible) ─────────────────────────────── */}
        <AnimatePresence initial={false}>
          {showAdvanced && (
            <motion.div
              key="advanced"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="overflow-hidden"
            >
              <div className="space-y-5 pt-1 pb-1 border-l-2 border-primary/20 pl-4">

                <Section label="Importance">
                  <select {...register("importance")} className={fieldCls}>
                    <option value="">No importance set</option>
                    <option value="high">🔴 High</option>
                    <option value="medium">🟡 Medium</option>
                    <option value="low">🟢 Low</option>
                  </select>
                </Section>

                <Section label="Due Date & Time">
                  <div className="grid grid-cols-2 gap-3">
                    <input {...register("dueDate")} type="date" className={fieldCls} />
                    <input {...register("dueTime")} type="time" className={fieldCls} />
                  </div>
                </Section>

                <Section label="Repeat">
                  <select {...register("repeat")} className={fieldCls}>
                    <option value="none">No repeat</option>
                    <option value="daily">Daily — repeats every day</option>
                    <option value="weekly">Weekly — repeats every 7 days</option>
                    <option value="monthly">Monthly — repeats same day each month</option>
                  </select>
                  <p className="text-xs text-muted-foreground px-0.5">
                    When you complete a repeating task, the next occurrence is created automatically on the next due date.
                  </p>
                </Section>

                <Section label="Link (optional)">
                  <input
                    {...register("link")}
                    type="url"
                    className={fieldCls}
                    placeholder="https://…"
                  />
                </Section>

              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <button
          type="submit"
          className="w-full bg-primary text-primary-foreground font-semibold rounded-xl py-3.5"
        >
          {submitLabel}
        </button>
      </form>
    </BottomSheet>
  );
}

// ── Filter Chip ───────────────────────────────────────────────────────────────

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3.5 py-1.5 rounded-full text-sm font-medium border transition-all ${
        active
          ? "bg-primary text-primary-foreground border-primary"
          : "bg-secondary/50 text-foreground border-border hover:bg-secondary"
      }`}
    >
      {children}
    </button>
  );
}

// ── Main Checklist component ──────────────────────────────────────────────────

export function Checklist() {
  const {
    checklist, subjects,
    toggleChecklistItem, deleteChecklistItem, addChecklistItem, updateChecklistItem,
    toggleSubTask, addSubTask, deleteSubTask, updateSubTask,
  } = useStudyData();

  // UI state
  const [showActionMenu, setShowActionMenu]   = useState(false);
  const [isAddTaskOpen, setIsAddTaskOpen]     = useState(false);
  const [isAddListOpen, setIsAddListOpen]     = useState(false);
  const [isFilterOpen, setIsFilterOpen]       = useState(false);
  const [editingItemId, setEditingItemId]     = useState<string | null>(null);
  const [expandedItems, setExpandedItems]     = useState<Set<string>>(new Set());
  const [newSubTaskInputs, setNewSubTaskInputs] = useState<string[]>(['']);
  const [addingSubTaskFor, setAddingSubTaskFor] = useState<string | null>(null);
  const [newSubTaskText, setNewSubTaskText]   = useState('');
  const [editingSubTask, setEditingSubTask]   = useState<{ itemId: string; subTaskId: string } | null>(null);
  const [editSubTaskText, setEditSubTaskText] = useState('');

  // Filters
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const filterCount = activeFilterCount(filters);

  // ── Data handlers ──────────────────────────────────────────────────────────

  const onAddTask = (data: TaskFormValues) => {
    addChecklistItem({
      text: data.text,
      description: data.description || undefined,
      subjectId: data.subjectId || null,
      done: false,
      didNotDo: false,
      importance: (data.importance as ImportanceLevel) || null,
      dueDate: data.dueDate || null,
      dueTime: data.dueTime || null,
      repeat: (data.repeat !== "none" ? data.repeat : null) as RepeatInterval | null,
      link: data.link || null,
      linkedScheduleId: null,
      isTaskList: false,
    });
    setIsAddTaskOpen(false);
  };

  const onAddList = (data: any) => {
    const validSubTasks = newSubTaskInputs
      .filter(t => t.trim())
      .map(text => ({ id: crypto.randomUUID(), text: text.trim(), done: false }));
    addChecklistItem({
      text: data.title,
      subjectId: data.subjectId || null,
      done: false,
      linkedScheduleId: null,
      isTaskList: true,
      subTasks: validSubTasks,
    });
    setNewSubTaskInputs(['']);
    setIsAddListOpen(false);
  };

  const { register: registerList, handleSubmit: handleListSubmit, reset: resetList } = useForm({
    defaultValues: { title: "", subjectId: "" },
  });

  const openEditItem = (id: string) => setEditingItemId(id);

  const getEditDefaults = (id: string): TaskFormValues => {
    const item = checklist.find(c => c.id === id);
    if (!item) return DEFAULT_TASK;
    return {
      text: item.text,
      description: item.description || "",
      importance: item.importance || "",
      dueDate: item.dueDate || "",
      dueTime: item.dueTime || "",
      repeat: item.repeat || "none",
      subjectId: item.subjectId || "",
      link: item.link || "",
    };
  };

  const onEditTask = (data: TaskFormValues) => {
    if (!editingItemId) return;
    updateChecklistItem(editingItemId, {
      text: data.text,
      description: data.description || undefined,
      subjectId: data.subjectId || null,
      importance: (data.importance as ImportanceLevel) || null,
      dueDate: data.dueDate || null,
      dueTime: data.dueTime || null,
      repeat: (data.repeat !== "none" ? data.repeat : null) as RepeatInterval | null,
      link: data.link || null,
    });
    setEditingItemId(null);
  };

  // Toggle did-not-do (cycles: undone → done → didNotDo → undone)
  const cycleStatus = (id: string) => {
    const item = checklist.find(c => c.id === id);
    if (!item) return;
    if (!item.done && !item.didNotDo) {
      // undone → done
      toggleChecklistItem(id);
    } else if (item.done) {
      // done → didNotDo
      updateChecklistItem(id, { done: false, didNotDo: true });
    } else {
      // didNotDo → undone
      updateChecklistItem(id, { done: false, didNotDo: false });
    }
  };

  const toggleExpanded = (id: string) => {
    setExpandedItems(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleAddSubTaskInline = (itemId: string) => {
    const text = newSubTaskText.trim();
    if (text) { addSubTask(itemId, text); setNewSubTaskText(''); setAddingSubTaskFor(null); }
  };

  const saveEditSubTask = () => {
    if (!editingSubTask || !editSubTaskText.trim()) return;
    updateSubTask(editingSubTask.itemId, editingSubTask.subTaskId, { text: editSubTaskText.trim() });
    setEditingSubTask(null);
  };

  // ── Filtering ──────────────────────────────────────────────────────────────

  const filteredChecklist = useMemo(() => {
    return checklist.filter(item => {
      // importance
      if (filters.importance.length > 0) {
        if (!item.importance || !filters.importance.includes(item.importance)) return false;
      }
      // status
      if (filters.status.length > 0) {
        const status = item.done ? "done" : item.didNotDo ? "didNotDo" : "undone";
        if (!filters.status.includes(status as any)) return false;
      }
      // repeat
      if (filters.repeat.length > 0) {
        const isRepeating = !!item.repeat && item.repeat !== "none";
        if (filters.repeat.includes("repeating") && !isRepeating) return false;
        if (filters.repeat.includes("oneTime") && isRepeating) return false;
      }
      // hasDueDate
      if (filters.hasDueDate === true && !item.dueDate) return false;
      if (filters.hasDueDate === false && !!item.dueDate) return false;
      return true;
    });
  }, [checklist, filters]);

  // ── Grouping ───────────────────────────────────────────────────────────────

  const groups: Record<string, typeof filteredChecklist> = {};
  filteredChecklist.forEach(item => {
    const key = item.subjectId || "uncategorized";
    if (!groups[key]) groups[key] = [];
    groups[key].push(item);
  });

  const sortedKeys = Object.keys(groups).sort((a, b) => {
    if (a === "uncategorized") return 1;
    if (b === "uncategorized") return -1;
    const subA = subjects.find(s => s.id === a);
    const subB = subjects.find(s => s.id === b);
    return (subA?.name || "").localeCompare(subB?.name || "");
  });

  // ── Due date helpers ───────────────────────────────────────────────────────

  const dueBadge = (item: typeof checklist[number]) => {
    if (!item.dueDate) return null;
    try {
      const date = parseISO(item.dueDate);
      const overdue = !item.done && !item.didNotDo && isPast(date) && !isToday(date);
      const due = isToday(date);
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

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-8 pb-24">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold tracking-tight mb-1">Checklist</h1>
          <p className="text-muted-foreground">
            {filteredChecklist.filter(c => !c.done && !c.didNotDo).length} remaining
            {filterCount > 0 && <span className="text-primary font-medium"> · filtered</span>}
          </p>
        </div>

        {/* Filter button */}
        <button
          onClick={() => setIsFilterOpen(true)}
          className="relative flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border bg-card hover:bg-secondary/60 transition-colors text-sm font-medium"
        >
          <SlidersHorizontal className="w-4 h-4" />
          Filters
          {filterCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">
              {filterCount}
            </span>
          )}
        </button>
      </div>

      {/* Task list */}
      {filteredChecklist.length === 0 ? (
        <GlassCard className="p-12 text-center border-dashed border-2 bg-transparent mt-12">
          {filterCount > 0 ? (
            <>
              <h2 className="text-xl font-semibold mb-2">No tasks match your filters</h2>
              <button onClick={() => setFilters(EMPTY_FILTERS)} className="text-primary text-sm mt-1 flex items-center gap-1 mx-auto">
                <RotateCcw className="w-3.5 h-3.5" /> Clear filters
              </button>
            </>
          ) : (
            <>
              <h2 className="text-2xl font-semibold mb-2">All clear!</h2>
              <p className="text-muted-foreground">Tap + to add a task.</p>
            </>
          )}
        </GlassCard>
      ) : (
        <div className="space-y-8">
          {sortedKeys.map(key => {
            const items = groups[key];
            const subject = subjects.find(s => s.id === key);
            const sorted = [...items].sort((a, b) => Number(a.done || a.didNotDo) - Number(b.done || b.didNotDo));

            return (
              <div key={key} className="space-y-3">
                <h2 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2 px-1 text-muted-foreground">
                  {subject && <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: subject.color }} />}
                  {subject ? subject.name : "Other Tasks"}
                  <span className="font-normal">({items.length})</span>
                </h2>

                <div className="space-y-2">
                  <AnimatePresence initial={false}>
                    {sorted.map(item => {
                      const isExpanded = expandedItems.has(item.id);
                      const subTasks = item.subTasks || [];
                      const imp = item.importance ? IMPORTANCE_META[item.importance] : null;

                      return (
                        <motion.div
                          key={item.id}
                          layout
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          transition={{ type: "spring", stiffness: 300, damping: 28 }}
                        >
                          <SwipeableRow
                            onEdit={() => openEditItem(item.id)}
                            onDelete={() => deleteChecklistItem(item.id)}
                          >
                            <GlassCard className={`transition-opacity duration-300 overflow-hidden ${
                              (item.done || item.didNotDo) ? "opacity-50" : "opacity-100"
                            }`}>
                              {/* Main row */}
                              <div className="p-4 flex items-start gap-3 group">

                                {/* Status button — cycles undone → done → didNotDo */}
                                <button
                                  onClick={() => cycleStatus(item.id)}
                                  className="shrink-0 mt-0.5 focus:outline-none"
                                  data-testid={`checkbox-item-${item.id}`}
                                >
                                  <motion.div whileTap={{ scale: 0.75 }}>
                                    {item.done ? (
                                      <CheckCircle2 className="w-6 h-6 text-primary" />
                                    ) : item.didNotDo ? (
                                      <XCircle className="w-6 h-6 text-muted-foreground" />
                                    ) : (
                                      <Circle className="w-6 h-6 text-muted-foreground hover:text-primary transition-colors" />
                                    )}
                                  </motion.div>
                                </button>

                                {/* Content */}
                                <div
                                  className={`flex-1 min-w-0 ${item.isTaskList ? "cursor-pointer select-none" : ""}`}
                                  onClick={() => item.isTaskList && toggleExpanded(item.id)}
                                >
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className={`text-base font-medium truncate transition-all ${
                                      item.done ? "line-through text-muted-foreground" :
                                      item.didNotDo ? "line-through text-muted-foreground/60" : ""
                                    }`}>
                                      {item.text}
                                    </span>
                                    {item.isTaskList && (
                                      <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded-full shrink-0">
                                        {subTasks.filter(st => st.done).length}/{subTasks.length}
                                      </span>
                                    )}
                                    {item.didNotDo && (
                                      <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full shrink-0">
                                        Skipped
                                      </span>
                                    )}
                                  </div>

                                  {/* Description */}
                                  {item.description && (
                                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{item.description}</p>
                                  )}

                                  {/* Badges row */}
                                  {(imp || item.dueDate || item.repeat) && (
                                    <div className="flex items-center flex-wrap gap-1.5 mt-1.5">
                                      {imp && (
                                        <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium bg-muted ${imp.color}`}>
                                          <span className={`w-1.5 h-1.5 rounded-full ${imp.dot}`} />
                                          {imp.label}
                                        </span>
                                      )}
                                      {dueBadge(item)}
                                      {item.repeat && item.repeat !== "none" && (
                                        <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                                          <Repeat className="w-3 h-3" />
                                          {REPEAT_META[item.repeat]}
                                        </span>
                                      )}
                                      {item.link && (
                                        <a
                                          href={item.link}
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

                                {/* Expand chevron */}
                                {item.isTaskList && (
                                  <button
                                    onClick={() => toggleExpanded(item.id)}
                                    className="p-1 text-muted-foreground hover:text-foreground transition-colors shrink-0 mt-0.5"
                                  >
                                    {isExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                                  </button>
                                )}

                                {/* Edit */}
                                <button
                                  onClick={() => openEditItem(item.id)}
                                  className={`p-2 text-muted-foreground hover:text-foreground transition-opacity shrink-0 ${
                                    (item.done || item.didNotDo) ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                                  }`}
                                >
                                  <Pencil className="w-4 h-4" />
                                </button>

                                {/* Delete */}
                                <button
                                  onClick={() => deleteChecklistItem(item.id)}
                                  className={`p-2 text-muted-foreground hover:text-destructive transition-opacity shrink-0 ${
                                    (item.done || item.didNotDo) ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                                  }`}
                                >
                                  <Trash2 className="w-5 h-5" />
                                </button>
                              </div>

                              {/* Sub-tasks */}
                              <AnimatePresence initial={false}>
                                {item.isTaskList && isExpanded && (
                                  <motion.div
                                    key="subtasks"
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: "auto", opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ type: "spring", damping: 26, stiffness: 280 }}
                                    className="overflow-hidden"
                                  >
                                    <div className="px-4 pb-4 pt-0 ml-9 border-t border-border/40 space-y-2">
                                      <div className="pt-3 space-y-2">
                                        {subTasks.map(st => (
                                          <div key={st.id} className="flex items-center gap-3 group/sub">
                                            <button onClick={() => toggleSubTask(item.id, st.id)} className="shrink-0">
                                              <motion.div whileTap={{ scale: 0.75 }}>
                                                {st.done
                                                  ? <CheckCircle2 className="w-5 h-5 text-primary" />
                                                  : <Circle className="w-5 h-5 text-muted-foreground hover:text-primary transition-colors" />}
                                              </motion.div>
                                            </button>

                                            {editingSubTask?.subTaskId === st.id ? (
                                              <form onSubmit={e => { e.preventDefault(); saveEditSubTask(); }} className="flex-1 flex gap-2">
                                                <input
                                                  autoFocus value={editSubTaskText}
                                                  onChange={e => setEditSubTaskText(e.target.value)}
                                                  onKeyDown={e => e.key === "Escape" && setEditingSubTask(null)}
                                                  className="flex-1 text-sm bg-background border border-border rounded-lg px-3 py-1 focus:outline-none focus:ring-1 focus:ring-primary/50"
                                                />
                                                <button type="submit" className="text-xs text-primary font-semibold px-2">Save</button>
                                                <button type="button" onClick={() => setEditingSubTask(null)} className="text-xs text-muted-foreground px-1">✕</button>
                                              </form>
                                            ) : (
                                              <span className={`flex-1 text-sm ${st.done ? "line-through text-muted-foreground" : ""}`}>
                                                {st.text}
                                              </span>
                                            )}

                                            {editingSubTask?.subTaskId !== st.id && (
                                              <button
                                                onClick={() => { setEditingSubTask({ itemId: item.id, subTaskId: st.id }); setEditSubTaskText(st.text); }}
                                                className="p-1 text-muted-foreground hover:text-foreground opacity-0 group-hover/sub:opacity-100 transition-opacity shrink-0"
                                              >
                                                <Pencil className="w-3.5 h-3.5" />
                                              </button>
                                            )}
                                            <button
                                              onClick={() => deleteSubTask(item.id, st.id)}
                                              className="p-1 text-muted-foreground hover:text-destructive opacity-0 group-hover/sub:opacity-100 transition-opacity shrink-0"
                                            >
                                              <X className="w-4 h-4" />
                                            </button>
                                          </div>
                                        ))}
                                      </div>

                                      {addingSubTaskFor === item.id ? (
                                        <form onSubmit={e => { e.preventDefault(); handleAddSubTaskInline(item.id); }} className="flex gap-2 pt-1">
                                          <input
                                            autoFocus value={newSubTaskText}
                                            onChange={e => setNewSubTaskText(e.target.value)}
                                            onKeyDown={e => e.key === "Escape" && setAddingSubTaskFor(null)}
                                            className="flex-1 text-sm bg-background border border-border rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary/50"
                                            placeholder="New sub-task…"
                                          />
                                          <button type="submit" className="text-xs text-primary font-semibold px-2">Add</button>
                                          <button type="button" onClick={() => setAddingSubTaskFor(null)} className="text-xs text-muted-foreground">✕</button>
                                        </form>
                                      ) : (
                                        <button
                                          onClick={() => setAddingSubTaskFor(item.id)}
                                          className="flex items-center gap-1 text-xs text-primary/70 hover:text-primary transition-colors pt-1"
                                        >
                                          <Plus className="w-3.5 h-3.5" /> Add sub-task
                                        </button>
                                      )}
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </GlassCard>
                          </SwipeableRow>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── FAB + action menu ──────────────────────────────────────────────── */}
      <FabPortal>
        <AnimatePresence>
          {showActionMenu && (
            <>
              <motion.div
                key="backdrop"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 z-30"
                onClick={() => setShowActionMenu(false)}
              />
              <motion.div
                key="menu"
                initial={{ opacity: 0, scale: 0.9, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 8 }}
                transition={{ type: "spring", stiffness: 350, damping: 28 }}
                className="fixed bottom-40 md:bottom-28 right-6 md:right-10 z-50 bg-card/95 backdrop-blur-xl border border-border rounded-2xl shadow-2xl overflow-hidden min-w-[180px]"
              >
                <button
                  onClick={() => { setShowActionMenu(false); setIsAddTaskOpen(true); }}
                  className="flex items-center gap-3 px-5 py-4 hover:bg-secondary/60 transition-colors w-full text-left"
                >
                  <List className="w-5 h-5 text-primary shrink-0" />
                  <span className="font-medium">Single Task</span>
                </button>
                <div className="h-px bg-border/60 mx-3" />
                <button
                  onClick={() => { setShowActionMenu(false); setIsAddListOpen(true); }}
                  className="flex items-center gap-3 px-5 py-4 hover:bg-secondary/60 transition-colors w-full text-left"
                >
                  <ListChecks className="w-5 h-5 text-primary shrink-0" />
                  <span className="font-medium">Task List</span>
                </button>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        <motion.button
          onClick={() => setShowActionMenu(!showActionMenu)}
          whileTap={{ scale: 0.88 }}
          className="fixed bottom-24 md:bottom-10 right-6 md:right-10 w-14 h-14 bg-primary text-primary-foreground rounded-full shadow-lg shadow-primary/30 flex items-center justify-center z-40"
          data-testid="btn-open-add-menu"
        >
          <motion.div animate={{ rotate: showActionMenu ? 45 : 0 }} transition={{ type: "spring", stiffness: 320, damping: 24 }}>
            <Plus className="w-6 h-6" />
          </motion.div>
        </motion.button>
      </FabPortal>

      {/* ── Add Single Task ────────────────────────────────────────────────── */}
      {isAddTaskOpen && (
        <TaskForm
          title="New Task"
          defaultValues={DEFAULT_TASK}
          subjects={subjects}
          onSubmit={onAddTask}
          onClose={() => setIsAddTaskOpen(false)}
          submitLabel="Add Task"
        />
      )}

      {/* ── Add Task List ──────────────────────────────────────────────────── */}
      <BottomSheet isOpen={isAddListOpen} onClose={() => { setIsAddListOpen(false); setNewSubTaskInputs(['']); }} title="New Task List">
        <form onSubmit={handleListSubmit(onAddList)} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">List Title</label>
            <input
              {...registerList("title", { required: true })}
              className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              placeholder="e.g. Chapter 5 Study Plan"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Subject (optional)</label>
            <select
              {...registerList("subjectId")}
              className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 appearance-none"
            >
              <option value="">No subject</option>
              {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Sub-tasks</label>
            <div className="space-y-2">
              {newSubTaskInputs.map((val, idx) => (
                <div key={idx} className="flex gap-2">
                  <input
                    value={val}
                    onChange={e => { const u = [...newSubTaskInputs]; u[idx] = e.target.value; setNewSubTaskInputs(u); }}
                    className="flex-1 bg-background border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                    placeholder={`Sub-task ${idx + 1}`}
                  />
                  {newSubTaskInputs.length > 1 && (
                    <button type="button" onClick={() => setNewSubTaskInputs(prev => prev.filter((_, i) => i !== idx))} className="p-2 text-muted-foreground hover:text-destructive">
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button type="button" onClick={() => setNewSubTaskInputs(prev => [...prev, ''])} className="flex items-center gap-2 text-sm text-primary hover:underline mt-3">
              <Plus className="w-4 h-4" /> Add another sub-task
            </button>
          </div>
          <button type="submit" className="w-full bg-primary text-primary-foreground font-semibold rounded-xl py-3.5">
            Create Task List
          </button>
        </form>
      </BottomSheet>

      {/* ── Edit Task ─────────────────────────────────────────────────────── */}
      {editingItemId && (() => {
        const item = checklist.find(c => c.id === editingItemId);
        if (!item || item.isTaskList) {
          // For task lists just edit the title inline via a simple sheet
          return (
            <BottomSheet isOpen onClose={() => setEditingItemId(null)} title="Edit Task List">
              <div className="space-y-5">
                <input
                  autoFocus
                  defaultValue={item?.text}
                  onKeyDown={e => {
                    if (e.key === "Enter") {
                      updateChecklistItem(editingItemId, { text: (e.target as HTMLInputElement).value.trim() });
                      setEditingItemId(null);
                    }
                    if (e.key === "Escape") setEditingItemId(null);
                  }}
                  className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
                <button
                  onClick={() => {
                    const el = document.querySelector<HTMLInputElement>('input[defaultValue]');
                    // handled via onKeyDown above; close anyway
                    setEditingItemId(null);
                  }}
                  className="w-full bg-primary text-primary-foreground font-semibold rounded-xl py-3.5"
                >
                  Save
                </button>
              </div>
            </BottomSheet>
          );
        }
        return (
          <TaskForm
            title="Edit Task"
            defaultValues={getEditDefaults(editingItemId)}
            subjects={subjects}
            onSubmit={onEditTask}
            onClose={() => setEditingItemId(null)}
            submitLabel="Save Changes"
          />
        );
      })()}

      {/* ── Filter sheet ──────────────────────────────────────────────────── */}
      <BottomSheet isOpen={isFilterOpen} onClose={() => setIsFilterOpen(false)} title="Filters">
        <div className="space-y-6 pb-2">

          {/* Importance */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Importance</p>
            <div className="flex flex-wrap gap-2">
              {(["high", "medium", "low"] as ImportanceLevel[]).map(val => (
                <Chip key={val} active={filters.importance.includes(val)} onClick={() => setFilters(f => ({ ...f, importance: toggleArr(f.importance, val) }))}>
                  {val === "high" ? "🔴" : val === "medium" ? "🟡" : "🟢"} {IMPORTANCE_META[val].label}
                </Chip>
              ))}
            </div>
          </div>

          {/* Status */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Status</p>
            <div className="flex flex-wrap gap-2">
              {[
                { val: "undone" as const, label: "Unchecked" },
                { val: "done" as const, label: "Checked" },
                { val: "didNotDo" as const, label: "Did Not Do" },
              ].map(({ val, label }) => (
                <Chip key={val} active={filters.status.includes(val)} onClick={() => setFilters(f => ({ ...f, status: toggleArr(f.status, val) }))}>
                  {label}
                </Chip>
              ))}
            </div>
          </div>

          {/* Repeat */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Type</p>
            <div className="flex flex-wrap gap-2">
              <Chip active={filters.repeat.includes("repeating")} onClick={() => setFilters(f => ({ ...f, repeat: toggleArr(f.repeat, "repeating") }))}>
                🔁 Repeating
              </Chip>
              <Chip active={filters.repeat.includes("oneTime")} onClick={() => setFilters(f => ({ ...f, repeat: toggleArr(f.repeat, "oneTime") }))}>
                One-Time
              </Chip>
            </div>
          </div>

          {/* Due date */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Due Date</p>
            <div className="flex flex-wrap gap-2">
              <Chip active={filters.hasDueDate === true} onClick={() => setFilters(f => ({ ...f, hasDueDate: f.hasDueDate === true ? null : true }))}>
                Has due date
              </Chip>
              <Chip active={filters.hasDueDate === false} onClick={() => setFilters(f => ({ ...f, hasDueDate: f.hasDueDate === false ? null : false }))}>
                No due date
              </Chip>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={() => setFilters(EMPTY_FILTERS)}
              className="flex-1 border border-border rounded-xl py-3 text-sm font-medium hover:bg-secondary/60 transition-colors flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-4 h-4" /> Clear all
            </button>
            <button
              onClick={() => setIsFilterOpen(false)}
              className="flex-1 bg-primary text-primary-foreground rounded-xl py-3 text-sm font-semibold"
            >
              Apply
            </button>
          </div>
        </div>
      </BottomSheet>
    </div>
  );
}
