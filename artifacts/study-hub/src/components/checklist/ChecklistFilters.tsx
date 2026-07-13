import type { ReactNode } from 'react';
import { Importance } from '@/hooks/useStudyData';
import { cn } from '@/lib/utils';

export type TimeFilter = 'all' | 'overdue' | 'today' | 'this-week' | 'no-date';
export type StatusFilter = 'all' | 'checked' | 'unchecked' | 'did-not-do';
export type RepeatFilter = 'all' | 'repeated' | 'one-off';

export interface ChecklistFilterState {
  importance: 'all' | Importance;
  time: TimeFilter;
  status: StatusFilter;
  repeat: RepeatFilter;
}

export const DEFAULT_CHECKLIST_FILTERS: ChecklistFilterState = {
  importance: 'all',
  time: 'all',
  status: 'all',
  repeat: 'all',
};

interface Group<T extends string> {
  label: string;
  value: T;
}

const IMPORTANCE_GROUPS: Group<ChecklistFilterState['importance']>[] = [
  { label: 'All', value: 'all' },
  { label: 'High', value: 'high' },
  { label: 'Medium', value: 'medium' },
  { label: 'Low', value: 'low' },
];

const TIME_GROUPS: Group<TimeFilter>[] = [
  { label: 'All', value: 'all' },
  { label: 'Overdue', value: 'overdue' },
  { label: 'Today', value: 'today' },
  { label: 'This week', value: 'this-week' },
  { label: 'No date', value: 'no-date' },
];

const STATUS_GROUPS: Group<StatusFilter>[] = [
  { label: 'All', value: 'all' },
  { label: 'Unchecked', value: 'unchecked' },
  { label: 'Checked', value: 'checked' },
  { label: 'Did not do', value: 'did-not-do' },
];

const REPEAT_GROUPS: Group<RepeatFilter>[] = [
  { label: 'All', value: 'all' },
  { label: 'Repeated', value: 'repeated' },
  { label: 'One-off', value: 'one-off' },
];

function FilterRow<T extends string>({
  label,
  groups,
  value,
  onChange,
}: {
  label: string;
  groups: Group<T>[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
      <span className="text-xs font-semibold text-muted-foreground shrink-0 w-20">{label}</span>
      <div className="flex items-center gap-1.5 shrink-0">
        {groups.map((g) => (
          <button
            key={g.value}
            onClick={() => onChange(g.value)}
            className={cn(
              'text-xs font-medium px-3 py-1.5 rounded-full whitespace-nowrap transition-colors',
              value === g.value
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary/70 text-muted-foreground hover:text-foreground'
            )}
            data-testid={`filter-${label.toLowerCase()}-${g.value}`}
          >
            {g.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Combinable filters — every row narrows the list independently (AND, not OR). */
export function ChecklistFilters({
  filters,
  onChange,
}: {
  filters: ChecklistFilterState;
  onChange: (next: ChecklistFilterState) => void;
}) {
  const isActive = JSON.stringify(filters) !== JSON.stringify(DEFAULT_CHECKLIST_FILTERS);

  return (
    <GlassFilterCard isActive={isActive} onReset={() => onChange(DEFAULT_CHECKLIST_FILTERS)}>
      <FilterRow label="Importance" groups={IMPORTANCE_GROUPS} value={filters.importance} onChange={(v) => onChange({ ...filters, importance: v })} />
      <FilterRow label="Time" groups={TIME_GROUPS} value={filters.time} onChange={(v) => onChange({ ...filters, time: v })} />
      <FilterRow label="Status" groups={STATUS_GROUPS} value={filters.status} onChange={(v) => onChange({ ...filters, status: v })} />
      <FilterRow label="Type" groups={REPEAT_GROUPS} value={filters.repeat} onChange={(v) => onChange({ ...filters, repeat: v })} />
    </GlassFilterCard>
  );
}

function GlassFilterCard({
  children,
  isActive,
  onReset,
}: {
  children: ReactNode;
  isActive: boolean;
  onReset: () => void;
}) {
  return (
    <div className="bg-card/50 backdrop-blur-xl border border-border rounded-2xl p-4 space-y-2.5">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold">Filters</span>
        {isActive && (
          <button
            onClick={onReset}
            className="text-xs font-medium text-primary hover:underline"
            data-testid="btn-reset-filters"
          >
            Reset
          </button>
        )}
      </div>
      {children}
    </div>
  );
}
