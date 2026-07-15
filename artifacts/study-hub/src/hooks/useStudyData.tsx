import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { addDays, addWeeks, addMonths, parseISO, format } from 'date-fns';
import { api, ArchiveEntry } from '@/lib/api';

export type Theme = 'light' | 'dark';
export type AccentColor = 'blue' | 'green' | 'orange' | 'red' | 'purple' | 'teal';

export interface Subject {
  id: string;
  name: string;
  color: string;
  emoji?: string;
  wallpaper?: string;
  driveLink?: string;
  lectureCount?: number;
  examCount?: number;
  attachments?: Attachment[];
  lectures: Lecture[];
  exams: Exam[];
}

export type AttachmentType = 'Study Sheet' | 'Exam' | 'Degree';
export type AttachmentFormat = 'File' | 'Image';
export type AttachmentPriority = 'Important' | 'Not Important';

export interface Attachment {
  id: string;
  url: string;
  name?: string;
  type: AttachmentType;
  format: AttachmentFormat;
  priority: AttachmentPriority;
}

export type StudyType = 'theoretical' | 'practical';

export interface Flashcard {
  id: string;
  front: string;
  back: string;
}

export interface Lecture {
  id: string;
  name: string;
  link: string;
  type: StudyType;
  checked?: boolean;
  flashcards?: Flashcard[];
  /** Percentage from the most recent Flashcards Reader session. Overwritten each session. */
  readerLastPercentage?: number | null;
}

export type QuestionType = 'MCQ' | 'Medical Case MCQ';

export interface ExamQuestion {
  id: string;
  questionType: QuestionType;
  text: string;
  choices: [string, string, string, string];
  correctAnswer: number; // 1-4
  labs?: string;
  histo?: string;
}

export interface ExamScore {
  correct: number;
  total: number;
  percentage: number;
  takenAt: string;
}

