import { BottomSheet } from './BottomSheet';
import { Trash2 } from 'lucide-react';

interface ConfirmSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message?: string;
  confirmLabel?: string;
}

export function ConfirmSheet({
  isOpen,
  onClose,
  onConfirm,
  title = 'Delete item?',
  message = 'This cannot be undone.',
  confirmLabel = 'Delete',
}: ConfirmSheetProps) {
  return (
    <BottomSheet isOpen={isOpen} onClose={onClose}>
      <div className="flex flex-col items-center text-center gap-4 pb-4">
        <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
          <Trash2 className="w-8 h-8 text-destructive" />
        </div>
        <h2 className="text-2xl font-bold">{title}</h2>
        <p className="text-muted-foreground">{message}</p>
        <div className="flex gap-3 w-full pt-2">
          <button
            onClick={onClose}
            className="flex-1 bg-secondary text-foreground font-semibold rounded-xl py-3.5 hover:opacity-90 transition-opacity"
          >
            Cancel
          </button>
          <button
            onClick={() => { onConfirm(); onClose(); }}
            className="flex-1 bg-destructive text-destructive-foreground font-semibold rounded-xl py-3.5 hover:opacity-90 transition-opacity"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </BottomSheet>
  );
}
