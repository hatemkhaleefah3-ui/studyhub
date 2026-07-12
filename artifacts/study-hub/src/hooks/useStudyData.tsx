import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { api, ArchiveEntry } from '@/lib/api';

export type Theme = 'light' | 'dark';
export type AccentColor = 'blue' | 'green' | 'orange' | 'red' | 'purple' | 'teal';

export interface Subject {
  id: string;
  name: string;
  color: string;
  lectures: Lecture[];
  exams: Exam[];
}

export interface Lecture {
  id: string;
  name: string;
  link: string;
}

export interface Exam {
  id: string;
  name: string;
  link: string;
  grade: string | null;
  date: string | null;
  weight?: number;
}

export interface ScheduleEvent {
  id: string;
  subjectId: string;
  title: string;
  datetime: string;
  note: string;
  checklistItemId: string | null;
  done: boolean;
}

export interface SubTask {
  id: string;
  text: string;
  done: boolean;
}

export interface ChecklistItem {
  id: string;
  text: string;
  subjectId: string | null;
  done: boolean;
  linkedScheduleId: string | null;
  doneAt?: string;
  isTaskList?: boolean;
  subTasks?: SubTask[];
}

export interface Settings {
  theme: Theme;
  accentColor: AccentColor;
}

interface StudyDataContextType {
  subjects: Subject[];
  schedule: ScheduleEvent[];
  checklist: ChecklistItem[];
  settings: Settings;
  isLoaded: boolean;

  addSubject: (s: Omit<Subject, 'id' | 'lectures' | 'exams'>) => void;
  updateSubject: (id: string, s: Partial<Subject>) => void;
  deleteSubject: (id: string) => void;

  addLecture: (subjectId: string, l: Omit<Lecture, 'id'>) => void;
  updateLecture: (subjectId: string, lectureId: string, l: Partial<Lecture>) => void;
  deleteLecture: (subjectId: string, id: string) => void;

  addExam: (subjectId: string, e: Omit<Exam, 'id'>) => void;
  updateExam: (subjectId: string, id: string, e: Partial<Exam>) => void;
  deleteExam: (subjectId: string, id: string) => void;

  addScheduleEvent: (e: Omit<ScheduleEvent, 'id'>, createChecklist?: boolean) => void;
  updateScheduleEvent: (id: string, e: Partial<ScheduleEvent>) => void;
  deleteScheduleEvent: (id: string) => void;

  addChecklistItem: (i: Omit<ChecklistItem, 'id'>) => void;
  updateChecklistItem: (id: string, i: Partial<ChecklistItem>) => void;
  toggleChecklistItem: (id: string) => void;
  deleteChecklistItem: (id: string) => void;

  addSubTask: (itemId: string, text: string) => void;
  updateSubTask: (itemId: string, subTaskId: string, data: Partial<SubTask>) => void;
  toggleSubTask: (itemId: string, subTaskId: string) => void;
  deleteSubTask: (itemId: string, subTaskId: string) => void;

  updateSettings: (s: Partial<Settings>) => void;
  resetData: () => void;
  importData: (data: any) => void;

  archive: ArchiveEntry[];
  isArchiveLoaded: boolean;
  refreshArchive: () => void;
  restoreArchiveItem: (id: string) => void;
  permanentlyDeleteArchiveItem: (id: string) => void;
}

const defaultSettings: Settings = { theme: 'light', accentColor: 'blue' };

const StudyDataContext = createContext<StudyDataContextType | null>(null);

export const ACCENT_COLORS: Record<AccentColor, string> = {
  blue: '211 100% 50%',
  green: '135 59% 49%',
  orange: '35 100% 50%',
  red: '356 100% 59%',
  purple: '280 67% 60%',
  teal: '199 94% 67%',
};

export const ACCENT_HEX: Record<AccentColor, string> = {
  blue: '#007aff',
  green: '#34c759',
  orange: '#ff9500',
  red: '#ff3b30',
  purple: '#af52de',
  teal: '#5ac8fa',
};