export interface Exam {
  id: string;
  name: string;
  link: string;
  grade: string | null;
  date: string | null;
  weight?: number;
  type: StudyType;
  checked?: boolean;
  linkedLectureIds?: string[];
  questions?: ExamQuestion[];
  lastScore?: ExamScore | null;
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

export type ImportanceLevel = 'high' | 'medium' | 'low';
export type RepeatInterval  = 'none' | 'daily' | 'weekly' | 'monthly';
export type TaskStatus      = 'undone' | 'done' | 'didNotDo';

export interface SubTask {
  id: string;
  text: string;
  description?: string;
  importance?: ImportanceLevel | null;
  dueDate?: string | null;
  dueTime?: string | null;
  link?: string | null;
  done: boolean;
  didNotDo?: boolean;
  doneAt?: string;
}

export interface ChecklistItem {
  id: string;
  text: string;
  description?: string;
  subjectId: string | null;
  done: boolean;
  didNotDo?: boolean;
  importance?: ImportanceLevel | null;
  dueDate?: string | null;
  dueTime?: string | null;
  repeat?: RepeatInterval | null;
  repeatWeekDays?: number[];
  link?: string | null;
  linkedScheduleId: string | null;
  doneAt?: string;
  isTaskList?: boolean;
  subTasks?: SubTask[];
  sortOrder?: number;
}

export interface Settings {
  theme: Theme;
  accentColor: AccentColor;
}

// ── Schedule Plans ─────────────────────────────────────────────────────────────
export const DEFAULT_SUBJECT_EMOJIS = [
  '📚','🔬','🧮','📐','🧪','📖','🎨','🏥','⚖️','💻',
  '🌍','🎭','🎵','📊','🔭','🏛️','💊','🌱','📝','🎯',
  '🔢','🧠','💡','🏆','🌟','⚗️','🎓','🔩','🌊','🎸',
];

export type ScheduleType = 'exam' | 'study' | 'review';
export type RepeatPatternPlan = 'daily' | 'weekly' | 'monthly';

export interface SchedulePlanItem {
  id: string;
  subjectName: string;
  subjectId?: string;
  /** Exam-type fields */
  date?: string;       // yyyy-MM-dd
  time?: string;       // HH:mm
  checked?: boolean;
  /** Study-type fields */
  startTime?: string;  // HH:mm
  endTime?: string;    // HH:mm
  repeatPattern?: RepeatPatternPlan;
  weekDays?: number[]; // 0=Sun … 6=Sat
  /** Review-type fields */
  reviewStartDate?: string;
  reviewEndDate?: string;
}

export interface SchedulePlan {
  id: string;
  type: ScheduleType;
  title: string;
  startDate: string; // yyyy-MM-dd
  endDate: string;   // yyyy-MM-dd
  items: SchedulePlanItem[];
  createdAt: string;
  importance?: number; // 1 = most important
}

// ── Backfill helper ────────────────────────────────────────────────────────────
function normalizeSubject(s: Subject): Subject {
  return {
    ...s,
    lectures: (s.lectures || []).map((l) => ({ ...l, type: l.type ?? 'theoretical' })),
    exams: (s.exams || []).map((e) => ({ ...e, type: e.type ?? 'theoretical' })),
  };
}

// ── Score bands for the Flashcards Reader cover badge ──────────────────────────
export interface ScoreBand {
  label: string;
  color: string;
}

export function getScoreBand(percentage: number): ScoreBand {
  if (percentage >= 100) return { label: 'Excellent', color: '#a855f7' };
  if (percentage >= 90) return { label: 'Very Good', color: '#22c55e' };
  if (percentage >= 80) return { label: 'Good', color: '#3b82f6' };
  if (percentage >= 70) return { label: 'Okay', color: '#f97316' };
  return { label: 'Bad', color: '#eab308' };
}

// ── Repeat date helper ────────────────────────────────────────────────────────
function getNextDueDate(currentDate: string, repeat: RepeatInterval, repeatWeekDays?: number[]): string {
  const date = parseISO(currentDate);
  if (repeat === 'weekly' && repeatWeekDays && repeatWeekDays.length > 0) {
    // Find next date (day after currentDate) that falls on one of repeatWeekDays
    let next = addDays(date, 1);
    for (let i = 0; i < 7; i++) {
      if (repeatWeekDays.includes(next.getDay())) {
        return format(next, 'yyyy-MM-dd');
      }
      next = addDays(next, 1);
    }
    return format(addDays(date, 7), 'yyyy-MM-dd');
  }
  const next =
    repeat === 'daily'   ? addDays(date, 1)   :
    repeat === 'weekly'  ? addWeeks(date, 1)  :
    /* monthly */          addDays(date, 30);
  return format(next, 'yyyy-MM-dd');
}

// ── Context type ──────────────────────────────────────────────────────────────

interface StudyDataContextType {
  subjects: Subject[];
  schedule: ScheduleEvent[];
  checklist: ChecklistItem[];
  settings: Settings;
  isLoaded: boolean;

  addSubject: (s: Omit<Subject, 'id' | 'lectures' | 'exams' | 'wallpaper' | 'attachments'>) => void;
  updateSubject: (id: string, s: Partial<Subject>) => void;
  deleteSubject: (id: string) => void;
  addAttachment: (subjectId: string, a: Omit<Attachment, 'id'>) => void;
  updateAttachment: (subjectId: string, attachmentId: string, data: Partial<Attachment>) => void;
  deleteAttachment: (subjectId: string, attachmentId: string) => void;

  addLecture: (subjectId: string, l: Omit<Lecture, 'id'>) => void;
  updateLecture: (subjectId: string, lectureId: string, l: Partial<Lecture>) => void;
  deleteLecture: (subjectId: string, id: string) => void;

  addExam: (subjectId: string, e: Omit<Exam, 'id'>) => void;
  updateExam: (subjectId: string, id: string, e: Partial<Exam>) => void;
  deleteExam: (subjectId: string, id: string) => void;
  submitExamAttempt: (subjectId: string, examId: string, answers: number[]) => ExamScore;

  addFlashcard: (subjectId: string, lectureId: string, f: Omit<Flashcard, 'id'>) => Flashcard;
  updateFlashcard: (subjectId: string, lectureId: string, flashcardId: string, f: Partial<Flashcard>) => void;
  deleteFlashcard: (subjectId: string, lectureId: string, flashcardId: string) => void;
  recordReaderSession: (subjectId: string, lectureId: string, percentage: number) => void;

  addScheduleEvent: (e: Omit<ScheduleEvent, 'id'>, createChecklist?: boolean) => void;
  updateScheduleEvent: (id: string, e: Partial<ScheduleEvent>) => void;
  deleteScheduleEvent: (id: string) => void;

