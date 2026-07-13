import { useMemo, useState } from "react";
import { useStudyData, ChecklistItem, RepeatRule, getChecklistItemStatus } from "@/hooks/useStudyData";
import { BottomSheet } from "@/components/shared/BottomSheet";
import { GlassCard } from "@/components/shared/GlassCard";
import { FabPortal } from "@/components/shared/FabPortal";
import { ChecklistItemRow } from "@/components/checklist/ChecklistItemRow";
import { DeleteSeriesSheet } from "@/components/checklist/DeleteSeriesSheet";
import {
  ChecklistFilters, ChecklistFilterState, DEFAULT_CHECKLIST_FILTERS,
} from "@/components/checklist/ChecklistFilters";
import {
  TaskDetailFields, TaskDetailValues, DEFAULT_TASK_DETAIL_VALUES,
} from "@/components/checklist/TaskDetailFields";
import { Plus, List, ListChecks, X } from "lucide-react";
import { useForm } from "react-hook-form";
import { motion, AnimatePresence } from "framer-motion";

function toRepeatRule(v: TaskDetailValues): RepeatRule | undefined {
  if (v.repeatFrequency === 'none') return undefined;
  if (v.repeatFrequency === 'weekly') return { frequency: 'weekly', weekdays: v.weekdays };
  if (v.repeatFrequency === 'monthly') return { frequency: 'monthly', dayOfMonth: v.dayOfMonth };
  return { frequency: 'daily' };
}

function matchesTimeFilter(item: ChecklistItem, filter: ChecklistFilterState['time'][number]): boolean {
  if (filter === 'no-date') return !item.dueAt;
  if (!item.dueAt) return false;
  const due = new Date(item.dueAt);
  const now = new Date();
  if (filter === 'overdue') return due.getTime() < now.getTime();
  if (filter === 'today') return due.toDateString() === now.toDateString();
  if (filter === 'this-week') {
    const weekAhead = new Date(now);
    weekAhead.setDate(weekAhead.getDate() + 7);
    return due.getTime() >= now.getTime() && due.getTime() <= weekAhead.getTime();
  }
  return true;
}

