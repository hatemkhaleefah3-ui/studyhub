import { Importance, RepeatFrequency } from '@/hooks/useStudyData';

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export interface TaskDetailValues {
  importance: Importance;
  dueAt: string; // datetime-local input value, may be ''
  repeatFrequency: RepeatFrequency;
  weekdays: number[];
  dayOfMonth: number;
}

export const DEFAULT_TASK_DETAIL_VALUES: TaskDetailValues = {
  importance: 'medium',
  dueAt: '',
  repeatFrequency: 'none',
  weekdays: [],
  dayOfMonth: 1,
};

/**
 * Shared importance / due date / repeat fields used by both the
 * single-task and task-list "add" forms (Phase 3.2).
 */
export function TaskDetailFields({
  value,
  onChange,
}: {
  value: TaskDetailValues;
  onChange: (next: TaskDetailValues) => void;
}) {
  const toggleWeekday = (day: number) => {
    const next = value.weekdays.includes(day)
      ? value.weekdays.filter((d) => d !== day)
      : [...value.weekdays, day];
    onChange({ ...value, weekdays: next });
  };

  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium mb-2">Importance</label>
        <div className="flex gap-2">
          {(['low', 'medium', 'high'] as Importance[]).map((level) => (
            <button
              key={level}
              type="button"
              onClick={() => onChange({ ...value, importance: level })}
              className={`flex-1 text-sm font-medium py-2.5 rounded-xl border transition-colors capitalize ${
                value.importance === level
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background border-border text-muted-foreground'
              }`}
              data-testid={`btn-importance-${level}`}
            >
              {level}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Due date / time (optional)</label>
        <input
          type="datetime-local"
          value={value.dueAt}
          onChange={(e) => onChange({ ...value, dueAt: e.target.value })}
          className="w-full bg-background border border-border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Repeat</label>
        <div className="grid grid-cols-4 gap-2">
          {(['none', 'daily', 'weekly', 'monthly'] as RepeatFrequency[]).map((freq) => (
            <button
              key={freq}
              type="button"
              onClick={() => onChange({ ...value, repeatFrequency: freq })}
              className={`text-xs font-medium py-2.5 rounded-xl border transition-colors capitalize ${
                value.repeatFrequency === freq
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background border-border text-muted-foreground'
              }`}
              data-testid={`btn-repeat-${freq}`}
            >
              {freq === 'none' ? 'One-off' : freq}
            </button>
          ))}
        </div>

        {value.repeatFrequency === 'weekly' && (
          <div className="flex gap-1.5 mt-3">
            {WEEKDAY_LABELS.map((label, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => toggleWeekday(idx)}
                className={`flex-1 text-xs font-medium py-2 rounded-lg border transition-colors ${
                  value.weekdays.includes(idx)
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-background border-border text-muted-foreground'
                }`}
                data-testid={`btn-weekday-${idx}`}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        {value.repeatFrequency === 'monthly' && (
          <div className="mt-3">
            <label className="block text-xs text-muted-foreground mb-1.5">Day of month</label>
            <input
              type="number"
              min={1}
              max={31}
              value={value.dayOfMonth}
              onChange={(e) => onChange({ ...value, dayOfMonth: Math.min(31, Math.max(1, Number(e.target.value) || 1)) })}
              className="w-24 bg-background border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
        )}
      </div>
    </div>
  );
}