  addChecklistItem: (i: Omit<ChecklistItem, 'id'>) => void;
  updateChecklistItem: (id: string, i: Partial<ChecklistItem>) => void;
  toggleChecklistItem: (id: string) => void;
  deleteChecklistItem: (id: string) => void;
  skipChecklistItem: (id: string) => void;
  setCascadeChecklistStatus: (id: string, done: boolean, didNotDo: boolean) => void;
  reorderChecklistItems: (orderedIds: string[]) => void;

  addSubTask: (itemId: string, subTask: Omit<SubTask, 'id'>) => void;
  updateSubTask: (itemId: string, subTaskId: string, data: Partial<SubTask>) => void;
  toggleSubTask: (itemId: string, subTaskId: string) => void;
  deleteSubTask: (itemId: string, subTaskId: string) => void;

  updateSettings: (s: Partial<Settings>) => void;
  resetData: () => void;
  importData: (data: any) => void;

  schedulePlans: SchedulePlan[];
  addSchedulePlan: (plan: Omit<SchedulePlan, 'id' | 'createdAt'>) => void;
  updateSchedulePlan: (id: string, plan: Partial<SchedulePlan>) => void;
  deleteSchedulePlan: (id: string) => void;

  archive: ArchiveEntry[];
  isArchiveLoaded: boolean;
  refreshArchive: () => void;
  restoreArchiveItem: (id: string) => void;
  permanentlyDeleteArchiveItem: (id: string) => void;
}

const defaultSettings: Settings = { theme: 'light', accentColor: 'blue' };
const StudyDataContext = createContext<StudyDataContextType | null>(null);

export const ACCENT_COLORS: Record<AccentColor, string> = {
  blue:   '211 100% 50%',
  green:  '135 59% 49%',
  orange: '35 100% 50%',
  red:    '356 100% 59%',
  purple: '280 67% 60%',
  teal:   '199 94% 67%',
};

export const ACCENT_HEX: Record<AccentColor, string> = {
  blue:   '#007aff',
  green:  '#34c759',
  orange: '#ff9500',
  red:    '#ff3b30',
  purple: '#af52de',
  teal:   '#5ac8fa',
};

export const SUBJECT_WALLPAPERS: string[] = [
  'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
  'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
  'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
  'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
  'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)',
  'linear-gradient(135deg, #fccb90 0%, #d57eeb 100%)',
  'linear-gradient(135deg, #30cfd0 0%, #330867 100%)',
];

// ── Provider ──────────────────────────────────────────────────────────────────

export function StudyDataProvider({ children }: { children: ReactNode }) {
  const [subjects,         setSubjects]         = useState<Subject[]>([]);
  const [schedule,         setSchedule]         = useState<ScheduleEvent[]>([]);
  const [checklist,        setChecklist]        = useState<ChecklistItem[]>([]);
  const [settings,         setSettings]         = useState<Settings>(defaultSettings);
  const [isLoaded,         setIsLoaded]         = useState(false);
  const [archive,          setArchive]          = useState<ArchiveEntry[]>([]);
  const [isArchiveLoaded,  setIsArchiveLoaded]  = useState(false);
  const [schedulePlans,    setSchedulePlans]    = useState<SchedulePlan[]>([]);

  // Load from API on mount
  useEffect(() => {
    api.getData()
      .then((data) => {
        if (data.subjects)  setSubjects(data.subjects.map(normalizeSubject));
        if (data.schedule)  setSchedule(data.schedule);
        if (data.checklist) setChecklist(data.checklist);
        if (data.settings)  setSettings(data.settings);
      })
      .catch((err) => console.error('Failed to load study data from API:', err))
      .finally(() => setIsLoaded(true));
    api.getSchedulePlans().then(setSchedulePlans).catch(console.error);
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
        if (category === 'subject')   setSubjects((prev) => [...prev, item]);
        if (category === 'schedule')  setSchedule((prev) => [...prev, item]);
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
    document.documentElement.style.setProperty('--primary', ACCENT_COLORS[settings.accentColor]);
  }, [settings.accentColor]);

  // ─── Repeat rollover ─────────────────────────────────────────────────────────
  const rolloverRepeats = useCallback(() => {
    setChecklist((prev) => {
      const now = new Date();
      let changed = false;

      const next = prev.map((item) => {
        if (!item.repeat || item.repeat === 'none') return item;
        if (!item.done && !item.didNotDo) return item;
        if (!item.dueDate) return item;

        const nextDueDate = getNextDueDate(item.dueDate, item.repeat, item.repeatWeekDays);
        const nextDueAt   = parseISO(`${nextDueDate}T${item.dueTime || '00:00'}`);
        if (now < nextDueAt) return item;

        changed = true;
        const resetSubTasks = item.subTasks?.map((st) => ({
          ...st, done: false, didNotDo: false, doneAt: undefined,
        }));
        const updated: ChecklistItem = {
          ...item,
          dueDate: nextDueDate,
          done: false,
          didNotDo: false,
          doneAt: undefined,
          subTasks: resetSubTasks ?? item.subTasks,
        };
        api.updateChecklistItem(item.id, {
          dueDate: nextDueDate, done: false, didNotDo: false, doneAt: undefined,
          subTasks: updated.subTasks,
        }).catch(console.error);
        return updated;
      });

      return changed ? next : prev;
    });
  }, []);

  useEffect(() => {
    if (!isLoaded) return;
    rolloverRepeats();
    const id = setInterval(rolloverRepeats, 60_000);
    return () => clearInterval(id);
  }, [isLoaded, rolloverRepeats]);

  // ─── Auto-check passed exams ─────────────────────────────────────────────────
  const checkPassedExams = useCallback(() => {
    const now = new Date();
    setSchedulePlans((prev) => {
      let changed = false;
      const next = prev.map((plan) => {
        if (plan.type !== 'exam') return plan;
        let planChanged = false;
        const newItems = plan.items.map((item) => {
          if (item.checked) return item;
          if (!item.date) return item;
          const examTime = item.time || '09:00';
          const examAt = parseISO(`${item.date}T${examTime}`);
          if (now >= examAt) {
            planChanged = true;
            return { ...item, checked: true };
          }
          return item;
        });
        if (!planChanged) return plan;
        changed = true;
        const updatedPlan = { ...plan, items: newItems };
        api.updateSchedulePlan(plan.id, updatedPlan).catch(console.error);
        return updatedPlan;
      });
      return changed ? next : prev;
    });
  }, []);

  useEffect(() => {
    if (!isLoaded) return;
    checkPassedExams();
    const id = setInterval(checkPassedExams, 60_000);
    return () => clearInterval(id);
  }, [isLoaded, checkPassedExams]);

  // ─── Subjects ──────────────────────────────────────────────────────────────
  const addSubject = useCallback((s: Omit<Subject, 'id' | 'lectures' | 'exams' | 'wallpaper' | 'attachments'>) => {
    const colors        = Object.values(ACCENT_HEX);
    const autoColor     = s.color ?? colors[Math.floor(Math.random() * colors.length)];
    const autoWallpaper = SUBJECT_WALLPAPERS[Math.floor(Math.random() * SUBJECT_WALLPAPERS.length)];
    const autoEmoji     = s.emoji ?? DEFAULT_SUBJECT_EMOJIS[Math.floor(Math.random() * DEFAULT_SUBJECT_EMOJIS.length)];
    const newSubject: Subject = { ...s, id: crypto.randomUUID(), color: autoColor, wallpaper: autoWallpaper, attachments: [], lectures: [], exams: [], emoji: autoEmoji };
    setSubjects((prev) => [...prev, newSubject]);
    api.createSubject(newSubject).catch(console.error);
  }, []);

  const updateSubject = useCallback((id: string, s: Partial<Subject>) => {
    setSubjects((prev) => prev.map((sub) => (sub.id === id ? { ...sub, ...s } : sub)));
    api.updateSubject(id, s).catch(console.error);
  }, []);

  const deleteSubject = useCallback((id: string) => {
    setSubjects((prev) => prev.filter((s) => s.id !== id));
    setSchedule((prev) => prev.filter((e) => e.subjectId !== id));
    setChecklist((prev) => prev.filter((c) => c.subjectId !== id));
    api.deleteSubject(id).catch(console.error);
  }, []);

  // ─── Attachments ───────────────────────────────────────────────────────────
  const addAttachment = useCallback((subjectId: string, a: Omit<Attachment, 'id'>) => {
    const newAttachment: Attachment = { ...a, id: crypto.randomUUID() };
    setSubjects((prev) => {
      const updated = prev.map((s) =>
        s.id === subjectId ? { ...s, attachments: [...(s.attachments || []), newAttachment] } : s
      );
      const subject = updated.find((s) => s.id === subjectId);
      if (subject) api.updateSubject(subjectId, { attachments: subject.attachments }).catch(console.error);
      return updated;
    });
  }, []);

  const updateAttachment = useCallback((subjectId: string, attachmentId: string, data: Partial<Attachment>) => {
    setSubjects((prev) => {
      const updated = prev.map((s) =>
        s.id === subjectId
          ? { ...s, attachments: (s.attachments || []).map((a) => a.id === attachmentId ? { ...a, ...data } : a) }
          : s
      );
      const subject = updated.find((s) => s.id === subjectId);
      if (subject) api.updateSubject(subjectId, { attachments: subject.attachments }).catch(console.error);
      return updated;
    });
  }, []);

  const deleteAttachment = useCallback((subjectId: string, attachmentId: string) => {
    setSubjects((prev) => {
      const updated = prev.map((s) =>
        s.id === subjectId ? { ...s, attachments: (s.attachments || []).filter((a) => a.id !== attachmentId) } : s
      );
      const subject = updated.find((s) => s.id === subjectId);
      if (subject) api.updateSubject(subjectId, { attachments: subject.attachments }).catch(console.error);
      return updated;
    });
  }, []);

  // ─── Lectures ──────────────────────────────────────────────────────────────
  const addLecture = useCallback((subjectId: string, l: Omit<Lecture, 'id'>) => {
    const newLecture: Lecture = { ...l, id: crypto.randomUUID() };
    setSubjects((prev) => prev.map((s) => s.id === subjectId ? { ...s, lectures: [...s.lectures, newLecture] } : s));
    api.createLecture(subjectId, newLecture).catch(console.error);
  }, []);

  const updateLecture = useCallback((subjectId: string, lectureId: string, l: Partial<Lecture>) => {
    setSubjects((prev) =>
      prev.map((s) =>
        s.id === subjectId
          ? { ...s, lectures: s.lectures.map((lec) => lec.id === lectureId ? { ...lec, ...l } : lec) }
          : s
      )
    );
    api.updateLecture(subjectId, lectureId, l).catch(console.error);
  }, []);

  const deleteLecture = useCallback((subjectId: string, id: string) => {
    setSubjects((prev) =>
      prev.map((s) => s.id === subjectId ? { ...s, lectures: s.lectures.filter((l) => l.id !== id) } : s)
    );
    api.deleteLecture(subjectId, id).catch(console.error);
  }, []);

  // ─── Exams ─────────────────────────────────────────────────────────────────
  const addExam = useCallback((subjectId: string, e: Omit<Exam, 'id'>) => {
    const newExam: Exam = { ...e, id: crypto.randomUUID() };
    setSubjects((prev) => prev.map((s) => s.id === subjectId ? { ...s, exams: [...s.exams, newExam] } : s));
    api.createExam(subjectId, newExam).catch(console.error);
  }, []);

  const updateExam = useCallback((subjectId: string, id: string, e: Partial<Exam>) => {
    setSubjects((prev) =>
      prev.map((s) =>
        s.id === subjectId ? { ...s, exams: s.exams.map((ex) => ex.id === id ? { ...ex, ...e } : ex) } : s
      )
    );
    api.updateExam(subjectId, id, e).catch(console.error);
  }, []);

  const deleteExam = useCallback((subjectId: string, id: string) => {
    setSubjects((prev) =>
      prev.map((s) => s.id === subjectId ? { ...s, exams: s.exams.filter((e) => e.id !== id) } : s)
    );
    api.deleteExam(subjectId, id).catch(console.error);
  }, []);

  const submitExamAttempt = useCallback((subjectId: string, examId: string, answers: number[]): ExamScore => {
    let score: ExamScore = { correct: 0, total: 0, percentage: 0, takenAt: new Date().toISOString() };

    setSubjects((prev) => {
      const updated = prev.map((s) => {
        if (s.id !== subjectId) return s;
        const exam = s.exams.find((e) => e.id === examId);
        if (!exam) return s;

        const questions = exam.questions || [];
        const correct = questions.reduce(
          (acc, q, i) => acc + (answers[i] === q.correctAnswer ? 1 : 0),
          0
        );
        const total = questions.length;
        const percentage = total > 0 ? Math.round((correct / total) * 1000) / 10 : 0;
        const checked = percentage >= 70;
        score = { correct, total, percentage, takenAt: new Date().toISOString() };

        const linkedIds = new Set(exam.linkedLectureIds || []);
        const newLectures = checked
          ? s.lectures.map((l) => (linkedIds.has(l.id) ? { ...l, checked: true } : l))
          : s.lectures;

        const newExams = s.exams.map((e) =>
          e.id === examId ? { ...e, checked, lastScore: score, grade: String(percentage) } : e
        );

        return { ...s, exams: newExams, lectures: newLectures };
      });

      const subject = updated.find((s) => s.id === subjectId);
      if (subject) {
        const exam = subject.exams.find((e) => e.id === examId);
        if (exam) {
          api.updateExam(subjectId, examId, { checked: exam.checked, lastScore: exam.lastScore, grade: exam.grade }).catch(console.error);
          if (exam.checked) {
            for (const l of subject.lectures) {
              if ((exam.linkedLectureIds || []).includes(l.id) && l.checked) {
                api.updateLecture(subjectId, l.id, { checked: true }).catch(console.error);
              }
            }
          }
        }
      }
      return updated;
    });

    return score;
  }, []);

  // ─── Flashcards (nested in lecture) ────────────────────────────────────────
  const addFlashcard = useCallback((subjectId: string, lectureId: string, f: Omit<Flashcard, 'id'>): Flashcard => {
    const newCard: Flashcard = { ...f, id: crypto.randomUUID() };
    setSubjects((prev) => {
      const updated = prev.map((s) =>
        s.id === subjectId
          ? { ...s, lectures: s.lectures.map((l) => l.id === lectureId ? { ...l, flashcards: [...(l.flashcards || []), newCard] } : l) }
          : s
      );
      const lecture = updated.find((s) => s.id === subjectId)?.lectures.find((l) => l.id === lectureId);
      if (lecture) api.updateLecture(subjectId, lectureId, { flashcards: lecture.flashcards }).catch(console.error);
      return updated;
    });
    return newCard;
  }, []);

  const updateFlashcard = useCallback((subjectId: string, lectureId: string, flashcardId: string, f: Partial<Flashcard>) => {
    setSubjects((prev) => {
      const updated = prev.map((s) =>
        s.id === subjectId
          ? {
              ...s,
              lectures: s.lectures.map((l) =>
                l.id === lectureId
                  ? { ...l, flashcards: (l.flashcards || []).map((c) => c.id === flashcardId ? { ...c, ...f } : c) }
                  : l
              ),
            }
          : s
      );
      const lecture = updated.find((s) => s.id === subjectId)?.lectures.find((l) => l.id === lectureId);
      if (lecture) api.updateLecture(subjectId, lectureId, { flashcards: lecture.flashcards }).catch(console.error);
      return updated;
    });
  }, []);

  const deleteFlashcard = useCallback((subjectId: string, lectureId: string, flashcardId: string) => {
    setSubjects((prev) => {
      const updated = prev.map((s) =>
        s.id === subjectId
          ? {
              ...s,
              lectures: s.lectures.map((l) =>
                l.id === lectureId ? { ...l, flashcards: (l.flashcards || []).filter((c) => c.id !== flashcardId) } : l
              ),
            }
          : s
      );
      const lecture = updated.find((s) => s.id === subjectId)?.lectures.find((l) => l.id === lectureId);
      if (lecture) api.updateLecture(subjectId, lectureId, { flashcards: lecture.flashcards }).catch(console.error);
      return updated;
    });
  }, []);

  const recordReaderSession = useCallback((subjectId: string, lectureId: string, percentage: number) => {
    setSubjects((prev) =>
      prev.map((s) =>
        s.id === subjectId
          ? { ...s, lectures: s.lectures.map((l) => l.id === lectureId ? { ...l, readerLastPercentage: percentage } : l) }
          : s
      )
    );
    api.updateLecture(subjectId, lectureId, { readerLastPercentage: percentage }).catch(console.error);
  }, []);

  // ─── Schedule ──────────────────────────────────────────────────────────────
  const addScheduleEvent = useCallback((e: Omit<ScheduleEvent, 'id'>, createChecklistTask?: boolean) => {
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
  }, []);

  const updateScheduleEvent = useCallback((id: string, e: Partial<ScheduleEvent>) => {
    setSchedule((prev) => prev.map((ev) => (ev.id === id ? { ...ev, ...e } : ev)));
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
    setChecklist((prev) => prev.map((item) => (item.id === id ? { ...item, ...i } : item)));
    api.updateChecklistItem(id, i).catch(console.error);
  }, []);

  const toggleChecklistItem = useCallback((id: string) => {
    setChecklist((prev) => {
      const item = prev.find((i) => i.id === id);
      if (!item) return prev;

      const done    = !item.done;
      const updated: ChecklistItem = { ...item, done, doneAt: done ? new Date().toISOString() : undefined };
      api.updateChecklistItem(id, { done, doneAt: updated.doneAt }).catch(console.error);

      if (item.linkedScheduleId) {
        setSchedule((prevSched) =>
          prevSched.map((ev) => ev.id === item.linkedScheduleId ? { ...ev, done } : ev)
        );
        api.updateScheduleEvent(item.linkedScheduleId, { done }).catch(console.error);
      }

      const next = prev.map((i) => (i.id === id ? updated : i));
      return next;
    });
  }, []);

  const deleteChecklistItem = useCallback((id: string) => {
    setChecklist((prev) => prev.filter((item) => item.id !== id));
    api.deleteChecklistItem(id).catch(console.error);
  }, []);

  const skipChecklistItem = useCallback((id: string) => {
    setChecklist((prev) => {
      const item = prev.find((i) => i.id === id);
      if (!item) return prev;
      if (item.repeat && item.repeat !== 'none') {
        const updated: ChecklistItem = { ...item, didNotDo: true, doneAt: new Date().toISOString() };
        api.updateChecklistItem(id, { didNotDo: true, doneAt: updated.doneAt }).catch(console.error);
        return prev.map((i) => (i.id === id ? updated : i));
      }
      api.deleteChecklistItem(id).catch(console.error);
      return prev.filter((i) => i.id !== id);
    });
  }, []);

  const setCascadeChecklistStatus = useCallback((id: string, done: boolean, didNotDo: boolean) => {
    setChecklist((prev) => {
      const item = prev.find((i) => i.id === id);
      if (!item) return prev;
      const doneAt = (done || didNotDo) ? new Date().toISOString() : undefined;
      const resetSubTasks = item.subTasks?.map((st) => ({ ...st, done, didNotDo, doneAt }));
      const updated: ChecklistItem = { ...item, done, didNotDo, doneAt, subTasks: resetSubTasks ?? item.subTasks };
      api.updateChecklistItem(id, { done, didNotDo, doneAt, subTasks: updated.subTasks }).catch(console.error);
      return prev.map((i) => (i.id === id ? updated : i));
    });
  }, []);

  const reorderChecklistItems = useCallback((orderedIds: string[]) => {
    setChecklist((prev) => {
      const next = prev.map((item) => {
        const idx = orderedIds.indexOf(item.id);
        if (idx === -1) return item;
        return { ...item, sortOrder: idx };
      });
      // Persist each changed item
      next.forEach((item) => {
        const old = prev.find((i) => i.id === item.id);
        if (old && old.sortOrder !== item.sortOrder) {
          api.updateChecklistItem(item.id, { sortOrder: item.sortOrder }).catch(console.error);
        }
      });
      return next;
    });
  }, []);

  // ─── SubTasks ──────────────────────────────────────────────────────────────
  const addSubTask = useCallback((itemId: string, subTask: Omit<SubTask, 'id'>) => {
    const newSubTask: SubTask = { ...subTask, id: crypto.randomUUID() };
    setChecklist((prev) => {
      const updated = prev.map((item) =>
        item.id === itemId
          ? { ...item, subTasks: [...(item.subTasks || []), newSubTask] }
          : item
      );
      const found = updated.find((i) => i.id === itemId);
      if (found) api.updateChecklistItem(itemId, { subTasks: found.subTasks }).catch(console.error);
      return updated;
    });
  }, []);

  const updateSubTask = useCallback((itemId: string, subTaskId: string, data: Partial<SubTask>) => {
    setChecklist((prev) => {
      const updated = prev.map((item) =>
        item.id === itemId
          ? { ...item, subTasks: (item.subTasks || []).map((st) => st.id === subTaskId ? { ...st, ...data } : st) }
          : item
      );
      const found = updated.find((i) => i.id === itemId);
      if (found) api.updateChecklistItem(itemId, { subTasks: found.subTasks }).catch(console.error);
      return updated;
    });
  }, []);

  const toggleSubTask = useCallback((itemId: string, subTaskId: string) => {
    setChecklist((prev) => {
      const updated = prev.map((item) => {
        if (item.id !== itemId) return item;
        const subTasks = (item.subTasks || []).map((st) =>
          st.id === subTaskId ? { ...st, done: !st.done, doneAt: !st.done ? new Date().toISOString() : undefined } : st
        );
        return { ...item, subTasks };
      });
      const found = updated.find((i) => i.id === itemId);
      if (found) api.updateChecklistItem(itemId, { subTasks: found.subTasks }).catch(console.error);
      return updated;
    });
  }, []);

  const deleteSubTask = useCallback((itemId: string, subTaskId: string) => {
    setChecklist((prev) => {
      const updated = prev.map((item) =>
        item.id === itemId
          ? { ...item, subTasks: (item.subTasks || []).filter((st) => st.id !== subTaskId) }
          : item
      );
      const found = updated.find((i) => i.id === itemId);
      if (found) api.updateChecklistItem(itemId, { subTasks: found.subTasks }).catch(console.error);
      return updated;
    });
  }, []);

  // ─── Settings ──────────────────────────────────────────────────────────────
  const updateSettings = useCallback((s: Partial<Settings>) => {
    setSettings((prev) => {
      const updated = { ...prev, ...s };
      api.updateSettings(updated).catch(console.error);
      return updated;
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
    if (data.subjects)  setSubjects((data.subjects || []).map(normalizeSubject));
    if (data.schedule)  setSchedule(data.schedule || []);
    if (data.checklist) setChecklist(data.checklist || []);
    if (data.settings)  setSettings(data.settings);
    api.importData(data).catch(console.error);
  }, []);

  // ─── Schedule Plans ────────────────────────────────────────────────────────
  const addSchedulePlan = useCallback((plan: Omit<SchedulePlan, 'id' | 'createdAt'>) => {
    const newPlan: SchedulePlan = {
      ...plan,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    setSchedulePlans((prev) => [...prev, newPlan]);
    api.createSchedulePlan(newPlan).catch(console.error);
  }, []);

  const updateSchedulePlan = useCallback((id: string, plan: Partial<SchedulePlan>) => {
    setSchedulePlans((prev) => prev.map((p) => (p.id === id ? { ...p, ...plan } : p)));
    api.updateSchedulePlan(id, plan).catch(console.error);
  }, []);

  const deleteSchedulePlan = useCallback((id: string) => {
    setSchedulePlans((prev) => prev.filter((p) => p.id !== id));
    api.deleteSchedulePlan(id).catch(console.error);
  }, []);

  return (
    <StudyDataContext.Provider
      value={{
        subjects, schedule, checklist, settings, isLoaded,
        addSubject, updateSubject, deleteSubject,
        addAttachment, updateAttachment, deleteAttachment,
        addLecture, updateLecture, deleteLecture,
        addExam, updateExam, deleteExam, submitExamAttempt,
        addFlashcard, updateFlashcard, deleteFlashcard, recordReaderSession,
        addScheduleEvent, updateScheduleEvent, deleteScheduleEvent,
        addChecklistItem, updateChecklistItem, toggleChecklistItem,
        deleteChecklistItem, skipChecklistItem, setCascadeChecklistStatus, reorderChecklistItems,
        addSubTask, updateSubTask, toggleSubTask, deleteSubTask,
        updateSettings, resetData, importData,
        schedulePlans, addSchedulePlan, updateSchedulePlan, deleteSchedulePlan,
        archive, isArchiveLoaded, refreshArchive, restoreArchiveItem, permanentlyDeleteArchiveItem,
      }}
    >
      {children}
    </StudyDataContext.Provider>
  );
}

export function useStudyData() {
  const ctx = useContext(StudyDataContext);
  if (!ctx) throw new Error('useStudyData must be used inside StudyDataProvider');
  return ctx;
}
