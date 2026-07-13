import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { useStudyData } from "@/hooks/useStudyData";
import { type ImportanceLevel, type RepeatInterval } from "@/hooks/useStudyData";
import { GlassCard } from "@/components/shared/GlassCard";
import { BottomSheet } from "@/components/shared/BottomSheet";
import { FabPortal } from "@/components/shared/FabPortal";
import { SwipeableRow, type SwipeAction } from "@/components/shared/SwipeableRow";
import {
  TaskForm, TaskFormValues, DEFAULT_TASK, IMPORTANCE_META, REPEAT_META,
} from "@/components/shared/TaskForm";
import {
  Plus, CheckCircle2, Circle, XCircle, Trash2,
  List, ListChecks, ChevronRight,
  SlidersHorizontal, RotateCcw, Link as LinkIcon,
  Clock, Repeat,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { format, isToday, isPast, parseISO } from "date-fns";

// ── Filter types ──────────────────────────────────────────────────────────────

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

// ── Swipe action configs ──────────────────────────────────────────────────────

const DELETE_ACTION: SwipeAction = {
  icon: <Trash2 className="w-5 h-5" />,
  label: "Delete",
  bg: "bg-destructive/15",
  color: "text-destructive",
};

function getCycleAction(done: boolean, didNotDo?: boolean): SwipeAction {
  if (!done && !didNotDo) return {
    icon: <CheckCircle2 className="w-5 h-5" />,
    label: "Done",
    bg: "bg-emerald-500/15",
    color: "text-emerald-600",
  };
  if (done) return {
    icon: <XCircle className="w-5 h-5" />,
    label: "Skip",
    bg: "bg-slate-400/15",
    color: "text-slate-500",
  };
  return {
    icon: <RotateCcw className="w-5 h-5" />,
    label: "Undo",
    bg: "bg-primary/15",
    color: "text-primary",
  };
}

// ── Main Checklist component ──────────────────────────────────────────────────

export function Checklist() {
  const {
    checklist, subjects,
    toggleChecklistItem, deleteChecklistItem, addChecklistItem, updateChecklistItem,
    setCascadeChecklistStatus,
  } = useStudyData();
  const [, navigate] = useLocation();

  // UI state
  const [showActionMenu, setShowActionMenu] = useState(false);
  const [isAddTaskOpen, setIsAddTaskOpen]   = useState(false);
  const [isAddListOpen, setIsAddListOpen]   = useState(false);
  const [isFilterOpen, setIsFilterOpen]     = useState(false);
  const [editingItemId, setEditingItemId]   = useState<string | null>(null);

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
      dueDate: data.dueDate || (data.repeat && data.repeat !== "none"
        ? format(new Date(), "yyyy-MM-dd")
        : null),
      dueTime: data.dueTime || null,
      repeat: (data.repeat !== "none" ? data.repeat : null) as RepeatInterval | null,
      link: data.link || null,
      linkedScheduleId: null,
      isTaskList: false,
    });
    setIsAddTaskOpen(false);
  };

  const onAddList = (data: TaskFormValues) => {
    addChecklistItem({
      text: data.text,
      description: data.description || undefined,
      subjectId: data.subjectId || null,
      done: false,
      didNotDo: false,
      importance: (data.importance as ImportanceLevel) || null,
      dueDate: data.dueDate || (data.repeat && data.repeat !== "none"
        ? format(new Date(), "yyyy-MM-dd")
        : null),
      dueTime: data.dueTime || null,
      repeat: (data.repeat !== "none" ? data.repeat : null) as RepeatInterval | null,
      link: data.link || null,
      linkedScheduleId: null,
      isTaskList: true,
      subTasks: [],
    });
    setIsAddListOpen(false);
  };

  const openEdit = (id: string) => setEditingItemId(id);

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
      dueDate: data.dueDate || (data.repeat && data.repeat !== "none"
        ? format(new Date(), "yyyy-MM-dd")
        : null),
      dueTime: data.dueTime || null,
      repeat: (data.repeat !== "none" ? data.repeat : null) as RepeatInterval | null,
      link: data.link || null,
    });
    setEditingItemId(null);
  };

  // Cycles: undone → done → didNotDo → undone
  // For task lists, cascades the new status to every sub-task.
  const cycleStatus = (id: string) => {
    const item = checklist.find(c => c.id === id);
    if (!item) return;
    if (!item.done && !item.didNotDo) {
      setCascadeChecklistStatus(id, true, false);   // → done
    } else if (item.done) {
      setCascadeChecklistStatus(id, false, true);   // → skipped
    } else {
      setCascadeChecklistStatus(id, false, false);  // → undone
    }
  };

  // ── Filtering ──────────────────────────────────────────────────────────────

  const filteredChecklist = useMemo(() => {
    return checklist.filter(item => {
      if (filters.importance.length > 0) {
        if (!item.importance || !filters.importance.includes(item.importance)) return false;
      }
      if (filters.status.length > 0) {
        const status = item.done ? "done" : item.didNotDo ? "didNotDo" : "undone";
        if (!filters.status.includes(status as any)) return false;
      }
      if (filters.repeat.length > 0) {
        const isRepeating = !!item.repeat && item.repeat !== "none";
        if (filters.repeat.includes("repeating") && !isRepeating) return false;
        if (filters.repeat.includes("oneTime") && isRepeating) return false;
      }
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
    return (subjects.find(s => s.id === a)?.name || "").localeCompare(subjects.find(s => s.id === b)?.name || "");
  });

  // ── Due date badge ─────────────────────────────────────────────────────────

  const dueBadge = (item: typeof checklist[number]) => {
    if (!item.dueDate) return null;
    try {
      const date    = parseISO(item.dueDate);
      const overdue = !item.done && !item.didNotDo && isPast(date) && !isToday(date);
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

  // ── Editing item lookup ────────────────────────────────────────────────────

  const editingItem = editingItemId ? checklist.find(c => c.id === editingItemId) : null;

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
            const items   = groups[key];
            const subject = subjects.find(s => s.id === key);
            const sorted  = [...items].sort((a, b) => Number(a.done || a.didNotDo) - Number(b.done || b.didNotDo));

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
                      const subTasks = item.subTasks || [];
                      const imp      = item.importance ? IMPORTANCE_META[item.importance] : null;
                      const isListTask = item.isTaskList;

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
                            onEdit={() => deleteChecklistItem(item.id)}
                            onDelete={() => cycleStatus(item.id)}
                            editAction={DELETE_ACTION}
                            deleteAction={getCycleAction(item.done, item.didNotDo)}
                          >
                            <GlassCard className={`transition-opacity duration-300 ${
                              (item.done || item.didNotDo) ? "opacity-50" : "opacity-100"
                            }`}>
                              <div className="p-4 flex items-start gap-3">

                                {/* Clickable content area */}
                                <div
                                  className="flex-1 min-w-0 py-0.5 cursor-pointer select-none"
                                  onClick={() => isListTask
                                    ? navigate(`/checklist/${item.id}`)
                                    : openEdit(item.id)
                                  }
                                >
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className={`text-base font-medium truncate transition-all ${
                                      item.done     ? "line-through text-muted-foreground" :
                                      item.didNotDo ? "line-through text-muted-foreground/60" : ""
                                    }`}>
                                      {item.text}
                                    </span>

                                    {/* List task progress badge */}
                                    {isListTask && (
                                      <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded-full shrink-0 flex items-center gap-1">
                                        <ListChecks className="w-3 h-3" />
                                        {subTasks.filter(st => st.done).length + subTasks.filter(st => st.didNotDo).length}/{subTasks.length}
                                      </span>
                                    )}

                                    {item.didNotDo && (
                                      <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full shrink-0">
                                        Skipped
                                      </span>
                                    )}
                                  </div>

                                  {item.description && (
                                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{item.description}</p>
                                  )}

                                  {/* Badges */}
                                  {(imp || item.dueDate || item.repeat || item.link) && (
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

                                {/* Right side: chevron for lists, status button for tasks */}
                                {isListTask ? (
                                  <button
                                    onClick={() => navigate(`/checklist/${item.id}`)}
                                    className="shrink-0 mt-0.5 p-1 text-muted-foreground hover:text-foreground transition-colors"
                                  >
                                    <ChevronRight className="w-5 h-5" />
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => cycleStatus(item.id)}
                                    className="shrink-0 mt-0.5 p-1 hover:scale-110 transition-transform focus:outline-none"
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
                                )}
                              </div>
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

      {/* ── FAB + action menu ───────────────────────────────────────────────── */}
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

      {/* ── Add Single Task ─────────────────────────────────────────────────── */}
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

      {/* ── Add Task List ────────────────────────────────────────────────────── */}
      {isAddListOpen && (
        <TaskForm
          title="New Task List"
          defaultValues={DEFAULT_TASK}
          subjects={subjects}
          onSubmit={onAddList}
          onClose={() => setIsAddListOpen(false)}
          submitLabel="Create Task List"
        />
      )}

      {/* ── Edit Task / Edit Task List ────────────────────────────────────────── */}
      {/* Task lists share the same form as single tasks now, so they can be
          given a due date/time and repeat interval just like regular tasks. */}
      {editingItemId && editingItem && (
        <TaskForm
          title={editingItem.isTaskList ? "Edit Task List" : "Edit Task"}
          defaultValues={getEditDefaults(editingItemId)}
          subjects={subjects}
          onSubmit={onEditTask}
          onClose={() => setEditingItemId(null)}
          submitLabel="Save Changes"
        />
      )}

      {/* ── Filter sheet ─────────────────────────────────────────────────────── */}
      <BottomSheet isOpen={isFilterOpen} onClose={() => setIsFilterOpen(false)} title="Filters">
        <div className="space-y-6 pb-2">

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

          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Status</p>
            <div className="flex flex-wrap gap-2">
              {[
                { val: "undone" as const, label: "Unchecked" },
                { val: "done" as const,   label: "Checked" },
                { val: "didNotDo" as const, label: "Skipped" },
              ].map(({ val, label }) => (
                <Chip key={val} active={filters.status.includes(val)} onClick={() => setFilters(f => ({ ...f, status: toggleArr(f.status, val) }))}>
                  {label}
                </Chip>
              ))}
            </div>
          </div>

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

          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Due Date</p>
            <div className="flex flex-wrap gap-2">
              <Chip active={filters.hasDueDate === true}  onClick={() => setFilters(f => ({ ...f, hasDueDate: f.hasDueDate === true ? null : true }))}>
                Has due date
              </Chip>
              <Chip active={filters.hasDueDate === false} onClick={() => setFilters(f => ({ ...f, hasDueDate: f.hasDueDate === false ? null : false }))}>
                No due date
              </Chip>
            </div>
          </div>

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
