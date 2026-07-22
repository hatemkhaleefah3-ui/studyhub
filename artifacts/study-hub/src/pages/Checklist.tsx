import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { useStudyData } from "@/hooks/useStudyData";
import { type ChecklistItem, type ImportanceLevel, type RepeatInterval } from "@/hooks/useStudyData";
import { GlassCard } from "@/components/shared/GlassCard";
import { BottomSheet } from "@/components/shared/BottomSheet";
import { FabPortal } from "@/components/shared/FabPortal";
import { SwipeableRow, type SwipeAction } from "@/components/shared/SwipeableRow";
import {
  TaskForm,
  type TaskFormValues,
  DEFAULT_TASK,
  IMPORTANCE_META,
  REPEAT_META,
} from "@/components/shared/TaskForm";
import {
  Plus,
  CheckCircle2,
  Circle,
  XCircle,
  Trash2,
  Pencil,
  List,
  ListChecks,
  ChevronRight,
  SlidersHorizontal,
  RotateCcw,
  Clock,
  Repeat,
  Sparkles,
  Target,
} from "lucide-react";
import { LinkChip } from "@/components/shared/LinkChip";
import { AnimatePresence, motion } from "framer-motion";
import { format, isPast, isToday, parseISO } from "date-fns";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface Filters {
  importance: ImportanceLevel[];
  status: ("done" | "undone" | "didNotDo")[];
  repeat: ("repeating" | "oneTime")[];
  hasDueDate: boolean | null;
}

const EMPTY_FILTERS: Filters = {
  importance: [],
  status: [],
  repeat: [],
  hasDueDate: null,
};

function toggleArr<T>(arr: T[], value: T): T[] {
  return arr.includes(value) ? arr.filter((item) => item !== value) : [...arr, value];
}

