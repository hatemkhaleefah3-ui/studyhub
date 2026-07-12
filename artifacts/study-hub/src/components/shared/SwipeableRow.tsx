import { ReactNode, useState } from 'react';
import { motion, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import { Pencil, Trash2 } from 'lucide-react';

interface SwipeableRowProps {
  children: ReactNode;
  onEdit?: () => void;
  onDelete?: () => void;
  className?: string;
  /** Rounded corner class applied to the reveal backgrounds, to match the row. */
  roundedClassName?: string;
}

const COMMIT_THRESHOLD = 88;

/**
 * Wraps a list/grid row with swipe-to-edit (right) and swipe-to-delete (left)
 * gestures, matching Phase 2.1: swipe left->right edits, right->left archives
 * (deletes). Works with touch AND mouse (framer-motion's drag handles both),
 * so this alone would already work on desktop — but each page also keeps its
 * existing hover-reveal Edit/Delete icons as an explicit non-swipe fallback.
 */
export function SwipeableRow({ children, onEdit, onDelete, className = '', roundedClassName = 'rounded-2xl' }: SwipeableRowProps) {
  const [isDragging, setIsDragging] = useState(false);
  const x = useMotionValue(0);
  const editOpacity = useTransform(x, [0, COMMIT_THRESHOLD], [0, 1]);
  const deleteOpacity = useTransform(x, [-COMMIT_THRESHOLD, 0], [1, 0]);
  const editScale = useTransform(x, [0, COMMIT_THRESHOLD], [0.7, 1]);
  const deleteScale = useTransform(x, [-COMMIT_THRESHOLD, 0], [1, 0.7]);

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
      {/* Edit reveal (swipe right) */}
      {onEdit && (
        <motion.div
          className={`absolute inset-y-0 left-0 flex items-center pl-5 bg-primary/15 text-primary ${roundedClassName}`}
          style={{ opacity: editOpacity, right: 0 }}
        >
          <motion.div style={{ scale: editScale }} className="flex items-center gap-2">
            <Pencil className="w-5 h-5" />
            <span className="text-sm font-semibold hidden sm:inline">Edit</span>
          </motion.div>
        </motion.div>
      )}
      {/* Delete reveal (swipe left) */}
      {onDelete && (
        <motion.div
          className={`absolute inset-y-0 right-0 flex items-center justify-end pr-5 bg-destructive/15 text-destructive ${roundedClassName}`}
          style={{ opacity: deleteOpacity, left: 0 }}
        >
          <motion.div style={{ scale: deleteScale }} className="flex items-center gap-2">
            <span className="text-sm font-semibold hidden sm:inline">Delete</span>
            <Trash2 className="w-5 h-5" />
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