export function StudyDataProvider({ children }: { children: ReactNode }) {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [schedule, setSchedule] = useState<ScheduleEvent[]>([]);
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [isLoaded, setIsLoaded] = useState(false);
  const [archive, setArchive] = useState<ArchiveEntry[]>([]);
  const [isArchiveLoaded, setIsArchiveLoaded] = useState(false);

  // Load from API on mount
  useEffect(() => {
    api.getData()
      .then((data) => {
        if (data.subjects) setSubjects(data.subjects);
        if (data.schedule) setSchedule(data.schedule);
        if (data.checklist) setChecklist(data.checklist);
        if (data.settings) setSettings(data.settings);
      })
      .catch((err) => {
        console.error('Failed to load study data from API:', err);
      })
      .finally(() => {
        setIsLoaded(true);
      });
  }, []);

  const refreshArchive = useCallback(() => {
    api.getArchive()
      .then(setArchive)
      .catch((err) => console.error('Failed to load archive:', err))
      .finally(() => setIsArchiveLoaded(true));
  }, []);

  const restoreArchiveItem = useCallback((id: string) => {
    api.restoreArchiveItem(id)
      .then(({ category, item }) => {
        if (category === 'subject') setSubjects((prev) => [...prev, item]);
        if (category === 'schedule') setSchedule((prev) => [...prev, item]);
        if (category === 'checklist') setChecklist((prev) => [...prev, item]);
        setArchive((prev) => prev.filter((a) => a.id !== id));
      })
      .catch(console.error);
  }, []);

  const permanentlyDeleteArchiveItem = useCallback((id: string) => {
    setArchive((prev) => prev.filter((a) => a.id !== id));
    api.permanentlyDeleteArchiveItem(id).catch(console.error);
  }, []);

  // Apply theme to DOM
  useEffect(() => {
    if (settings.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [settings.theme]);

  // Apply accent color CSS variable
  useEffect(() => {
    document.documentElement.style.setProperty(
      '--primary',
      ACCENT_COLORS[settings.accentColor]
    );
  }, [settings.accentColor]);

  // ─── Subjects ──────────────────────────────────────────────────────────────
  const addSubject = useCallback((s: Omit<Subject, 'id' | 'lectures' | 'exams'>) => {
    const newSubject: Subject = { ...s, id: crypto.randomUUID(), lectures: [], exams: [] };
    setSubjects((prev) => [...prev, newSubject]);
    api.createSubject(newSubject).catch(console.error);
  }, []);

  const updateSubject = useCallback((id: string, s: Partial<Subject>) => {
    setSubjects((prev) =>
      prev.map((sub) => (sub.id === id ? { ...sub, ...s } : sub))
    );
    api.updateSubject(id, s).catch(console.error);
  }, []);

  const deleteSubject = useCallback((id: string) => {
    setSubjects((prev) => prev.filter((s) => s.id !== id));
    setSchedule((prev) => prev.filter((e) => e.subjectId !== id));
    setChecklist((prev) => prev.filter((c) => c.subjectId !== id));
    api.deleteSubject(id).catch(console.error);
  }, []);

  // ─── Lectures ──────────────────────────────────────────────────────────────
  const addLecture = useCallback((subjectId: string, l: Omit<Lecture, 'id'>) => {
    const newLecture: Lecture = { ...l, id: crypto.randomUUID() };
    setSubjects((prev) =>
      prev.map((s) =>
        s.id === subjectId ? { ...s, lectures: [...s.lectures, newLecture] } : s
      )
    );
    api.createLecture(subjectId, newLecture).catch(console.error);
  }, []);

  const updateLecture = useCallback(
    (subjectId: string, lectureId: string, l: Partial<Lecture>) => {
      setSubjects((prev) =>
        prev.map((s) =>
          s.id === subjectId
            ? {
                ...s,
                lectures: s.lectures.map((lec) =>
                  lec.id === lectureId ? { ...lec, ...l } : lec
                ),
              }
            : s
        )
      );
      api.updateLecture(subjectId, lectureId, l).catch(console.error);
    },
    []
  );

  const deleteLecture = useCallback((subjectId: string, id: string) => {
    setSubjects((prev) =>
      prev.map((s) =>
        s.id === subjectId
          ? { ...s, lectures: s.lectures.filter((l) => l.id !== id) }
          : s
      )
    );
    api.deleteLecture(subjectId, id).catch(console.error);
  }, []);

  // ─── Exams ─────────────────────────────────────────────────────────────────
  const addExam = useCallback((subjectId: string, e: Omit<Exam, 'id'>) => {
    const newExam: Exam = { ...e, id: crypto.randomUUID() };
    setSubjects((prev) =>
      prev.map((s) =>
        s.id === subjectId ? { ...s, exams: [...s.exams, newExam] } : s
      )
    );
    api.createExam(subjectId, newExam).catch(console.error);
  }, []);

  const updateExam = useCallback((subjectId: string, id: string, e: Partial<Exam>) => {
    setSubjects((prev) =>
      prev.map((s) =>
        s.id === subjectId
          ? { ...s, exams: s.exams.map((ex) => (ex.id === id ? { ...ex, ...e } : ex)) }
          : s
      )
    );
    api.updateExam(subjectId, id, e).catch(console.error);
  }, []);

  const deleteExam = useCallback((subjectId: string, id: string) => {
    setSubjects((prev) =>
      prev.map((s) =>
        s.id === subjectId ? { ...s, exams: s.exams.filter((e) => e.id !== id) } : s
      )
    );
    api.deleteExam(subjectId, id).catch(console.error);
  }, []);

  // ─── Schedule ──────────────────────────────────────────────────────────────
  const addScheduleEvent = useCallback(
    (e: Omit<ScheduleEvent, 'id'>, createChecklistTask?: boolean) => {
      const newEvent: ScheduleEvent = { ...e, id: crypto.randomUUID() };
      setSchedule((prev) => [...prev, newEvent]);

      if (createChecklistTask) {
        const task: ChecklistItem = {
          id: crypto.randomUUID(),
          text: e.title,
          subjectId: e.subjectId || null,
          done: false,
          linkedScheduleId: newEvent.id,
          isTaskList: false,
        };
        setChecklist((prev) => [...prev, task]);
        api.createScheduleEvent(newEvent, true).catch(console.error);
      } else {
        api.createScheduleEvent(newEvent, false).catch(console.error);
      }
    },
    []
  );

  const updateScheduleEvent = useCallback((id: string, e: Partial<ScheduleEvent>) => {
    setSchedule((prev) =>
      prev.map((ev) => (ev.id === id ? { ...ev, ...e } : ev))
    );
    api.updateScheduleEvent(id, e).catch(console.error);
  }, []);

  const deleteScheduleEvent = useCallback((id: string) => {
    setSchedule((prev) => prev.filter((e) => e.id !== id));
    api.deleteScheduleEvent(id).catch(console.error);
  }, []);

  // ─── Checklist ─────────────────────────────────────────────────────────────
  const addChecklistItem = useCallback((i: Omit<ChecklistItem, 'id'>) => {
    const newItem: ChecklistItem = { ...i, id: crypto.randomUUID() };
    setChecklist((prev) => [...prev, newItem]);
    api.createChecklistItem(newItem).catch(console.error);
  }, []);

  const updateChecklistItem = useCallback((id: string, i: Partial<ChecklistItem>) => {
    setChecklist((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...i } : item))
    );
    api.updateChecklistItem(id, i).catch(console.error);
  }, []);

  const toggleChecklistItem = useCallback((id: string) => {
    setChecklist((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const done = !item.done;
        const updated = { ...item, done, doneAt: done ? new Date().toISOString() : undefined };
        api.updateChecklistItem(id, { done, doneAt: updated.doneAt }).catch(console.error);

        // Sync linked schedule event
        if (item.linkedScheduleId) {
          setSchedule((prevSched) =>
            prevSched.map((ev) =>
              ev.id === item.linkedScheduleId ? { ...ev, done } : ev
            )
          );
          api.updateScheduleEvent(item.linkedScheduleId, { done }).catch(console.error);
        }
        return updated;
      })
    );
  }, []);

  const deleteChecklistItem = useCallback((id: string) => {
    setChecklist((prev) => prev.filter((item) => item.id !== id));
    api.deleteChecklistItem(id).catch(console.error);
  }, []);

  // ─── SubTasks ──────────────────────────────────────────────────────────────
  const addSubTask = useCallback((itemId: string, text: string) => {
    const newSubTask: SubTask = { id: crypto.randomUUID(), text, done: false };
    setChecklist((prev) =>
      prev.map((item) =>
        item.id === itemId
          ? { ...item, subTasks: [...(item.subTasks || []), newSubTask] }
          : item
      )
    );
    api.createSubTask(itemId, text).catch(console.error);
  }, []);

  const updateSubTask = useCallback(
    (itemId: string, subTaskId: string, data: Partial<SubTask>) => {
      setChecklist((prev) =>
        prev.map((item) =>
          item.id === itemId
            ? {
                ...item,
                subTasks: (item.subTasks || []).map((st) =>
                  st.id === subTaskId ? { ...st, ...data } : st
                ),
              }
            : item
        )
      );
      api.updateSubTask(itemId, subTaskId, data).catch(console.error);
    },
    []
  );

  const toggleSubTask = useCallback((itemId: string, subTaskId: string) => {
    setChecklist((prev) =>
      prev.map((item) => {
        if (item.id !== itemId) return item;
        const newSubTasks = (item.subTasks || []).map((st) =>
          st.id === subTaskId ? { ...st, done: !st.done } : st
        );
        const allDone = newSubTasks.length > 0 && newSubTasks.every((st) => st.done);
        api.updateSubTask(itemId, subTaskId, {
          done: newSubTasks.find((st) => st.id === subTaskId)?.done,
        }).catch(console.error);
        return { ...item, subTasks: newSubTasks, done: allDone };
      })
    );
  }, []);

  const deleteSubTask = useCallback((itemId: string, subTaskId: string) => {
    setChecklist((prev) =>
      prev.map((item) =>
        item.id === itemId
          ? { ...item, subTasks: (item.subTasks || []).filter((st) => st.id !== subTaskId) }
          : item
      )
    );
    api.deleteSubTask(itemId, subTaskId).catch(console.error);
  }, []);

  // ─── Settings ──────────────────────────────────────────────────────────────
  const updateSettings = useCallback((s: Partial<Settings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...s };
      api.updateSettings(next).catch(console.error);
      return next;
    });
  }, []);

  const resetData = useCallback(() => {
    setSubjects([]);
    setSchedule([]);
    setChecklist([]);
    setSettings(defaultSettings);
    api.resetData().catch(console.error);
  }, []);

  const importData = useCallback((data: any) => {
    if (data.subjects) setSubjects(data.subjects);
    if (data.schedule) setSchedule(data.schedule);
    if (data.checklist) setChecklist(data.checklist);
    if (data.settings) setSettings(data.settings);
    api.importData(data).catch(console.error);
  }, []);

  return (
    <StudyDataContext.Provider
      value={{
        subjects,
        schedule,
        checklist,
        settings,
        isLoaded,
        addSubject,
        updateSubject,
        deleteSubject,
        addLecture,
        updateLecture,
        deleteLecture,
        addExam,
        updateExam,
        deleteExam,
        addScheduleEvent,
        updateScheduleEvent,
        deleteScheduleEvent,
        addChecklistItem,
        updateChecklistItem,
        toggleChecklistItem,
        deleteChecklistItem,
        addSubTask,
        updateSubTask,
        toggleSubTask,
        deleteSubTask,
        updateSettings,
        resetData,
        importData,
        archive,
        isArchiveLoaded,
        refreshArchive,
        restoreArchiveItem,
        permanentlyDeleteArchiveItem,
      }}
    >
      {isLoaded ? children : (
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="flex flex-col items-center gap-4 text-muted-foreground">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-sm font-medium">Loading your data…</p>
          </div>
        </div>
      )}
    </StudyDataContext.Provider>
  );
}

export function useStudyData() {
  const context = useContext(StudyDataContext);
  if (!context) {
    throw new Error('useStudyData must be used within a StudyDataProvider');
  }
  return context;
}