function activeFilterCount(filters: Filters) {
  return (
    filters.importance.length +
    filters.status.length +
    filters.repeat.length +
    (filters.hasDueDate !== null ? 1 : 0)
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3.5 py-1.5 text-sm font-medium transition-all duration-200 ${
        active
          ? "border-primary bg-primary text-primary-foreground shadow-sm shadow-primary/20"
          : "border-border bg-secondary/50 text-foreground hover:bg-secondary"
      }`}
    >
      {children}
    </button>
  );
}

const EDIT_ACTION: SwipeAction = {
  icon: <Pencil className="h-5 w-5" />,
  label: "Edit",
  bg: "bg-primary/15",
  color: "text-primary",
};

const DELETE_ACTION: SwipeAction = {
  icon: <Trash2 className="h-5 w-5" />,
  label: "Delete",
  bg: "bg-destructive/15",
  color: "text-destructive",
};

function SortableItem({ id, children }: { id: string; children: React.ReactNode }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.86 : 1,
    scale: isDragging ? "1.02" : undefined,
    zIndex: isDragging ? 30 : undefined,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      {children}
    </div>
  );
}

function statusLabel(item: ChecklistItem) {
  if (item.done) return "Completed";
  if (item.didNotDo) return "Skipped";
  return "Active";
}

export function Checklist() {
  const {
    checklist,
    subjects,
    deleteChecklistItem,
    addChecklistItem,
    updateChecklistItem,
    setCascadeChecklistStatus,
    reorderChecklistItems,
  } = useStudyData();
  const [, navigate] = useLocation();

  const [showActionMenu, setShowActionMenu] = useState(false);
  const [isAddTaskOpen, setIsAddTaskOpen] = useState(false);
  const [isAddListOpen, setIsAddListOpen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);

  const filterCount = activeFilterCount(filters);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { delay: 400, tolerance: 5 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 400, tolerance: 5 },
    }),
  );

  const onAddTask = (data: TaskFormValues) => {
    addChecklistItem({
      text: data.text,
      description: data.description || undefined,
      subjectId: data.subjectId || null,
      done: false,
      didNotDo: false,
      importance: (data.importance as ImportanceLevel) || null,
      dueDate:
        data.dueDate ||
        (data.repeat && data.repeat !== "none" ? format(new Date(), "yyyy-MM-dd") : null),
      dueTime: data.dueTime || null,
      repeat: (data.repeat !== "none" ? data.repeat : null) as RepeatInterval | null,
      repeatWeekDays: data.repeatWeekDays?.length ? data.repeatWeekDays : undefined,
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
      dueDate:
        data.dueDate ||
        (data.repeat && data.repeat !== "none" ? format(new Date(), "yyyy-MM-dd") : null),
      dueTime: data.dueTime || null,
      repeat: (data.repeat !== "none" ? data.repeat : null) as RepeatInterval | null,
      repeatWeekDays: data.repeatWeekDays?.length ? data.repeatWeekDays : undefined,
      link: data.link || null,
      linkedScheduleId: null,
      isTaskList: true,
      subTasks: [],
    });
    setIsAddListOpen(false);
  };

  const getEditDefaults = (id: string): TaskFormValues => {
    const item = checklist.find((entry) => entry.id === id);
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
      repeatWeekDays: item.repeatWeekDays || [],
    };
  };

  const onEditTask = (data: TaskFormValues) => {
    if (!editingItemId) return;
    updateChecklistItem(editingItemId, {
      text: data.text,
      description: data.description || undefined,
      subjectId: data.subjectId || null,
      importance: (data.importance as ImportanceLevel) || null,
      dueDate:
        data.dueDate ||
        (data.repeat && data.repeat !== "none" ? format(new Date(), "yyyy-MM-dd") : null),
      dueTime: data.dueTime || null,
      repeat: (data.repeat !== "none" ? data.repeat : null) as RepeatInterval | null,
      repeatWeekDays: data.repeatWeekDays?.length ? data.repeatWeekDays : undefined,
      link: data.link || null,
    });
    setEditingItemId(null);
  };

  const cycleStatus = (id: string) => {
    const item = checklist.find((entry) => entry.id === id);
    if (!item) return;
    if (!item.done && !item.didNotDo) {
      setCascadeChecklistStatus(id, true, false);
    } else if (item.done) {
      setCascadeChecklistStatus(id, false, true);
    } else {
      setCascadeChecklistStatus(id, false, false);
    }
  };

  const filteredChecklist = useMemo(
    () =>
      checklist.filter((item) => {
        if (
          filters.importance.length > 0 &&
          (!item.importance || !filters.importance.includes(item.importance))
        ) {
          return false;
        }
        if (filters.status.length > 0) {
          const status = item.done ? "done" : item.didNotDo ? "didNotDo" : "undone";
          if (!filters.status.includes(status)) return false;
        }
        if (filters.repeat.length > 0) {
          const repeating = Boolean(item.repeat && item.repeat !== "none");
          if (filters.repeat.includes("repeating") && !repeating) return false;
          if (filters.repeat.includes("oneTime") && repeating) return false;
        }
        if (filters.hasDueDate === true && !item.dueDate) return false;
        if (filters.hasDueDate === false && item.dueDate) return false;
        return true;
      }),
    [checklist, filters],
  );

  const sortedItems = useMemo(
    () =>
      [...filteredChecklist].sort((a, b) => {
        const aFinished = Number(a.done || a.didNotDo);
        const bFinished = Number(b.done || b.didNotDo);
        if (aFinished !== bFinished) return aFinished - bFinished;
        return (a.sortOrder ?? Infinity) - (b.sortOrder ?? Infinity);
      }),
    [filteredChecklist],
  );

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const oldIndex = sortedItems.findIndex((item) => item.id === active.id);
    const newIndex = sortedItems.findIndex((item) => item.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    reorderChecklistItems(arrayMove(sortedItems, oldIndex, newIndex).map((item) => item.id));
  };

  const dueBadge = (item: ChecklistItem) => {
    if (!item.dueDate) return null;
    try {
      const date = parseISO(item.dueDate);
      const overdue = !item.done && !item.didNotDo && isPast(date) && !isToday(date);
      const today = isToday(date);
      return (
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
            overdue
              ? "bg-rose-500/12 text-rose-500"
              : today
                ? "bg-amber-500/12 text-amber-600"
                : "bg-secondary text-muted-foreground"
          }`}
        >
          <Clock className="h-3 w-3" />
          {today ? "Today" : overdue ? "Overdue" : format(date, "MMM d")}
        </span>
      );
    } catch {
      return null;
    }
  };

  const editingItem = editingItemId
    ? checklist.find((entry) => entry.id === editingItemId)
    : null;
  const activeCount = filteredChecklist.filter((item) => !item.done && !item.didNotDo).length;
  const completedCount = filteredChecklist.filter((item) => item.done).length;
  const listCount = filteredChecklist.filter((item) => item.isTaskList).length;

  return (
    <div className="mx-auto max-w-4xl space-y-7 pb-24">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="mb-1 text-xs font-bold uppercase tracking-[0.22em] text-primary">
            Focus workspace
          </p>
          <h1 className="text-4xl font-black tracking-tight">Tasks</h1>
          <p className="mt-1 text-muted-foreground">
            {activeCount} remaining
            {filterCount > 0 && <span className="font-medium text-primary"> · filtered</span>}
          </p>
        </div>
        <button
          onClick={() => setIsFilterOpen(true)}
          className="relative flex min-h-11 items-center gap-2 rounded-2xl border border-border/70 bg-card px-4 py-2.5 text-sm font-semibold shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-secondary/60 hover:shadow-md"
        >
          <SlidersHorizontal className="h-4 w-4" />
          Filters
          {filterCount > 0 && (
            <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
              {filterCount}
            </span>
          )}
        </button>
      </div>

      <GlassCard className="relative overflow-hidden border-primary/15 bg-gradient-to-br from-primary/[0.08] via-card to-card p-5">
        <div className="pointer-events-none absolute -right-12 -top-14 h-36 w-36 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative grid grid-cols-3 divide-x divide-border/50">
          <div className="flex flex-col items-center gap-1 px-2 text-center">
            <Target className="h-5 w-5 text-primary" />
            <strong className="text-2xl font-black">{activeCount}</strong>
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Active</span>
          </div>
          <div className="flex flex-col items-center gap-1 px-2 text-center">
            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            <strong className="text-2xl font-black">{completedCount}</strong>
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Completed</span>
          </div>
          <div className="flex flex-col items-center gap-1 px-2 text-center">
            <ListChecks className="h-5 w-5 text-primary" />
            <strong className="text-2xl font-black">{listCount}</strong>
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Lists</span>
          </div>
        </div>
      </GlassCard>

      {filteredChecklist.length === 0 ? (
        <GlassCard className="border-2 border-dashed bg-transparent p-12 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Sparkles className="h-7 w-7" />
          </div>
          {filterCount > 0 ? (
            <>
              <h2 className="mb-2 text-xl font-bold">No tasks match your filters</h2>
              <button
                onClick={() => setFilters(EMPTY_FILTERS)}
                className="mx-auto mt-1 flex items-center gap-1 text-sm font-semibold text-primary"
              >
                <RotateCcw className="h-3.5 w-3.5" /> Clear filters
              </button>
            </>
          ) : (
            <>
              <h2 className="mb-2 text-2xl font-bold">Everything is clear</h2>
              <p className="text-muted-foreground">Tap + to add your next task.</p>
            </>
          )}
        </GlassCard>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={sortedItems.map((item) => item.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-3">
              <AnimatePresence initial={false}>
                {sortedItems.map((item) => {
                  const subTasks = item.subTasks || [];
                  const completedSubTasks = subTasks.filter((subTask) => subTask.done || subTask.didNotDo).length;
                  const progress = subTasks.length ? Math.round((completedSubTasks / subTasks.length) * 100) : 0;
                  const importance = item.importance ? IMPORTANCE_META[item.importance] : null;
                  const isListTask = Boolean(item.isTaskList);

                  return (
                    <SortableItem key={item.id} id={item.id}>
                      <motion.div
                        layout
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.97 }}
                        transition={{ type: "spring", stiffness: 300, damping: 28 }}
                      >
                        <SwipeableRow
                          onEdit={() => setEditingItemId(item.id)}
                          onDelete={() => deleteChecklistItem(item.id)}
                          editAction={EDIT_ACTION}
                          deleteAction={DELETE_ACTION}
                        >
                          <GlassCard
                            className={`group relative overflow-hidden border-border/60 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-lg ${
                              item.done || item.didNotDo ? "opacity-60" : "opacity-100"
                            }`}
                          >
                            <div
                              className={`absolute inset-y-0 left-0 w-1 ${
                                item.done
                                  ? "bg-emerald-500"
                                  : item.didNotDo
                                    ? "bg-muted-foreground/40"
                                    : importance?.dot ?? "bg-primary"
                              }`}
                            />
                            <div className="flex items-start gap-4 p-4 pl-5">
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  cycleStatus(item.id);
                                }}
                                className={`mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border transition-all duration-200 hover:scale-105 ${
                                  isListTask
                                    ? "border-primary/20 bg-primary/10 text-primary"
                                    : item.done
                                      ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-500"
                                      : item.didNotDo
                                        ? "border-border bg-secondary text-muted-foreground"
                                        : "border-border/70 bg-secondary/60 text-muted-foreground hover:border-primary/30 hover:text-primary"
                                }`}
                                aria-label={isListTask ? "Task list" : "Change task status"}
                              >
                                {isListTask ? (
                                  <ListChecks className="h-5 w-5" />
                                ) : item.done ? (
                                  <CheckCircle2 className="h-5 w-5" />
                                ) : item.didNotDo ? (
                                  <XCircle className="h-5 w-5" />
                                ) : (
                                  <Circle className="h-5 w-5" />
                                )}
                              </button>

                              <button
                                type="button"
                                className="min-w-0 flex-1 select-none text-left"
                                onClick={() => setEditingItemId(item.id)}
                              >
                                <div className="flex min-w-0 items-start justify-between gap-3">
                                  <div className="min-w-0">
                                    <div className="mb-1 flex flex-wrap items-center gap-2">
                                      <span
                                        className={`break-words text-base font-bold leading-tight transition-all ${
                                          item.done
                                            ? "line-through text-muted-foreground"
                                            : item.didNotDo
                                              ? "line-through text-muted-foreground/60"
                                              : "text-foreground"
                                        }`}
                                      >
                                        {item.text}
                                      </span>
                                      <span className="rounded-md bg-secondary px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                                        {isListTask ? "Task list" : statusLabel(item)}
                                      </span>
                                    </div>
                                    {item.description && (
                                      <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                                        {item.description}
                                      </p>
                                    )}
                                  </div>
                                </div>

                                {isListTask && (
                                  <div className="mt-3">
                                    <div className="mb-1.5 flex items-center justify-between text-[11px] font-semibold text-muted-foreground">
                                      <span>{completedSubTasks} of {subTasks.length} items</span>
                                      <span>{progress}%</span>
                                    </div>
                                    <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
                                      <motion.div
                                        className="h-full rounded-full bg-primary"
                                        initial={{ width: 0 }}
                                        animate={{ width: `${progress}%` }}
                                        transition={{ duration: 0.35, ease: "easeOut" }}
                                      />
                                    </div>
                                  </div>
                                )}

                                {(importance || item.dueDate || item.repeat || item.link) && (
                                  <div className="mt-3 flex flex-wrap items-center gap-1.5">
                                    {importance && (
                                      <span className={`inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-[11px] font-semibold ${importance.color}`}>
                                        <span className={`h-1.5 w-1.5 rounded-full ${importance.dot}`} />
                                        {importance.label}
                                      </span>
                                    )}
                                    {dueBadge(item)}
                                    {item.repeat && item.repeat !== "none" && (
                                      <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">
                                        <Repeat className="h-3 w-3" />
                                        {REPEAT_META[item.repeat]}
                                      </span>
                                    )}
                                    {item.link && <LinkChip href={item.link} />}
                                  </div>
                                )}
                              </button>

                              {isListTask && (
                                <button
                                  type="button"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    navigate(`/checklist/${item.id}`);
                                  }}
                                  className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition-all hover:bg-secondary hover:text-foreground"
                                  aria-label="Open task list"
                                >
                                  <ChevronRight className="h-5 w-5" />
                                </button>
                              )}
                            </div>
                          </GlassCard>
                        </SwipeableRow>
                      </motion.div>
                    </SortableItem>
                  );
                })}
              </AnimatePresence>
            </div>
          </SortableContext>
        </DndContext>
      )}

      <FabPortal>
        <AnimatePresence>
          {showActionMenu && (
            <>
              <motion.div
                key="backdrop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-30"
                onClick={() => setShowActionMenu(false)}
              />
              <motion.div
                key="menu"
                initial={{ opacity: 0, scale: 0.9, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 8 }}
                transition={{ type: "spring", stiffness: 350, damping: 28 }}
                className="fixed bottom-40 right-6 z-50 min-w-[190px] overflow-hidden rounded-2xl border border-border bg-card/95 shadow-2xl backdrop-blur-xl md:bottom-28 md:right-10"
              >
                <button
                  onClick={() => {
                    setShowActionMenu(false);
                    setIsAddTaskOpen(true);
                  }}
                  className="flex w-full items-center gap-3 px-5 py-4 text-left transition-colors hover:bg-secondary/60"
                >
                  <List className="h-5 w-5 shrink-0 text-primary" />
                  <span className="font-semibold">Single Task</span>
                </button>
                <div className="mx-3 h-px bg-border/60" />
                <button
                  onClick={() => {
                    setShowActionMenu(false);
                    setIsAddListOpen(true);
                  }}
                  className="flex w-full items-center gap-3 px-5 py-4 text-left transition-colors hover:bg-secondary/60"
                >
                  <ListChecks className="h-5 w-5 shrink-0 text-primary" />
                  <span className="font-semibold">Task List</span>
                </button>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        <motion.button
          onClick={() => setShowActionMenu((open) => !open)}
          whileTap={{ scale: 0.88 }}
          className="fixed bottom-24 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 md:bottom-10 md:right-10"
          data-testid="btn-open-add-menu"
        >
          <motion.div
            animate={{ rotate: showActionMenu ? 45 : 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 24 }}
          >
            <Plus className="h-6 w-6" />
          </motion.div>
        </motion.button>
      </FabPortal>

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

      <BottomSheet isOpen={isFilterOpen} onClose={() => setIsFilterOpen(false)} title="Filters">
        <div className="space-y-6 pb-2">
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Importance</p>
            <div className="flex flex-wrap gap-2">
              {(["high", "medium", "low"] as ImportanceLevel[]).map((value) => (
                <Chip
                  key={value}
                  active={filters.importance.includes(value)}
                  onClick={() =>
                    setFilters((current) => ({
                      ...current,
                      importance: toggleArr(current.importance, value),
                    }))
                  }
                >
                  {IMPORTANCE_META[value].label}
                </Chip>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status</p>
            <div className="flex flex-wrap gap-2">
              {[
                { value: "undone" as const, label: "Unchecked" },
                { value: "done" as const, label: "Checked" },
                { value: "didNotDo" as const, label: "Skipped" },
              ].map(({ value, label }) => (
                <Chip
                  key={value}
                  active={filters.status.includes(value)}
                  onClick={() =>
                    setFilters((current) => ({
                      ...current,
                      status: toggleArr(current.status, value),
                    }))
                  }
                >
                  {label}
                </Chip>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Type</p>
            <div className="flex flex-wrap gap-2">
              <Chip
                active={filters.repeat.includes("repeating")}
                onClick={() =>
                  setFilters((current) => ({
                    ...current,
                    repeat: toggleArr(current.repeat, "repeating"),
                  }))
                }
              >
                Repeating
              </Chip>
              <Chip
                active={filters.repeat.includes("oneTime")}
                onClick={() =>
                  setFilters((current) => ({
                    ...current,
                    repeat: toggleArr(current.repeat, "oneTime"),
                  }))
                }
              >
                One-Time
              </Chip>
            </div>
          </div>

          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Due Date</p>
            <div className="flex flex-wrap gap-2">
              <Chip
                active={filters.hasDueDate === true}
                onClick={() =>
                  setFilters((current) => ({
                    ...current,
                    hasDueDate: current.hasDueDate === true ? null : true,
                  }))
                }
              >
                Has due date
              </Chip>
              <Chip
                active={filters.hasDueDate === false}
                onClick={() =>
                  setFilters((current) => ({
                    ...current,
                    hasDueDate: current.hasDueDate === false ? null : false,
                  }))
                }
              >
                No due date
              </Chip>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={() => setFilters(EMPTY_FILTERS)}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-border py-3 text-sm font-medium transition-colors hover:bg-secondary/60"
            >
              <RotateCcw className="h-4 w-4" /> Clear all
            </button>
            <button
              onClick={() => setIsFilterOpen(false)}
              className="flex-1 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground"
            >
              Apply
            </button>
          </div>
        </div>
      </BottomSheet>
    </div>
  );
}