export function Checklist() {
  const {
    checklist, subjects,
    toggleChecklistItem, deleteChecklistItem, deleteChecklistSeries, addChecklistItem, updateChecklistItem,
    toggleSubTask, addSubTask, deleteSubTask, updateSubTask,
  } = useStudyData();

  const [showActionMenu, setShowActionMenu] = useState(false);
  const [isAddTaskOpen, setIsAddTaskOpen] = useState(false);
  const [isAddListOpen, setIsAddListOpen] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [newSubTaskInputs, setNewSubTaskInputs] = useState<string[]>(['']);
  const [addingSubTaskFor, setAddingSubTaskFor] = useState<string | null>(null);
  const [newSubTaskText, setNewSubTaskText] = useState('');
  const [filters, setFilters] = useState<ChecklistFilterState>(DEFAULT_CHECKLIST_FILTERS);

  // Shared importance / due date / repeat fields for both add forms.
  const [taskDetails, setTaskDetails] = useState<TaskDetailValues>(DEFAULT_TASK_DETAIL_VALUES);
  const [listDetails, setListDetails] = useState<TaskDetailValues>(DEFAULT_TASK_DETAIL_VALUES);

  // Edit state for items / lists
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editItemText, setEditItemText] = useState('');

  // Inline edit state for sub-tasks
  const [editingSubTask, setEditingSubTask] = useState<{ itemId: string; subTaskId: string } | null>(null);
  const [editSubTaskText, setEditSubTaskText] = useState('');
  const [editSubTaskLink, setEditSubTaskLink] = useState('');

  // Delete confirmation for repeating tasks
  const [pendingDeleteItem, setPendingDeleteItem] = useState<ChecklistItem | null>(null);

  const { register: registerTask, handleSubmit: handleTaskSubmit, reset: resetTask } = useForm({
    defaultValues: { text: "", subjectId: "" }
  });

  const { register: registerList, handleSubmit: handleListSubmit, reset: resetList } = useForm({
    defaultValues: { title: "", subjectId: "" }
  });

  const onAddTask = (data: any) => {
    addChecklistItem({
      text: data.text,
      subjectId: data.subjectId || null,
      done: false,
      linkedScheduleId: null,
      isTaskList: false,
      importance: taskDetails.importance,
      dueAt: taskDetails.dueAt ? new Date(taskDetails.dueAt).toISOString() : null,
      repeat: toRepeatRule(taskDetails),
    });
    resetTask();
    setTaskDetails(DEFAULT_TASK_DETAIL_VALUES);
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
      importance: listDetails.importance,
      dueAt: listDetails.dueAt ? new Date(listDetails.dueAt).toISOString() : null,
      repeat: toRepeatRule(listDetails),
    });
    resetList();
    setNewSubTaskInputs(['']);
    setListDetails(DEFAULT_TASK_DETAIL_VALUES);
    setIsAddListOpen(false);
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
    if (text) {
      addSubTask(itemId, text);
      setNewSubTaskText('');
      setAddingSubTaskFor(null);
    }
  };

  const openEditItem = (id: string, text: string) => {
    setEditingItemId(id);
    setEditItemText(text);
  };

  const saveEditItem = () => {
    if (!editingItemId || !editItemText.trim()) return;
    updateChecklistItem(editingItemId, { text: editItemText.trim() });
    setEditingItemId(null);
  };

  const openEditSubTask = (itemId: string, subTaskId: string, text: string, link: string) => {
    setEditingSubTask({ itemId, subTaskId });
    setEditSubTaskText(text);
    setEditSubTaskLink(link);
  };

  const saveEditSubTask = () => {
    if (!editingSubTask || !editSubTaskText.trim()) return;
    updateSubTask(editingSubTask.itemId, editingSubTask.subTaskId, {
      text: editSubTaskText.trim(),
      link: editSubTaskLink.trim() || undefined,
    });
    setEditingSubTask(null);
  };

  const requestDelete = (item: ChecklistItem) => {
    if (item.seriesId) {
      setPendingDeleteItem(item);
    } else {
      deleteChecklistItem(item.id);
    }
  };

  const confirmDeleteOccurrence = () => {
    if (pendingDeleteItem) deleteChecklistItem(pendingDeleteItem.id);
    setPendingDeleteItem(null);
  };

  const confirmDeleteSeries = () => {
    if (pendingDeleteItem?.seriesId) deleteChecklistSeries(pendingDeleteItem.seriesId);
    setPendingDeleteItem(null);
  };

  // Apply combinable filters (Phase 3.2)
  const filteredChecklist = useMemo(() => {
    return checklist.filter((item) => {
      if (filters.importance.length > 0 && !filters.importance.includes(item.importance || 'medium')) return false;
      if (filters.time.length > 0 && !filters.time.some((t) => matchesTimeFilter(item, t))) return false;
      if (filters.status.length > 0 && !filters.status.includes(getChecklistItemStatus(item))) return false;
      if (filters.repeat.length > 0) {
        const isRepeated = !!item.seriesId;
        const matchesRepeat = filters.repeat.includes('repeated') && isRepeated;
        const matchesOneOff = filters.repeat.includes('one-off') && !isRepeated;
        if (!matchesRepeat && !matchesOneOff) return false;
      }
      return true;
    });
  }, [checklist, filters]);

  // Group items by subject
  const groups: Record<string, typeof checklist> = {};
  filteredChecklist.forEach(item => {
    const key = item.subjectId || 'uncategorized';
    if (!groups[key]) groups[key] = [];
    groups[key].push(item);
  });

  const sortedKeys = Object.keys(groups).sort((a, b) => {
    if (a === 'uncategorized') return 1;
    if (b === 'uncategorized') return -1;
    const subA = subjects.find(s => s.id === a);
    const subB = subjects.find(s => s.id === b);
    return (subA?.name || "").localeCompare(subB?.name || "");
  });

  return (
    <div className="space-y-8 pb-20">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-bold tracking-tight mb-2">Checklist</h1>
          <p className="text-muted-foreground text-lg">
            {checklist.filter(c => !c.done).length} remaining tasks
          </p>
        </div>
      </div>

      <ChecklistFilters filters={filters} onChange={setFilters} />

      {checklist.length === 0 ? (
        <GlassCard className="p-12 text-center border-dashed border-2 bg-transparent mt-12">
          <h2 className="text-2xl font-semibold mb-2">All clear!</h2>
          <p className="text-muted-foreground">Add some tasks to get started.</p>
        </GlassCard>
      ) : filteredChecklist.length === 0 ? (
        <GlassCard className="p-12 text-center border-dashed border-2 bg-transparent mt-4">
          <h2 className="text-xl font-semibold mb-2">No tasks match these filters</h2>
          <p className="text-muted-foreground">Try adjusting or resetting the filters above.</p>
        </GlassCard>
      ) : (
        <div className="space-y-8">
          {sortedKeys.map(key => {
            const items = groups[key];
            const subject = subjects.find(s => s.id === key);
            const sortedItems = [...items].sort((a, b) => Number(a.done) - Number(b.done));

            return (
              <div key={key} className="space-y-4">
                <h2 className="text-lg font-bold flex items-center gap-2 px-2">
                  {subject && (
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: subject.color }} />
                  )}
                  {subject ? subject.name : 'Other Tasks'}
                </h2>

                <div className="space-y-2">
                  <AnimatePresence initial={false}>
                    {sortedItems.map(item => (
                      <motion.div
                        key={item.id}
                        layout
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ type: "spring", stiffness: 300, damping: 28 }}
                      >
                        <ChecklistItemRow
                          item={item}
                          isExpanded={expandedItems.has(item.id)}
                          onToggleExpanded={() => toggleExpanded(item.id)}
                          onToggleDone={() => toggleChecklistItem(item.id)}
                          onEdit={() => openEditItem(item.id, item.text)}
                          onDeleteRequest={() => requestDelete(item)}
                          onToggleSubTask={(sid) => toggleSubTask(item.id, sid)}
                          onDeleteSubTask={(sid) => deleteSubTask(item.id, sid)}
                          onEditSubTaskRequest={(sid, text, link) => openEditSubTask(item.id, sid, text, link)}
                          editingSubTask={editingSubTask}
                          editSubTaskText={editSubTaskText}
                          editSubTaskLink={editSubTaskLink}
                          onEditSubTaskTextChange={setEditSubTaskText}
                          onEditSubTaskLinkChange={setEditSubTaskLink}
                          onSaveEditSubTask={saveEditSubTask}
                          onCancelEditSubTask={() => setEditingSubTask(null)}
                          addingSubTaskFor={addingSubTaskFor}
                          newSubTaskText={newSubTaskText}
                          onNewSubTaskTextChange={setNewSubTaskText}
                          onStartAddSubTask={() => setAddingSubTaskFor(item.id)}
                          onCancelAddSubTask={() => setAddingSubTaskFor(null)}
                          onSubmitAddSubTask={() => handleAddSubTaskInline(item.id)}
                        />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Action menu overlay + FAB — portaled to body so the fixed positioning
          isn't affected by the page-transition transform on the content wrapper */}
      <FabPortal>
        <AnimatePresence>
          {showActionMenu && (
            <>
              {/* Dismiss backdrop */}
              <motion.div
                key="backdrop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-30"
                onClick={() => setShowActionMenu(false)}
              />
              {/* Menu */}
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
                  data-testid="btn-add-single-task"
                >
                  <List className="w-5 h-5 text-primary shrink-0" />
                  <span className="font-medium">Single Task</span>
                </button>
                <div className="h-px bg-border/60 mx-3" />
                <button
                  onClick={() => { setShowActionMenu(false); setIsAddListOpen(true); }}
                  className="flex items-center gap-3 px-5 py-4 hover:bg-secondary/60 transition-colors w-full text-left"
                  data-testid="btn-add-task-list"
                >
                  <ListChecks className="w-5 h-5 text-primary shrink-0" />
                  <span className="font-medium">Task List</span>
                </button>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* FAB — rotates to X when menu is open */}
        <motion.button
          onClick={() => setShowActionMenu(!showActionMenu)}
          whileTap={{ scale: 0.88 }}
          className="fixed bottom-24 md:bottom-10 right-6 md:right-10 w-14 h-14 bg-primary text-primary-foreground rounded-full shadow-lg shadow-primary/30 flex items-center justify-center z-40"
          data-testid="btn-open-add-menu"
        >
          <motion.div
            animate={{ rotate: showActionMenu ? 45 : 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 24 }}
          >
            <Plus className="w-6 h-6" />
          </motion.div>
        </motion.button>
      </FabPortal>

      {/* Add Single Task sheet */}
      <BottomSheet
        isOpen={isAddTaskOpen}
        onClose={() => { setIsAddTaskOpen(false); setTaskDetails(DEFAULT_TASK_DETAIL_VALUES); }}
        title="New Task"
      >
        <form onSubmit={handleTaskSubmit(onAddTask)} className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2">Task Description</label>
            <input
              {...registerTask("text", { required: true })}
              className="w-full bg-background border border-border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50"
              placeholder="e.g. Read Chapter 4"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Subject (optional)</label>
            <select
              {...registerTask("subjectId")}
              className="w-full bg-background border border-border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50 appearance-none"
            >
              <option value="">None</option>
              {subjects.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <TaskDetailFields value={taskDetails} onChange={setTaskDetails} />
          <button
            type="submit"
            className="w-full bg-primary text-primary-foreground font-semibold rounded-xl py-3.5"
          >
            Add Task
          </button>
        </form>
      </BottomSheet>

      {/* Add Task List sheet */}
      <BottomSheet
        isOpen={isAddListOpen}
        onClose={() => { setIsAddListOpen(false); setNewSubTaskInputs(['']); setListDetails(DEFAULT_TASK_DETAIL_VALUES); }}
        title="New Task List"
      >
        <form onSubmit={handleListSubmit(onAddList)} className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2">List Title</label>
            <input
              {...registerList("title", { required: true })}
              className="w-full bg-background border border-border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50"
              placeholder="e.g. Chapter 5 Study Plan"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Subject (optional)</label>
            <select
              {...registerList("subjectId")}
              className="w-full bg-background border border-border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50 appearance-none"
            >
              <option value="">None</option>
              {subjects.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-3">Sub-tasks</label>
            <div className="space-y-2">
              {newSubTaskInputs.map((val, idx) => (
                <div key={idx} className="flex gap-2">
                  <input
                    value={val}
                    onChange={e => {
                      const updated = [...newSubTaskInputs];
                      updated[idx] = e.target.value;
                      setNewSubTaskInputs(updated);
                    }}
                    className="flex-1 bg-background border border-border rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
                    placeholder={`Sub-task ${idx + 1}`}
                  />
                  {newSubTaskInputs.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setNewSubTaskInputs(prev => prev.filter((_, i) => i !== idx))}
                      className="p-2 text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setNewSubTaskInputs(prev => [...prev, ''])}
              className="flex items-center gap-2 text-sm text-primary hover:underline mt-3"
            >
              <Plus className="w-4 h-4" /> Add another sub-task
            </button>
          </div>
          <TaskDetailFields value={listDetails} onChange={setListDetails} />
          <button
            type="submit"
            className="w-full bg-primary text-primary-foreground font-semibold rounded-xl py-3.5"
          >
            Create Task List
          </button>
        </form>
      </BottomSheet>

      {/* Edit item / list text */}
      <BottomSheet isOpen={!!editingItemId} onClose={() => setEditingItemId(null)} title="Edit Task">
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2">Task Text</label>
            <input
              autoFocus
              value={editItemText}
              onChange={e => setEditItemText(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && saveEditItem()}
              className="w-full bg-background border border-border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
          <button
            onClick={saveEditItem}
            className="w-full bg-primary text-primary-foreground font-semibold rounded-xl py-3.5"
          >
            Save Changes
          </button>
        </div>
      </BottomSheet>

      <DeleteSeriesSheet
        isOpen={!!pendingDeleteItem}
        onClose={() => setPendingDeleteItem(null)}
        onDeleteOccurrence={confirmDeleteOccurrence}
        onDeleteSeries={confirmDeleteSeries}
      />
    </div>
  );
}
