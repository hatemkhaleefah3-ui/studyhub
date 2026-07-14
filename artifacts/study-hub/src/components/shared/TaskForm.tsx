import { useState, useEffect } from "react";
import { focusNext } from "@/lib/focusNext";
import { BottomSheet } from "@/components/shared/BottomSheet";
import { useForm } from "react-hook-form";
import { ChevronDown, Settings2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { type ImportanceLevel, type RepeatInterval } from "@/hooks/useStudyData";

// ── Constants ─────────────────────────────────────────────────────────────────

export const IMPORTANCE_META: Record<ImportanceLevel, { label: string; color: string; dot: string }> = {
  high:   { label: "High",   color: "text-rose-500",    dot: "bg-rose-500"    },
  medium: { label: "Medium", color: "text-amber-500",   dot: "bg-amber-500"   },
  low:    { label: "Low",    color: "text-emerald-500", dot: "bg-emerald-500" },
};

export const REPEAT_META: Record<RepeatInterval, string> = {
  none: "No repeat", daily: "Daily", weekly: "Weekly", monthly: "Monthly",
};

const DAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

// ── Types ─────────────────────────────────────────────────────────────────────

export interface TaskFormValues {
  text: string;
  description: string;
  importance: ImportanceLevel | "";
  dueDate: string;
  dueTime: string;
  repeat: RepeatInterval;
  subjectId: string;
  link: string;
  repeatWeekDays: number[];
}

export const DEFAULT_TASK: TaskFormValues = {
  text: "", description: "", importance: "", dueDate: "", dueTime: "",
  repeat: "none", subjectId: "", link: "", repeatWeekDays: [],
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const fieldCls =
  "w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition-shadow";

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-0.5">{label}</p>
      {children}
    </div>
  );
}

// ── TaskForm ──────────────────────────────────────────────────────────────────

