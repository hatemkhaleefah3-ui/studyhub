import { BottomSheet } from '@/components/shared/BottomSheet';

/**
 * Shown when deleting a task that belongs to a repeating series.
 * Default (Global Rule 8): "this occurrence only" — the primary button.
 */
export function DeleteSeriesSheet({
  isOpen,
  onClose,
  onDeleteOccurrence,
  onDeleteSeries,
}: {
  isOpen: boolean;
  onClose: () => void;
  onDeleteOccurrence: () => void;
  onDeleteSeries: () => void;
}) {
  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title="Delete repeating task">
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          This task repeats. Do you want to delete just this occurrence, or the entire series?
        </p>
        <button
          onClick={onDeleteOccurrence}
          className="w-full bg-primary text-primary-foreground font-semibold rounded-xl py-3.5"
          data-testid="btn-delete-occurrence-only"
        >
          This occurrence only
        </button>
        <button
          onClick={onDeleteSeries}
          className="w-full bg-destructive/10 text-destructive font-semibold rounded-xl py-3.5"
          data-testid="btn-delete-entire-series"
        >
          Entire series
        </button>
      </div>
    </BottomSheet>
  );
}
