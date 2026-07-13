import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SlidersHorizontal, ChevronDown } from 'lucide-react';
import { Importance } from '@/hooks/useStudyData';
import { cn } from '@/lib/utils';

export type TimeFilter = 'overdue' | 'today' | 'this-week' | 'no-date';
export type StatusFilter = 'checked' | 'unchecked' | 'did-not-do';
export type RepeatFilter = 'repeated' | 'one-off';

export interface ChecklistFilterState {
  importance: Importance[];
  time: TimeFilter[];
  status: StatusFilter[];
  repeat: RepeatFilter[];
}

export const DEFAULT_CHECKLIST_FILTERS: ChecklistFilterState = {
  importance: [],
  time: [],
  status: [],
  repeat: [],
};

interface Group<T extends string> {
  label: string;
  value: T;
}

const IMPORTANCE_GROUPS: Group<Importance>[] = [
  { label: 'High', value: 'high' },
  { label: 'Medium', value: 'medium' },
  { label: 'Low', value: 'low' },
];

const TIME_GROUPS: Group<TimeFilter>[] = [
  { label: 'Overdue', value: 'overdue' },
  { label: 'Today', value: 'today' },
  { label: 'This week', value: 'this-week' },
  { label: 'No date', value: 'no-date' },
];

const STATUS_GROUPS: Group<StatusFilter>[] = [
  { label: 'Unchecked', value: 'unchecked' },
  { label: 'Checked', value: 'checked' },
  { label: 'Did not do', value: 'did-not-do' },
];

const REPEAT_GROUPS: Group<RepeatFilter>[] = [
  { label: 'Repeated', value: 'repeated' },
  { label: 'One-off', value: 'one-off' },
];

/** Toggle buttons within a row are OR'd together; an empty selection means "no restriction". */
function FilterRow<T extends string>({
  label,
  groups,
  values,
  onChange,
}: {
  label: string;
  groups: Group<T>[];
  values: T[];
  onChange: (v: T[]) => void;
}) {
  const toggle = (value: T) => {
    onChange(values.includes(value) ? values.filter((v) => v !== value) : [...values, value]);
  };

  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
      <span className="text-xs font-semibold text-muted-foreground shrink-0 w-20">{label}</span>
      <div className="flex items-center gap-1.5 shrink-0">
        {groups.map((g) => {
          const active = values.includes(g.value);
          return (
            <button
              key={g.value}
              type="button"
              aria-pressed={active}
              onClick={() => toggle(g.value)}
              className={cn(
                'text-xs font-medium px-3 py-1.5 rounded-full whitespace-nowrap transition-colors',
                active
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary/70 text-muted-foreground hover:text-foreground'
              )}
              data-testid={`filter-${label.toLowerCase()}-${g.value}`}
            >
              {g.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function countActive(filters: ChecklistFilterState): number {
  return filters.importance.length + filters.time.length + filters.status.length + filters.repeat.length;
}

/**
 * Combinable filters — every row narrows the list independently (AND across
 * rows, OR within a row). Collapsed behind a "Filters" button by default;
 * clicking it toggles the options panel open/closed.
 */
export function ChecklistFilters({
  filters,
  onChange,
}: {
  filters: ChecklistFilterState;
  onChange: (next: ChecklistFilterState) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const activeCount = countActive(filters);

  return (
    <div className="bg-card/50 backdrop-blur-xl border border-border rounded-2xl overflow-hidden">
      <button
        onClick={() => setIsOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3.5"
        aria-expanded={isOpen}
        data-testid="btn-toggle-filters"
      >
        <span className="flex items-center gap-2 text-sm font-semibold">
          <SlidersHorizontal className="w-4 h-4 text-muted-foreground" />
          Filters
          {activeCount > 0 && (
            <span className="text-[11px] font-semibold bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center">
              {activeCount}
            </span>
          )}
        </span>
        <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={{ type: 'spring', stiffness: 320, damping: 26 }}>
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        </motion.div>
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            key="filter-body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: 'spring', damping: 26, stiffness: 280 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-0 space-y-2.5 border-t border-border/60">
              <div className="flex justify-end pt-3 -mb-1">
                {activeCount > 0 && (
                  <button
                    onClick={() => onChange(DEFAULT_CHECKLIST_FILTERS)}
                    className="text-xs font-medium text-primary hover:underline"
                    data-testid="btn-reset-filters"
                  >
                    Reset
                  </button>
                )}
              </div>
              <FilterRow label="Importance" groups={IMPORTANCE_GROUPS} values={filters.importance} onChange={(v) => onChange({ ...filters, importance: v })} />
              <FilterRow label="Time" groups={TIME_GROUPS} values={filters.time} onChange={(v) => onChange({ ...filters, time: v })} />
              <FilterRow label="Status" groups={STATUS_GROUPS} values={filters.status} onChange={(v) => onChange({ ...filters, status: v })} />
              <FilterRow label="Type" groups={REPEAT_GROUPS} values={filters.repeat} onChange={(v) => onChange({ ...filters, repeat: v })} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
