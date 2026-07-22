import { useEffect, useMemo, useState } from "react";
import { useLocation, useSearch } from "wouter";
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

const CHECK_ACTION: SwipeAction = {
  icon: <CheckCircle2 className="h-5 w-5" />,
  label: "Check",
  bg: "bg-emerald-500/15",
  color: "text-emerald-500",
};

const SKIP_ACTION: SwipeAction = {
  icon: <XCircle className="h-5 w-5" />,
  label: "Skip",
  bg: "bg-amber-500/15",
  color: "text-amber-500",
};

const REMOVE_DONE_ACTION: SwipeAction = {
  icon: <Trash2 className="h-5 w-5" />,
  label: "Remove done",
  bg: "bg-emerald-500/15",
  color: "text-emerald-500",
};

const REMOVE_SKIPPED_ACTION: SwipeAction = {
  icon: <Trash2 className="h-5 w-5" />,
  label: "Remove skipped",
  bg: "bg-amber-500/15",
  color: "text-amber-500",
};

function toggleArr<T>(items: T[], value: T): T[] {
  return items.includes(value) ? items.filter((item) => item !== value) : [...items, value];
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

function SortableItem({ id, children }: { id: string; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
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
  const [location, navigate] = useLocation();
  const search = useSearch();

  const [showActionMenu, setShowActionMenu] = useState(false);
  const [isAddTaskOpen, setIsAddTaskOpen] = useState(false);
  const [isAddListOpen, setIsAddListOpen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);

  const filterCount = activeFilterCount(filters);

  useEffect(() => {
    const requestedId = new URLSearchParams(search).get("edit");
    if (requestedId && checklist.some((item) => item.id === requestedId)) {
      setEditingItemId(requestedId);
    }
  }, [search, checklist]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { delay: 400, tolerance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 400, tolerance: 5 } }),
  );

  const closeEditor = () => {
    setEditingItemId(null);
    if (location.includes("?edit=")) navigate("/checklist", { replace: true });
  };

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
    closeEditor();
  };

  const checkOrRemove = (item: ChecklistItem) => {
    if (item.done) {
      deleteChecklistItem(item.id);
      return;
    }
    setCascadeChecklistStatus(item.id, true, false);
  };

  const skipOrRemove = (item: ChecklistItem) => {
    if (item.didNotDo) {
      deleteChecklistItem(item.id);
      return;
    }
    setCascadeChecklistStatus(item.id, false, true);
  };

  const filteredChecklist = useMemo(
    () =>
      checklist.filter((item) => {
        if (
          filters.importance.length > 0 &&
          (!item.importance || !filters.importance.includes(item.importance))
        ) return false;
        if (filters.status.length > 0) {
          const status = item.done ? "done" : item.didNotDo ? "didNotDo" : "undone";
          if (!filters.status.includes(status)) return false;
        }
        if (filters.repeat.length > 0) {
          const repeating = !!item.repeat && item.repeat !== "none";
          if (filters.repeat.includes("repeating") && !repeating) return false;
          if (filters.repeat.includes("oneTime") && repeating) return false;
        }
        if (filters.hasDueDate === true && !item.dueDate) return false;
        if (filters.hasDueDate === false && !!item.dueDate) return false;
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

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
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
        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-bold ${
          overdue ? "bg-rose-500/12 text-rose-500" : today ? "bg-amber-500/12 text-amber-500" : "bg-secondary text-muted-foreground"
        }`}>
          <Clock className="h-3 w-3" />
          {today ? "Today" : overdue ? "Overdue" : format(date, "MMM d")}
          {item.dueTime ? ` · ${item.dueTime}` : ""}
        </span>
      );
    } catch {
      return null;
    }
  };

  const editingItem = editingItemId ? checklist.find((item) => item.id === editingItemId) : null;
  const activeCount = checklist.filter((item) => !item.done && !item.didNotDo).length;
  const completedCount = checklist.filter((item) => item.done).length;
  const listCount = checklist.filter((item) => item.isTaskList).length;

  return (
    <div className="space-y-7 pb-24">
      <header className="space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-primary">Focus board</p>
            <h1 className="mt-1 text-4xl font-black tracking-tight">Tasks</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {activeCount} active{filterCount > 0 && <span className="font-semibold text-primary"> · filtered</span>}
            </p>
          </div>
          <button
            onClick={() => setIsFilterOpen(true)}
            className="relative flex h-12 items-center gap-2 rounded-2xl border border-border/60 bg-card px-4 text-sm font-bold shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
          >
            <SlidersHorizontal className="h-4 w-4" /> Filters
            {filterCount > 0 && (
              <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs font-black text-primary-foreground">
                {filterCount}
              </span>
            )}
          </button>
        </div>

        <GlassCard className="overflow-hidden rounded-3xl border-border/60 p-0">
          <div className="grid grid-cols-3 divide-x divide-border/50">
            {[
              { icon: Target, value: activeCount, label: "Active" },
              { icon: CheckCircle2, value: completedCount, label: "Completed" },
              { icon: ListChecks, value: listCount, label: "Task lists" },
            ].map(({ icon: Icon, value, label }) => (
              <div key={label} className="min-w-0 p-4 text-center">
                <Icon className="mx-auto h-5 w-5 text-primary" />
                <p className="mt-2 text-xl font-black">{value}</p>
                <p className="mt-1 break-words text-[9px] font-black uppercase tracking-wider text-muted-foreground">{label}</p>
              </div>
            ))}
          </div>
        </GlassCard>
      </header>

      {filteredChecklist.length === 0 ? (
        <GlassCard className="mt-10 border-2 border-dashed bg-transparent p-12 text-center">
          <Sparkles className="mx-auto h-9 w-9 text-primary/50" />
          <h2 className="mt-4 text-2xl font-black">{filterCount > 0 ? "Nothing matches" : "All clear"}</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {filterCount > 0 ? "Try clearing or changing your filters." : "Tap + to create your next task."}
          </p>
          {filterCount > 0 && (
            <button onClick={() => setFilters(EMPTY_FILTERS)} className="mx-auto mt-4 inline-flex items-center gap-2 text-sm font-bold text-primary">
              <RotateCcw className="h-4 w-4" /> Clear filters
            </button>
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
                  const isList = !!item.isTaskList;
                  const accent = item.done ? "bg-emerald-500" : item.didNotDo ? "bg-amber-500" : "bg-primary";

                  return (
                    <SortableItem key={item.id} id={item.id}>
                      <motion.div layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96 }}>
                        <SwipeableRow
                          onEdit={() => checkOrRemove(item)}
                          onDelete={() => skipOrRemove(item)}
                          editAction={item.done ? REMOVE_DONE_ACTION : CHECK_ACTION}
                          deleteAction={item.didNotDo ? REMOVE_SKIPPED_ACTION : SKIP_ACTION}
                        >
                          <GlassCard
                            onClick={() => setEditingItemId(item.id)}
                            className={`group relative cursor-pointer overflow-hidden rounded-3xl border-border/60 p-0 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg ${
                              item.done || item.didNotDo ? "opacity-70" : ""
                            }`}
                          >
                            <div className={`absolute inset-y-0 left-0 w-1.5 ${accent}`} />
                            <div className="flex min-w-0 items-start gap-4 p-5 pl-6">
                              <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border ${
                                isList ? "border-primary/25 bg-primary/10 text-primary" : item.done ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-500" : item.didNotDo ? "border-amber-500/25 bg-amber-500/10 text-amber-500" : "border-border/60 bg-secondary/70 text-muted-foreground"
                              }`}>
                                {isList ? <ListChecks className="h-6 w-6" /> : item.done ? <CheckCircle2 className="h-6 w-6" /> : item.didNotDo ? <XCircle className="h-6 w-6" /> : <Circle className="h-6 w-6" />}
                              </div>

                              <div className="min-w-0 flex-1">
                                <div className="flex min-w-0 items-start justify-between gap-3">
                                  <div className="min-w-0">
                                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">
                                      {isList ? "Task list" : "Task"} · {statusLabel(item)}
                                    </p>
                                    <h3 className={`mt-1 break-words text-base font-black leading-snug ${item.done || item.didNotDo ? "text-muted-foreground line-through" : "text-foreground"}`}>
                                      {item.text}
                                    </h3>
                                  </div>
                                  {isList && (
                                    <button
                                      type="button"
                                      aria-label="Open task list"
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        navigate(`/checklist/${item.id}`);
                                      }}
                                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-secondary/70 text-muted-foreground transition-colors hover:text-foreground"
                                    >
                                      <ChevronRight className="h-5 w-5" />
                                    </button>
                                  )}
                                </div>

                                {item.description && <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-muted-foreground">{item.description}</p>}

                                {(importance || item.dueDate || item.repeat || item.link) && (
                                  <div className="mt-3 flex flex-wrap items-center gap-1.5">
                                    {importance && (
                                      <span className={`inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-1 text-[10px] font-bold ${importance.color}`}>
                                        <span className={`h-1.5 w-1.5 rounded-full ${importance.dot}`} /> {importance.label}
                                      </span>
                                    )}
                                    {dueBadge(item)}
                                    {item.repeat && item.repeat !== "none" && (
                                      <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-1 text-[10px] font-bold text-muted-foreground">
                                        <Repeat className="h-3 w-3" /> {REPEAT_META[item.repeat]}
                                      </span>
                                    )}
                                    {item.link && <LinkChip href={item.link} />}
                                  </div>
                                )}

                                {isList && (
                                  <div className="mt-4">
                                    <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                                      <span>{completedSubTasks}/{subTasks.length} items</span><span>{progress}%</span>
                                    </div>
                                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-secondary">
                                      <motion.div className="h-full rounded-full bg-primary" initial={false} animate={{ width: `${progress}%` }} transition={{ duration: 0.3 }} />
                                    </div>
                                  </div>
                                )}
                              </div>
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
              <motion.div key="backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-30" onClick={() => setShowActionMenu(false)} />
              <motion.div key="menu" initial={{ opacity: 0, scale: 0.9, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 8 }} className="fixed bottom-40 right-6 z-50 min-w-[190px] overflow-hidden rounded-2xl border border-border bg-card/95 shadow-2xl backdrop-blur-xl md:bottom-28 md:right-10">
                <button onClick={() => { setShowActionMenu(false); setIsAddTaskOpen(true); }} className="flex w-full items-center gap-3 px-5 py-4 text-left transition-colors hover:bg-secondary/60"><List className="h-5 w-5 text-primary" /><span className="font-bold">Single Task</span></button>
                <div className="mx-3 h-px bg-border/60" />
                <button onClick={() => { setShowActionMenu(false); setIsAddListOpen(true); }} className="flex w-full items-center gap-3 px-5 py-4 text-left transition-colors hover:bg-secondary/60"><ListChecks className="h-5 w-5 text-primary" /><span className="font-bold">Task List</span></button>
              </motion.div>
            </>
          )}
        </AnimatePresence>
        <motion.button onClick={() => setShowActionMenu((open) => !open)} whileTap={{ scale: 0.88 }} className="fixed bottom-24 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 md:bottom-10 md:right-10">
          <motion.div animate={{ rotate: showActionMenu ? 45 : 0 }}><Plus className="h-6 w-6" /></motion.div>
        </motion.button>
      </FabPortal>

      {isAddTaskOpen && <TaskForm title="New Task" defaultValues={DEFAULT_TASK} subjects={subjects} onSubmit={onAddTask} onClose={() => setIsAddTaskOpen(false)} submitLabel="Add Task" />}
      {isAddListOpen && <TaskForm title="New Task List" defaultValues={DEFAULT_TASK} subjects={subjects} onSubmit={onAddList} onClose={() => setIsAddListOpen(false)} submitLabel="Create Task List" />}
      {editingItemId && editingItem && <TaskForm title={editingItem.isTaskList ? "Edit Task List" : "Edit Task"} defaultValues={getEditDefaults(editingItemId)} subjects={subjects} onSubmit={onEditTask} onClose={closeEditor} submitLabel="Save Changes" />}

      <BottomSheet isOpen={isFilterOpen} onClose={() => setIsFilterOpen(false)} title="Filters">
        <div className="space-y-6 pb-2">
          <div><p className="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">Importance</p><div className="flex flex-wrap gap-2">{(["high", "medium", "low"] as ImportanceLevel[]).map((value) => <Chip key={value} active={filters.importance.includes(value)} onClick={() => setFilters((current) => ({ ...current, importance: toggleArr(current.importance, value) }))}>{IMPORTANCE_META[value].label}</Chip>)}</div></div>
          <div><p className="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">Status</p><div className="flex flex-wrap gap-2">{[{ value: "undone" as const, label: "Active" }, { value: "done" as const, label: "Completed" }, { value: "didNotDo" as const, label: "Skipped" }].map(({ value, label }) => <Chip key={value} active={filters.status.includes(value)} onClick={() => setFilters((current) => ({ ...current, status: toggleArr(current.status, value) }))}>{label}</Chip>)}</div></div>
          <div><p className="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">Type</p><div className="flex flex-wrap gap-2"><Chip active={filters.repeat.includes("repeating")} onClick={() => setFilters((current) => ({ ...current, repeat: toggleArr(current.repeat, "repeating") }))}>Repeating</Chip><Chip active={filters.repeat.includes("oneTime")} onClick={() => setFilters((current) => ({ ...current, repeat: toggleArr(current.repeat, "oneTime") }))}>One-time</Chip></div></div>
          <div><p className="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">Due date</p><div className="flex flex-wrap gap-2"><Chip active={filters.hasDueDate === true} onClick={() => setFilters((current) => ({ ...current, hasDueDate: current.hasDueDate === true ? null : true }))}>Has due date</Chip><Chip active={filters.hasDueDate === false} onClick={() => setFilters((current) => ({ ...current, hasDueDate: current.hasDueDate === false ? null : false }))}>No due date</Chip></div></div>
          <div className="flex gap-3 pt-2"><button onClick={() => setFilters(EMPTY_FILTERS)} className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-border py-3 text-sm font-bold transition-colors hover:bg-secondary/60"><RotateCcw className="h-4 w-4" />Clear all</button><button onClick={() => setIsFilterOpen(false)} className="flex-1 rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground">Apply</button></div>
        </div>
      </BottomSheet>
    </div>
  );
}
