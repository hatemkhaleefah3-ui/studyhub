import { useState, useRef, useEffect } from "react";
import { useStudyData } from "@/hooks/useStudyData";
import { GlassCard } from "@/components/shared/GlassCard";
import { BottomSheet } from "@/components/shared/BottomSheet";
import { ConfirmSheet } from "@/components/shared/ConfirmSheet";
import { FabPortal } from "@/components/shared/FabPortal";
import { SwipeableRow } from "@/components/shared/SwipeableRow";
import { format, startOfWeek, addDays, isSameDay } from "date-fns";
import { Plus, CheckCircle, Link2, Pencil, Trash2 } from "lucide-react";
import { useForm } from "react-hook-form";

export function Schedule() {
  const { schedule, subjects, checklist, addScheduleEvent, updateScheduleEvent, deleteScheduleEvent, toggleChecklistItem } = useStudyData();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const { register, handleSubmit, reset } = useForm({
    defaultValues: {
      title: "",
      subjectId: "",
      date: format(new Date(), "yyyy-MM-dd"),
      time: "09:00",
      note: "",
      createChecklist: false,
    }
  });

  const { register: regEdit, handleSubmit: handleEditSubmit, reset: resetEdit } = useForm({
    defaultValues: { title: "", subjectId: "", date: "", time: "", note: "" }
  });

  // Auto-scroll to today on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      if (scrollAreaRef.current) {
        const todayBtn = scrollAreaRef.current.querySelector('[data-today="true"]') as HTMLElement | null;
        todayBtn?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      }
    }, 80);
    return () => clearTimeout(timer);
  }, []);

  const onSubmit = (data: any) => {
    const datetime = new Date(`${data.date}T${data.time}`).toISOString();
    addScheduleEvent({
      title: data.title,
      subjectId: data.subjectId,
      datetime,
      note: data.note,
      checklistItemId: null,
      done: false,
    }, data.createChecklist);
    reset({
      title: "",
      subjectId: "",
      date: format(new Date(), "yyyy-MM-dd"),
      time: "09:00",
      note: "",
      createChecklist: false,
    });
    setIsAddOpen(false);
  };

  const openEdit = (id: string) => {
    const ev = schedule.find(e => e.id === id);
    if (!ev) return;
    const dt = new Date(ev.datetime);
    resetEdit({
      title: ev.title,
      subjectId: ev.subjectId,
      date: format(dt, "yyyy-MM-dd"),
      time: format(dt, "HH:mm"),
      note: ev.note,
    });
    setEditingId(id);
  };

  const onEditSubmit = (data: any) => {
    if (!editingId) return;
    const datetime = new Date(`${data.date}T${data.time}`).toISOString();
    updateScheduleEvent(editingId, {
      title: data.title,
      subjectId: data.subjectId,
      datetime,
      note: data.note,
    });
    setEditingId(null);
  };

  const startDate = startOfWeek(selectedDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }).map((_, i) => addDays(startDate, i));

  const inputCls = "w-full bg-background border border-border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50";

  return (
    <div className="space-y-8 pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold tracking-tight mb-2">Schedule</h1>
          <p className="text-muted-foreground text-lg">{format(startDate, "MMMM yyyy")}</p>
        </div>
      </div>

      {/* Day selector — fixed shape, no scale transform that causes overflow.
          overflow-y-visible + vertical padding keep the selected-day ring/shadow
          fully contained in its own row instead of clipping into content above. */}
      <div
        ref={scrollAreaRef}
        className="relative z-10 flex gap-2 overflow-x-auto overflow-y-visible py-2 -my-2 scrollbar-hide snap-x snap-mandatory"
      >
        {weekDays.map((date, i) => {
          const isToday = isSameDay(date, new Date());
          const isSelected = isSameDay(date, selectedDate);

          return (
            <button
              key={i}
              data-today={isToday ? "true" : undefined}
              onClick={() => setSelectedDate(date)}
              className={`snap-center flex-shrink-0 flex flex-col items-center justify-center w-[4.5rem] h-[4.75rem] rounded-2xl transition-all duration-200 ${
                isSelected
                  ? 'bg-primary text-primary-foreground shadow-md shadow-primary/25 ring-2 ring-primary/30'
                  : 'bg-card/60 backdrop-blur border border-border hover:bg-card text-muted-foreground'
              }`}
              data-testid={`btn-day-${format(date, "yyyy-MM-dd")}`}
            >
              <span className="text-[10px] uppercase font-bold tracking-wider leading-none">
                {format(date, "EEE")}
              </span>
              <span className="text-xl font-bold mt-1 leading-none">{format(date, "d")}</span>
              {isToday && !isSelected && (
                <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5" />
              )}
            </button>
          );
        })}
      </div>

      {/* Events for selected day */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">
          {isSameDay(selectedDate, new Date()) ? "Today's Events" : format(selectedDate, "EEEE, MMM d")}
        </h2>

        {(() => {
          const dayEvents = schedule
            .filter(e => isSameDay(new Date(e.datetime), selectedDate))
            .sort((a, b) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime());

          if (dayEvents.length === 0) {
            return (
              <GlassCard className="p-12 text-center border-dashed border-2 bg-transparent text-muted-foreground">
                No events scheduled for this day.
              </GlassCard>
            );
          }

          return dayEvents.map(ev => {
            const subject = subjects.find(s => s.id === ev.subjectId);
            const linkedItem = ev.checklistItemId
              ? checklist.find(c => c.id === ev.checklistItemId)
              : null;
            const isDone = linkedItem ? linkedItem.done : ev.done;

            return (
              <SwipeableRow
                key={ev.id}
                onEdit={() => openEdit(ev.id)}
                onDelete={() => setDeletingId(ev.id)}
              >
                <GlassCard
                  className={`p-4 flex gap-4 transition-all group ${isDone ? 'opacity-50' : ''}`}
                  data-testid={`event-${ev.id}`}
                >
                  <div className="w-16 shrink-0 text-center flex flex-col items-center justify-center border-r border-border/50 pr-4">
                    <span className="text-lg font-bold">{format(new Date(ev.datetime), "HH:mm")}</span>
                  </div>
                  <div
                    className="w-1.5 rounded-full shrink-0"
                    style={{ backgroundColor: subject?.color || 'hsl(var(--primary))' }}
                  />
                  <div className="flex-1 py-1 min-w-0">
                    <h3 className={`font-semibold text-lg ${isDone ? 'line-through' : ''}`}>{ev.title}</h3>
                    <p className="text-sm text-muted-foreground mt-0.5">{subject?.name}</p>
                    {ev.note && (
                      <p className="text-sm mt-2 text-muted-foreground/80 bg-secondary/50 p-2 rounded-lg">{ev.note}</p>
                    )}
                    {ev.checklistItemId && (
                      <span className="inline-flex items-center gap-1 text-xs text-primary/70 mt-2">
                        <Link2 className="w-3 h-3" /> Linked to checklist
                      </span>
                    )}
                  </div>
                  {/* Edit + Delete — hover-only (desktop/mouse fallback for swipe) */}
                  <div className="flex flex-col gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity self-start mt-1">
                    <button
                      onClick={() => openEdit(ev.id)}
                      className="p-2 text-muted-foreground hover:bg-secondary hover:text-foreground rounded-full transition-all"
                      title="Edit event"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeletingId(ev.id)}
                      className="p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive rounded-full transition-all"
                      title="Delete event"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  {ev.checklistItemId && (
                    <button
                      onClick={() => toggleChecklistItem(ev.checklistItemId!)}
                      className="p-2 h-max shrink-0 mt-1 hover:scale-110 transition-transform"
                      data-testid={`btn-toggle-event-${ev.id}`}
                    >
                      <CheckCircle className={`w-6 h-6 ${isDone ? 'text-primary' : 'text-muted-foreground'}`} />
                    </button>
                  )}
                </GlassCard>
              </SwipeableRow>
            );
          });
        })()}
      </div>

      <FabPortal>
        <button
          onClick={() => setIsAddOpen(true)}
          className="fixed bottom-24 md:bottom-10 right-6 md:right-10 w-14 h-14 bg-primary text-primary-foreground rounded-full shadow-lg shadow-primary/30 flex items-center justify-center hover:scale-105 transition-transform z-40"
          data-testid="btn-add-event"
        >
          <Plus className="w-6 h-6" />
        </button>
      </FabPortal>

      {/* Add Event sheet */}
      <BottomSheet isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} title="New Event">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div>
            <label className="block text-sm font-medium mb-2">Title</label>
            <input
              {...register("title", { required: true })}
              className={inputCls}
              placeholder="e.g. Math Study Group"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Subject</label>
            <select
              {...register("subjectId")}
              className={`${inputCls} appearance-none`}
            >
              <option value="">Select a subject...</option>
              {subjects.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Date</label>
              <input type="date" {...register("date", { required: true })} className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Time</label>
              <input type="time" {...register("time", { required: true })} className={inputCls} />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Note (optional)</label>
            <textarea {...register("note")} className={`${inputCls} min-h-[80px]`} placeholder="Room 302..." />
          </div>

          <div className="flex items-center gap-3 bg-secondary/50 p-4 rounded-xl">
            <input
              type="checkbox"
              id="createChecklist"
              {...register("createChecklist")}
              className="w-5 h-5 rounded border-border accent-primary"
            />
            <label htmlFor="createChecklist" className="text-sm font-medium select-none">
              Create linked checklist task
            </label>
          </div>

          <button type="submit" className="w-full bg-primary text-primary-foreground font-semibold rounded-xl py-3.5">
            Create Event
          </button>
        </form>
      </BottomSheet>

      {/* Edit Event sheet */}
      <BottomSheet isOpen={!!editingId} onClose={() => setEditingId(null)} title="Edit Event">
        <form onSubmit={handleEditSubmit(onEditSubmit)} className="space-y-5">
          <div>
            <label className="block text-sm font-medium mb-2">Title</label>
            <input {...regEdit("title", { required: true })} className={inputCls} autoFocus />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Subject</label>
            <select {...regEdit("subjectId")} className={`${inputCls} appearance-none`}>
              <option value="">Select a subject...</option>
              {subjects.map(s => (<option key={s.id} value={s.id}>{s.name}</option>))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Date</label>
              <input type="date" {...regEdit("date", { required: true })} className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Time</label>
              <input type="time" {...regEdit("time", { required: true })} className={inputCls} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Note (optional)</label>
            <textarea {...regEdit("note")} className={`${inputCls} min-h-[80px]`} />
          </div>
          <button type="submit" className="w-full bg-primary text-primary-foreground font-semibold rounded-xl py-3.5">
            Save Changes
          </button>
        </form>
      </BottomSheet>

      {/* Delete confirm */}
      <ConfirmSheet
        isOpen={!!deletingId}
        onClose={() => setDeletingId(null)}
        onConfirm={() => { if (deletingId) { deleteScheduleEvent(deletingId); setDeletingId(null); } }}
        title="Delete event?"
        message="This event will be moved to the Archive. You can restore it later from Settings."
        confirmLabel="Move to Archive"
      />
    </div>
  );
}
