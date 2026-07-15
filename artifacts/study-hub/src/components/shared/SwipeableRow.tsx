import { ReactNode, useState } from 'react';
import { motion, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import { Pencil, Trash2 } from 'lucide-react';

// ── Action config ─────────────────────────────────────────────────────────────

export interface SwipeAction {
  icon: React.ReactNode;
  label?: string;
  /** Tailwind bg class, e.g. "bg-primary/15" */
  bg: string;
  /** Tailwind text class, e.g. "text-primary" */
  color: string;
}

const DEFAULT_EDIT_ACTION: SwipeAction = {
  icon: <Pencil className="w-5 h-5" />,
  label: 'Edit',
  bg: 'bg-primary/15',
  color: 'text-primary',
};

const DEFAULT_DELETE_ACTION: SwipeAction = {
  icon: <Trash2 className="w-5 h-5" />,
  label: 'Delete',
  bg: 'bg-destructive/15',
  color: 'text-destructive',
};

// ── Props ─────────────────────────────────────────────────────────────────────

interface SwipeableRowProps {
  children: ReactNode;
  /** Called when the user swipes right past the threshold */
  onEdit?: () => void;
  /** Called when the user swipes left past the threshold */
  onDelete?: () => void;
  /** Override the default icon/colour for the right-swipe reveal */
  editAction?: SwipeAction;
  /** Override the default icon/colour for the left-swipe reveal */
  deleteAction?: SwipeAction;
  className?: string;
  /** Rounded corner class applied to the reveal backgrounds */
  roundedClassName?: string;
}

const COMMIT_THRESHOLD = 88;

// ── Component ─────────────────────────────────────────────────────────────────

export function SwipeableRow({
  children,
  onEdit,
  onDelete,
  editAction,
  deleteAction,
  className = '',
  roundedClassName = 'rounded-2xl',
}: SwipeableRowProps) {
  const [isDragging, setIsDragging] = useState(false);
  const x = useMotionValue(0);

  const rightReveal = editAction ?? DEFAULT_EDIT_ACTION;
  const leftReveal  = deleteAction ?? DEFAULT_DELETE_ACTION;

  const editOpacity   = useTransform(x, [0, COMMIT_THRESHOLD], [0, 1]);
  const deleteOpacity = useTransform(x, [-COMMIT_THRESHOLD, 0], [1, 0]);
  const editScale     = useTransform(x, [0, COMMIT_THRESHOLD], [0.7, 1]);
  const deleteScale   = useTransform(x, [-COMMIT_THRESHOLD, 0], [1, 0.7]);

  const handleDragEnd = (_: any, info: PanInfo) => {
    setIsDragging(false);
    if (info.offset.x > COMMIT_THRESHOLD && onEdit) {
      onEdit();
    } else if (info.offset.x < -COMMIT_THRESHOLD && onDelete) {
      onDelete();
    }
  };

  return (
    <div className={`relative ${className}`}>

      {/* Right-swipe reveal (shown on left side) */}
      {onEdit && (
        <motion.div
          className={`absolute inset-y-0 left-0 flex items-center pl-5 ${rightReveal.bg} ${rightReveal.color} ${roundedClassName}`}
          style={{ opacity: editOpacity, right: 0 }}
        >
          <motion.div style={{ scale: editScale }} className="flex items-center gap-2">
            {rightReveal.icon}
            {rightReveal.label && (
              <span className="text-sm font-semibold hidden sm:inline">{rightReveal.label}</span>
            )}
          </motion.div>
        </motion.div>
      )}

      {/* Left-swipe reveal (shown on right side) */}
      {onDelete && (
        <motion.div
          className={`absolute inset-y-0 right-0 flex items-center justify-end pr-5 ${leftReveal.bg} ${leftReveal.color} ${roundedClassName}`}
          style={{ opacity: deleteOpacity, left: 0 }}
        >
          <motion.div style={{ scale: deleteScale }} className="flex items-center gap-2">
            {leftReveal.label && (
              <span className="text-sm font-semibold hidden sm:inline">{leftReveal.label}</span>
            )}
            {leftReveal.icon}
          </motion.div>
        </motion.div>
      )}

      <motion.div
        drag={onEdit || onDelete ? 'x' : false}
        dragDirectionLock
        dragElastic={0.7}
        dragConstraints={{ left: 0, right: 0 }}
        onDragStart={() => setIsDragging(true)}
        onDragEnd={handleDragEnd}
        style={{ x, touchAction: 'pan-y' }}
        className="relative z-10"
        data-dragging={isDragging || undefined}
      >
        {children}
      </motion.div>
    </div>
  );
}