export function TaskForm({
  title,
  defaultValues,
  subjects: _subjects,
  onSubmit,
  onClose,
  submitLabel,
  hideSubject: _hideSubject,
  hideRepeat = false,
  minimal = false,
}: {
  title: string;
  defaultValues: TaskFormValues;
  /** @deprecated subject linking is removed; prop accepted but ignored */
  subjects?: { id: string; name: string }[];
  onSubmit: (data: TaskFormValues) => void;
  onClose: () => void;
  submitLabel: string;
  /** @deprecated subject linking is removed; prop accepted but ignored */
  hideSubject?: boolean;
  hideRepeat?: boolean;
  /** Sub-tasks only need a name and a link — skip description, importance, due date/time and repeat entirely. */
  minimal?: boolean;
}) {
  const hasAdvancedValues = !!(
    defaultValues.importance ||
    defaultValues.dueDate ||
    (defaultValues.repeat && defaultValues.repeat !== "none") ||
    defaultValues.link
  );
  const [showAdvanced, setShowAdvanced] = useState(hasAdvancedValues);
  const [weekDays, setWeekDays] = useState<number[]>(defaultValues.repeatWeekDays ?? []);

  const { register, handleSubmit, reset, watch, setValue } = useForm<TaskFormValues>({ defaultValues });

  const repeatValue  = watch("repeat");
  const dueDateValue = watch("dueDate");
  useEffect(() => {
    if (repeatValue && repeatValue !== "none" && !dueDateValue) {
      setValue("dueDate", format(new Date(), "yyyy-MM-dd"));
      setShowAdvanced(true);
    }
  }, [repeatValue, dueDateValue, setValue]);

  const toggleWeekDay = (day: number) => {
    setWeekDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort()
    );
  };

  const submit = (data: TaskFormValues) => {
    // Repeated tasks default to 12:00 AM when no time was chosen
    const finalData: TaskFormValues =
      data.repeat && data.repeat !== "none" && !data.dueTime
        ? { ...data, dueTime: "00:00", repeatWeekDays: weekDays }
        : { ...data, repeatWeekDays: weekDays };
    onSubmit(finalData);
    reset();
  };

  if (minimal) {
    return (
      <BottomSheet isOpen title={title} onClose={onClose}>
        <form onSubmit={handleSubmit(submit)} className="space-y-5 pb-2">
          <Section label="Name">
            <input
              {...register("text", { required: true })}
              className={fieldCls}
              placeholder="Sub-task name…"
              onKeyDown={focusNext}
            />
          </Section>
          <Section label="Link (optional)">
            <input
              {...register("link")}
              type="url"
              className={fieldCls}
              placeholder="https://…"
            />
          </Section>
          <button
            type="submit"
            className="w-full bg-primary text-primary-foreground font-semibold rounded-xl py-3.5"
          >
            {submitLabel}
          </button>
        </form>
      </BottomSheet>
    );
  }

  return (
    <BottomSheet isOpen title={title} onClose={onClose}>
      <form onSubmit={handleSubmit(submit)} className="space-y-5 pb-2">

        {/* Basic fields */}
        <Section label="Task">
          <input
            {...register("text", { required: true })}
            className={fieldCls}
            placeholder="Task name…"
            onKeyDown={focusNext}
          />
          <textarea
            {...register("description")}
            className={`${fieldCls} resize-none min-h-[64px]`}
            placeholder="Description (optional)"
          />
        </Section>

        {/* Advanced Settings toggle */}
        <button
          type="button"
          onClick={() => setShowAdvanced(v => !v)}
          className="flex items-center gap-2 w-full px-4 py-3 rounded-xl border border-border bg-secondary/40 hover:bg-secondary/70 transition-colors text-sm font-medium text-foreground"
        >
          <Settings2 className="w-4 h-4 text-muted-foreground shrink-0" />
          <span className="flex-1 text-left">Advanced Settings</span>
          {!showAdvanced && hasAdvancedValues && (
            <span className="text-xs text-primary font-normal">
              {[
                defaultValues.importance && IMPORTANCE_META[defaultValues.importance as ImportanceLevel]?.label,
                defaultValues.dueDate && "Due date",
                defaultValues.repeat && defaultValues.repeat !== "none" && REPEAT_META[defaultValues.repeat as RepeatInterval],
                defaultValues.link && "Link",
              ].filter(Boolean).join(" · ")}
            </span>
          )}
          <ChevronDown
            className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform duration-200 ${showAdvanced ? "rotate-180" : ""}`}
          />
        </button>

        {/* Advanced fields */}
        <AnimatePresence initial={false}>
          {showAdvanced && (
            <motion.div
              key="advanced"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              className="overflow-hidden"
            >
              <div className="space-y-5 pt-1 pb-1 border-l-2 border-primary/20 pl-4">

                <Section label="Importance">
                  <select {...register("importance")} className={fieldCls}>
                    <option value="">No importance set</option>
                    <option value="high">🔴 High</option>
                    <option value="medium">🟡 Medium</option>
                    <option value="low">🟢 Low</option>
                  </select>
                </Section>

                <Section label="Due Date & Time">
                  <div className="grid grid-cols-2 gap-3">
                    <input {...register("dueDate")} type="date" className={fieldCls} />
                    <input {...register("dueTime")} type="time" className={fieldCls} />
                  </div>
                </Section>

                {!hideRepeat && (
                  <Section label="Repeat">
                    <select {...register("repeat")} className={fieldCls}>
                      <option value="none">No repeat</option>
                      <option value="daily">Daily — repeats every day</option>
                      <option value="weekly">Weekly — pick specific days</option>
                      <option value="monthly">Monthly — repeats every 30 days</option>
                    </select>
                    {repeatValue === "weekly" && (
                      <div className="flex gap-1.5 flex-wrap mt-2">
                        {DAY_LABELS.map((label, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => toggleWeekDay(idx)}
                            className={`w-9 h-9 rounded-full text-xs font-bold border transition-all ${
                              weekDays.includes(idx)
                                ? "bg-primary text-primary-foreground border-primary"
                                : "bg-secondary/50 text-muted-foreground border-border/50 hover:bg-secondary"
                            }`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground px-0.5">
                      When you complete a repeating task, the next occurrence is created automatically.
                    </p>
                  </Section>
                )}

                <Section label="Link (optional)">
                  <input
                    {...register("link")}
                    type="url"
                    className={fieldCls}
                    placeholder="https://…"
                  />
                </Section>

              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <button
          type="submit"
          className="w-full bg-primary text-primary-foreground font-semibold rounded-xl py-3.5"
        >
          {submitLabel}
        </button>
      </form>
    </BottomSheet>
  );
}
