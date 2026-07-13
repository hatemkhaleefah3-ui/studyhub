import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Trash2, CheckCircle2, Circle, ChevronDown, ChevronRight,
  X, Pencil, Repeat, Clock, Link as LinkIcon, AlertTriangle,
} from 'lucide-react';
import { GlassCard } from '@/components/shared/GlassCard';
import { SwipeableRow } from '@/components/shared/SwipeableRow';
import { cn } from '@/lib/utils';
import {
  ChecklistItem, SubTask, Importance, DEFAULT_IMPORTANCE, getChecklistItemStatus,
} from '@/hooks/useStudyData';

const IMPORTANCE_STYLE: Record<Importance, string> = {
  high: 'bg-destructive/15 text-destructive',
  medium: 'bg-primary/15 text-primary',
  low: 'bg-secondary text-muted-foreground',
};

const IMPORTANCE_LABEL: Record<Importance, string> = {
  high: 'High',
  medium: 'Medium',
  low: 'Low',
};

function formatDue(dueAt: string) {
  const d = new Date(dueAt);
  return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

interface ChecklistItemRowProps {
  item: ChecklistItem;
  isExpanded: boolean;
  onToggleExpanded: () => void;
  onToggleDone: () => void;
  onEdit: () => void;
  onDeleteRequest: () => void;
  onToggleSubTask: (subTaskId: string) => void;
  onDeleteSubTask: (subTaskId: string) => void;
  onEditSubTaskRequest: (subTaskId: string, text: string, link: string) => void;
  editingSubTask: { itemId: string; subTaskId: string } | null;
  editSubTaskText: string;
  editSubTaskLink: string;
  onEditSubTaskTextChange: (v: string) => void;
  onEditSubTaskLinkChange: (v: string) => void;
  onSaveEditSubTask: () => void;
  onCancelEditSubTask: () => void;
  addingSubTaskFor: string | null;
  newSubTaskText: string;
  onNewSubTaskTextChange: (v: string) => void;
  onStartAddSubTask: () => void;
  onCancelAddSubTask: () => void;
  onSubmitAddSubTask: () => void;
}

export function ChecklistItemRow({
  item, isExpanded, onToggleExpanded, onToggleDone, onEdit, onDeleteRequest,
  onToggleSubTask, onDeleteSubTask, onEditSubTaskRequest,
  editingSubTask, editSubTaskText, editSubTaskLink, onEditSubTaskTextChange, onEditSubTaskLinkChange,
  onSaveEditSubTask, onCancelEditSubTask,
  addingSubTaskFor, newSubTaskText, onNewSubTaskTextChange, onStartAddSubTask, onCancelAddSubTask, onSubmitAddSubTask,
}: ChecklistItemRowProps) {
  const subTasks = item.subTasks || [];
  const status = getChecklistItemStatus(item);
  const importance = item.importance || DEFAULT_IMPORTANCE;
  const isRepeating = !!item.seriesId;

  return (
    <SwipeableRow onEdit={onEdit} onDelete={onDeleteRequest}>
      <GlassCard
        className={cn(
          'transition-opacity duration-300 overflow-hidden',
          item.done ? 'opacity-50' : 'opacity-100',
          status === 'did-not-do' && 'ring-1 ring-destructive/40'
        )}
      >
        {/* Main row */}
        <div className="p-4 flex items-start gap-4 group">
          <button
            onClick={onToggleDone}
            className="shrink-0 focus:outline-none mt-0.5"
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

          <div className="flex-1 min-w-0">
            <div
              className={cn('flex items-center gap-2 min-w-0', item.isTaskList && 'cursor-pointer select-none')}
              onClick={() => item.isTaskList && onToggleExpanded()}
            >
              <span className={cn('text-lg font-medium truncate transition-all', item.done && 'line-through text-muted-foreground')}>
                {item.text}
              </span>
              {item.isTaskList && (
                <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded-full shrink-0">
                  {subTasks.filter((st) => st.done).length}/{subTasks.length}
                </span>
              )}
            </div>

            {/* Badges: importance, due date, repeat, did-not-do */}
            <div className="flex items-center flex-wrap gap-1.5 mt-1.5">
              <span className={cn('text-[11px] font-semibold px-2 py-0.5 rounded-full', IMPORTANCE_STYLE[importance])}>
                {IMPORTANCE_LABEL[importance]}
              </span>
              {item.dueAt && (
                <span className="flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-secondary/70 text-muted-foreground">
                  <Clock className="w-3 h-3" /> {formatDue(item.dueAt)}
                </span>
              )}
              {isRepeating && (
                <span className="flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-secondary/70 text-muted-foreground">
                  <Repeat className="w-3 h-3" /> Repeating
                </span>
              )}
              {status === 'did-not-do' && (
                <span className="flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-destructive/15 text-destructive">
                  <AlertTriangle className="w-3 h-3" /> Did not do
                </span>
              )}
            </div>
          </div>

          {item.isTaskList && (
            <button
              onClick={onToggleExpanded}
              className="p-1 text-muted-foreground hover:text-foreground transition-colors shrink-0"
              data-testid={`btn-expand-${item.id}`}
            >
              {isExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
            </button>
          )}

          <button
            onClick={onEdit}
            className={cn(
              'p-2 text-muted-foreground hover:text-foreground transition-opacity shrink-0',
              item.done ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
            )}
            title="Edit"
            data-testid={`btn-edit-item-${item.id}`}
          >
            <Pencil className="w-4 h-4" />
          </button>

          <button
            onClick={onDeleteRequest}
            className={cn(
              'p-2 text-muted-foreground hover:text-destructive transition-opacity shrink-0',
              item.done ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
            )}
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
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ type: 'spring', damping: 26, stiffness: 280 }}
              className="overflow-hidden"
            >
              <div className="px-4 pb-4 pt-0 ml-11 border-t border-border/40 space-y-2">
                <div className="pt-3 space-y-2">
                  {subTasks.map((st) => (
                    <SubTaskRow
                      key={st.id}
                      subTask={st}
                      isEditing={editingSubTask?.subTaskId === st.id}
                      editText={editSubTaskText}
                      editLink={editSubTaskLink}
                      onEditTextChange={onEditSubTaskTextChange}
                      onEditLinkChange={onEditSubTaskLinkChange}
                      onToggle={() => onToggleSubTask(st.id)}
                      onDelete={() => onDeleteSubTask(st.id)}
                      onStartEdit={() => onEditSubTaskRequest(st.id, st.text, st.link || '')}
                      onSaveEdit={onSaveEditSubTask}
                      onCancelEdit={onCancelEditSubTask}
                    />
                  ))}
                </div>

                {addingSubTaskFor === item.id ? (
                  <form
                    onSubmit={(e) => { e.preventDefault(); onSubmitAddSubTask(); }}
                    className="flex gap-2 pt-1"
                  >
                    <input
                      autoFocus
                      value={newSubTaskText}
                      onChange={(e) => onNewSubTaskTextChange(e.target.value)}
                      onKeyDown={(e) => e.key === 'Escape' && onCancelAddSubTask()}
                      className="flex-1 text-sm bg-background border border-border rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary/50"
                      placeholder="New sub-task..."
                    />
                    <button type="submit" className="text-xs text-primary font-semibold px-2">Add</button>
                    <button type="button" onClick={onCancelAddSubTask} className="text-xs text-muted-foreground">✕</button>
                  </form>
                ) : (
                  <button
                    onClick={onStartAddSubTask}
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
  );
}

function SubTaskRow({
  subTask, isEditing, editText, editLink, onEditTextChange, onEditLinkChange,
  onToggle, onDelete, onStartEdit, onSaveEdit, onCancelEdit,
}: {
  subTask: SubTask;
  isEditing: boolean;
  editText: string;
  editLink: string;
  onEditTextChange: (v: string) => void;
  onEditLinkChange: (v: string) => void;
  onToggle: () => void;
  onDelete: () => void;
  onStartEdit: () => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
}) {
  return (
    <div className="flex items-center gap-3 group/sub">
      <button onClick={onToggle} className="shrink-0" data-testid={`checkbox-subtask-${subTask.id}`}>
        <motion.div whileTap={{ scale: 0.75 }}>
          {subTask.done ? (
            <CheckCircle2 className="w-5 h-5 text-primary" />
          ) : (
            <Circle className="w-5 h-5 text-muted-foreground hover:text-primary transition-colors" />
          )}
        </motion.div>
      </button>

      {isEditing ? (
        <form onSubmit={(e) => { e.preventDefault(); onSaveEdit(); }} className="flex-1 flex flex-col gap-1.5">
          <div className="flex gap-2">
            <input
              autoFocus
              value={editText}
              onChange={(e) => onEditTextChange(e.target.value)}
              onKeyDown={(e) => e.key === 'Escape' && onCancelEdit()}
              className="flex-1 text-sm bg-background border border-border rounded-lg px-3 py-1 focus:outline-none focus:ring-1 focus:ring-primary/50"
            />
            <button type="submit" className="text-xs text-primary font-semibold px-2">Save</button>
            <button type="button" onClick={onCancelEdit} className="text-xs text-muted-foreground px-1">✕</button>
          </div>
          <input
            value={editLink}
            onChange={(e) => onEditLinkChange(e.target.value)}
            placeholder="Info link (optional)"
            className="text-xs bg-background border border-border rounded-lg px-3 py-1 focus:outline-none focus:ring-1 focus:ring-primary/50"
          />
        </form>
      ) : (
        <span className={cn('flex-1 text-sm', subTask.done && 'line-through text-muted-foreground')}>
          {subTask.text}
        </span>
      )}

      {!isEditing && subTask.link && (
        <a
          href={subTask.link}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="p-1 text-primary/70 hover:text-primary opacity-0 group-hover/sub:opacity-100 transition-opacity shrink-0"
          title="Open info link"
        >
          <LinkIcon className="w-3.5 h-3.5" />
        </a>
      )}

      {!isEditing && (
        <button
          onClick={onStartEdit}
          className="p-1 text-muted-foreground hover:text-foreground opacity-0 group-hover/sub:opacity-100 transition-opacity shrink-0"
          title="Edit sub-task"
        >
          <Pencil className="w-3.5 h-3.5" />
        </button>
      )}

      <button
        onClick={onDelete}
        className="p-1 text-muted-foreground hover:text-destructive opacity-0 group-hover/sub:opacity-100 transition-opacity shrink-0"
        data-testid={`btn-delete-subtask-${subTask.id}`}
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
