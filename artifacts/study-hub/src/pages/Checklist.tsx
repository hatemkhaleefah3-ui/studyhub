import { useState } from "react";
import { useStudyData } from "@/hooks/useStudyData";
import { GlassCard } from "@/components/shared/GlassCard";
import { BottomSheet } from "@/components/shared/BottomSheet";
import { FabPortal } from "@/components/shared/FabPortal";
import {
  Plus, Trash2, CheckCircle2, Circle,
  List, ListChecks, ChevronDown, ChevronRight, X, Pencil
} from "lucide-react";
import { useForm } from "react-hook-form";
import { motion, AnimatePresence } from "framer-motion";

export function Checklist() {
  const {
    checklist, subjects,
    toggleChecklistItem, deleteChecklistItem, addChecklistItem, updateChecklistItem,
    toggleSubTask, addSubTask, deleteSubTask, updateSubTask,
  } = useStudyData();

  const [showActionMenu, setShowActionMenu] = useState(false);
  const [isAddTaskOpen, setIsAddTaskOpen] = useState(false);
  const [isAddListOpen, setIsAddListOpen] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [newSubTaskInputs, setNewSubTaskInputs] = useState<string[]>(['']);
  const [addingSubTaskFor, setAddingSubTaskFor] = useState<string | null>(null);
  const [newSubTaskText, setNewSubTaskText] = useState('');

  // Edit state for items / lists
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editItemText, setEditItemText] = useState('');

  // Inline edit state for sub-tasks
  const [editingSubTask, setEditingSubTask] = useState<{ itemId: string; subTaskId: string } | null>(null);
  const [editSubTaskText, setEditSubTaskText] = useState('');

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
    });
    resetTask();
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
    resetList();
    setNewSubTaskInputs(['']);
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

  const openEditSubTask = (itemId: string, subTaskId: string, text: string) => {
    setEditingSubTask({ itemId, subTaskId });
    setEditSubTaskText(text);
  };

  const saveEditSubTask = () => {
    if (!editingSubTask || !editSubTaskText.trim()) return;
    updateSubTask(editingSubTask.itemId, editingSubTask.subTaskId, { text: editSubTaskText.trim() });
    setEditingSubTask(null);
  };

  // Group items by subject
  const groups: Record<string, typeof checklist> = {};
  checklist.forEach(item => {
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

      {checklist.length === 0 ? (
        <GlassCard className="p-12 text-center border-dashed border-2 bg-transparent mt-12">
          <h2 className="text-2xl font-semibold mb-2">All clear!</h2>
          <p className="text-muted-foreground">Add some tasks to get started.</p>
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
                    {sortedItems.map(item => {
                      const isExpanded = expandedItems.has(item.id);
                      const subTasks = item.subTasks || [];

                      return (
                        <motion.div
                          key={item.id}
                          layout
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          transition={{ type: "spring", stiffness: 300, damping: 28 }}
                        >
                          <GlassCard
                            className={`transition-opacity duration-300 overflow-hidden ${
                              item.done ? 'opacity-50' : 'opacity-100'
                            }`}
                          >
                            {/* Main row */}
                            <div className="p-4 flex items-center gap-4 group">
                              {/* Checkbox */}
                              <button
                                onClick={() => toggleChecklistItem(item.id)}
                                className="shrink-0 focus:outline-none"
                                data-testid={`checkbox-item-${item.id}`}
                              >
                                <motion.div whileTap={{ scale: 0.75 }}>
                                  {item.done ? (
                                    <CheckCircle2 className="w-7 h-7 text-primary" />
                                  ) : (
                                    <Circle className="w-7 h-7 text-muted-foreground hover:text-primary transition-colors" />
                                  )}
                                </motion.div>
                              </button>

                              {/* Label */}
                              <div
                                className={`flex-1 flex items-center gap-2 min-w-0 ${
                                  item.isTaskList ? 'cursor-pointer select-none' : ''
                                }`}
                                onClick={() => item.isTaskList && toggleExpanded(item.id)}
                              >
                                <span className={`text-lg font-medium truncate transition-all ${
                                  item.done ? 'line-through text-muted-foreground' : ''
                                }`}>
                                  {item.text}
                                </span>
                                {item.isTaskList && (
                                  <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded-full shrink-0">
                                    {subTasks.filter(st => st.done).length}/{subTasks.length}
                                  </span>
                                )}
                              </div>

                              {/* Expand chevron for task lists */}
                              {item.isTaskList && (
                                <button
                                  onClick={() => toggleExpanded(item.id)}
                                  className="p-1 text-muted-foreground hover:text-foreground transition-colors shrink-0"
                                  data-testid={`btn-expand-${item.id}`}
                                >
                                  {isExpanded
                                    ? <ChevronDown className="w-5 h-5" />
                                    : <ChevronRight className="w-5 h-5" />}
                                </button>
                              )}

                              {/* Edit — hover-only */}
                              <button
                                onClick={() => openEditItem(item.id, item.text)}
                                className={`p-2 text-muted-foreground hover:text-foreground transition-opacity shrink-0 ${
                                  item.done ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                                }`}
                                title="Edit"
                                data-testid={`btn-edit-item-${item.id}`}
                              >
                                <Pencil className="w-4 h-4" />
                              </button>

                              {/* Trash — always visible when done, hover-only otherwise */}
                              <button
                                onClick={() => deleteChecklistItem(item.id)}
                                className={`p-2 text-muted-foreground hover:text-destructive transition-opacity shrink-0 ${
                                  item.done ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                                }`}
                                data-testid={`btn-delete-item-${item.id}`}
                              >
                                <Trash2 className="w-5 h-5" />
                              </button>
                            </div>

                            {/* Sub-tasks (expanded) */}
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
                                  <div className="px-4 pb-4 pt-0 ml-11 border-t border-border/40 space-y-2">
                                    <div className="pt-3 space-y-2">
                                      {subTasks.map(st => (
                                        <div
                                          key={st.id}
                                          className="flex items-center gap-3 group/sub"
                                        >
                                          <button
                                            onClick={() => toggleSubTask(item.id, st.id)}
                                            className="shrink-0"
                                            data-testid={`checkbox-subtask-${st.id}`}
                                          >
                                            <motion.div whileTap={{ scale: 0.75 }}>
                                              {st.done ? (
                                                <CheckCircle2 className="w-5 h-5 text-primary" />
                                              ) : (
                                                <Circle className="w-5 h-5 text-muted-foreground hover:text-primary transition-colors" />
                                              )}
                                            </motion.div>
                                          </button>

                                          {/* Inline edit for sub-task */}
                                          {editingSubTask?.subTaskId === st.id ? (
                                            <form
                                              onSubmit={e => { e.preventDefault(); saveEditSubTask(); }}
                                              className="flex-1 flex gap-2"
                                            >
                                              <input
                                                autoFocus
                                                value={editSubTaskText}
                                                onChange={e => setEditSubTaskText(e.target.value)}
                                                onKeyDown={e => e.key === 'Escape' && setEditingSubTask(null)}
                                                className="flex-1 text-sm bg-background border border-border rounded-lg px-3 py-1 focus:outline-none focus:ring-1 focus:ring-primary/50"
                                              />
                                              <button type="submit" className="text-xs text-primary font-semibold px-2">Save</button>
                                              <button type="button" onClick={() => setEditingSubTask(null)} className="text-xs text-muted-foreground px-1">✕</button>
                                            </form>
                                          ) : (
                                            <span className={`flex-1 text-sm ${
                                              st.done ? 'line-through text-muted-foreground' : ''
                                            }`}>
                                              {st.text}
                                            </span>
                                          )}

                                          {/* Edit subtask — hover-only */}
                                          {editingSubTask?.subTaskId !== st.id && (
                                            <button
                                              onClick={() => openEditSubTask(item.id, st.id, st.text)}
                                              className="p-1 text-muted-foreground hover:text-foreground opacity-0 group-hover/sub:opacity-100 transition-opacity shrink-0"
                                              title="Edit sub-task"
                                            >
                                              <Pencil className="w-3.5 h-3.5" />
                                            </button>
                                          )}

                                          <button
                                            onClick={() => deleteSubTask(item.id, st.id)}
                                            className="p-1 text-muted-foreground hover:text-destructive opacity-0 group-hover/sub:opacity-100 transition-opacity shrink-0"
                                            data-testid={`btn-delete-subtask-${st.id}`}
                                          >
                                            <X className="w-4 h-4" />
                                          </button>
                                        </div>
                                      ))}
                                    </div>

                                    {/* Inline add sub-task */}
                                    {addingSubTaskFor === item.id ? (
                                      <form
                                        onSubmit={e => {
                                          e.preventDefault();
                                          handleAddSubTaskInline(item.id);
                                        }}
                                        className="flex gap-2 pt-1"
                                      >
                                        <input
                                          autoFocus
                                          value={newSubTaskText}
                                          onChange={e => setNewSubTaskText(e.target.value)}
                                          onKeyDown={e => e.key === 'Escape' && setAddingSubTaskFor(null)}
                                          className="flex-1 text-sm bg-background border border-border rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary/50"
                                          placeholder="New sub-task..."
                                        />
                                        <button
                                          type="submit"
                                          className="text-xs text-primary font-semibold px-2"
                                        >
                                          Add
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => setAddingSubTaskFor(null)}
                                          className="text-xs text-muted-foreground"
                                        >
                                          ✕
                                        </button>
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
      <BottomSheet isOpen={isAddTaskOpen} onClose={() => setIsAddTaskOpen(false)} title="New Task">
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
        onClose={() => { setIsAddListOpen(false); setNewSubTaskInputs(['']); }}
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
    </div>
  );
}
