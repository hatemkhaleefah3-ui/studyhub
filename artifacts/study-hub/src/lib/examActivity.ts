export type ExamActivityKind = "final" | "lecture-flashcards" | "lecture-mcqs";

export interface ExamActivityEntry {
  id: string;
  kind: ExamActivityKind;
  subjectId: string;
  sourceId: string;
  percentage: number;
  takenAt: string;
}

const STORAGE_KEY = "studyhub:exam-activity:v1";

export function readExamActivity(): ExamActivityEntry[] {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

export function recordExamActivity(entry: Omit<ExamActivityEntry, "id" | "takenAt"> & { takenAt?: string }) {
  const next: ExamActivityEntry = {
    ...entry,
    id: crypto.randomUUID(),
    takenAt: entry.takenAt ?? new Date().toISOString(),
  };
  const history = [...readExamActivity(), next].slice(-2000);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  window.dispatchEvent(new CustomEvent("studyhub:exam-activity"));
}

export function qualifyingActivityByDay(minimum = 90) {
  const counts = new Map<string, number>();
  for (const entry of readExamActivity()) {
    if (entry.percentage < minimum) continue;
    const day = new Date(entry.takenAt).toLocaleDateString("en-CA");
    counts.set(day, (counts.get(day) ?? 0) + 1);
  }
  return counts;
}
