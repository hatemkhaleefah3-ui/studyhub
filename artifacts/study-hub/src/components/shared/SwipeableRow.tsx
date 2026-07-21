import { isValidElement, ReactNode, useState } from 'react';
import { motion, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import { Pencil, Trash2 } from 'lucide-react';

export interface SwipeAction { icon: React.ReactNode; label?: string; bg: string; color: string; }
const DEFAULT_EDIT_ACTION: SwipeAction = { icon: <Pencil className="w-5 h-5" />, label: 'Edit', bg: 'bg-primary/15', color: 'text-primary' };
const DEFAULT_DELETE_ACTION: SwipeAction = { icon: <Trash2 className="w-5 h-5" />, label: 'Delete', bg: 'bg-destructive/15', color: 'text-destructive' };
interface SwipeableRowProps { children: ReactNode; onEdit?: () => void; onDelete?: () => void; editAction?: SwipeAction; deleteAction?: SwipeAction; className?: string; roundedClassName?: string; }
const COMMIT_THRESHOLD = 88;

export function SwipeableRow({ children, onEdit, onDelete, editAction, deleteAction, className = '', roundedClassName = 'rounded-2xl' }: SwipeableRowProps) {
  const childPlan = isValidElement(children) ? (children.props as any)?.plan : undefined;
  const isSchedulePlanCard = !!childPlan;
  const isLinkedFinalExamPlan = isSchedulePlanCard && childPlan.source === 'finalExam';
  if (isLinkedFinalExamPlan) return <span data-hidden-final-exam-plan className="hidden" />;
  const [isDragging, setIsDragging] = useState(false);
  const x = useMotionValue(0);
  const editReveal = editAction ?? DEFAULT_EDIT_ACTION, deleteReveal = deleteAction ?? DEFAULT_DELETE_ACTION;
  const deleteOpacity = useTransform(x, [0, COMMIT_THRESHOLD], [0, 1]), editOpacity = useTransform(x, [-COMMIT_THRESHOLD, 0], [1, 0]);
  const deleteScale = useTransform(x, [0, COMMIT_THRESHOLD], [0.7, 1]), editScale = useTransform(x, [-COMMIT_THRESHOLD, 0], [1, 0.7]);
  const handleDragEnd = (_: unknown, info: PanInfo) => { setIsDragging(false); if (info.offset.x < -COMMIT_THRESHOLD && onEdit) onEdit(); else if (info.offset.x > COMMIT_THRESHOLD && onDelete) onDelete(); };
  return <><style>{`section:has([data-hidden-final-exam-plan]):not(:has([data-visible-schedule-plan])){display:none}`}</style><div data-visible-schedule-plan={isSchedulePlanCard || undefined} className={`relative overflow-hidden ${roundedClassName} ${className}`}>{onDelete && <motion.div className={`absolute inset-y-0 left-0 flex items-center pl-5 ${deleteReveal.bg} ${deleteReveal.color} ${roundedClassName}`} style={{ opacity: deleteOpacity, right: 0 }}><motion.div style={{ scale: deleteScale }} className="flex items-center gap-2">{deleteReveal.icon}{deleteReveal.label && <span className="hidden text-sm font-semibold sm:inline">{deleteReveal.label}</span>}</motion.div></motion.div>}{onEdit && <motion.div className={`absolute inset-y-0 right-0 flex items-center justify-end pr-5 ${editReveal.bg} ${editReveal.color} ${roundedClassName}`} style={{ opacity: editOpacity, left: 0 }}><motion.div style={{ scale: editScale }} className="flex items-center gap-2">{editReveal.label && <span className="hidden text-sm font-semibold sm:inline">{editReveal.label}</span>}{editReveal.icon}</motion.div></motion.div>}<motion.div drag={onEdit || onDelete ? 'x' : false} dragDirectionLock dragElastic={0.7} dragConstraints={{ left: 0, right: 0 }} onDragStart={() => setIsDragging(true)} onDragEnd={handleDragEnd} style={{ x, touchAction: 'pan-y' }} className={`relative z-10 overflow-hidden ${roundedClassName}`} data-dragging={isDragging || undefined}>{children}</motion.div></div></>;
}
