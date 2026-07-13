// API client — calls the Express server (local Replit dev)
// The same routes are mirrored in /functions for Cloudflare Pages production.

const BASE = '/api/study';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`API error ${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  // ─── Data ─────────────────────────────────────────────────────────────────
  getData: () => request<{ subjects: any[]; schedule: any[]; checklist: any[]; settings: any }>('/data'),

  // ─── Settings ─────────────────────────────────────────────────────────────
  updateSettings: (settings: object) =>
    request('/settings', { method: 'PUT', body: JSON.stringify(settings) }),

  // ─── Subjects ─────────────────────────────────────────────────────────────
  createSubject: (subject: object) =>
    request('/subjects', { method: 'POST', body: JSON.stringify(subject) }),
  updateSubject: (id: string, data: object) =>
    request(`/subjects/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteSubject: (id: string) =>
    request(`/subjects/${id}`, { method: 'DELETE' }),

  // ─── Lectures ─────────────────────────────────────────────────────────────
  createLecture: (subjectId: string, lecture: object) =>
    request(`/subjects/${subjectId}/lectures`, { method: 'POST', body: JSON.stringify(lecture) }),
  updateLecture: (subjectId: string, lectureId: string, data: object) =>
    request(`/subjects/${subjectId}/lectures/${lectureId}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteLecture: (subjectId: string, lectureId: string) =>
    request(`/subjects/${subjectId}/lectures/${lectureId}`, { method: 'DELETE' }),

  // ─── Exams ────────────────────────────────────────────────────────────────
  createExam: (subjectId: string, exam: object) =>
    request(`/subjects/${subjectId}/exams`, { method: 'POST', body: JSON.stringify(exam) }),
  updateExam: (subjectId: string, examId: string, data: object) =>
    request(`/subjects/${subjectId}/exams/${examId}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteExam: (subjectId: string, examId: string) =>
    request(`/subjects/${subjectId}/exams/${examId}`, { method: 'DELETE' }),

  // ─── Schedule ─────────────────────────────────────────────────────────────
  createScheduleEvent: (event: object, createChecklist?: boolean) =>
    request(`/schedule${createChecklist ? '?createChecklist=1' : ''}`, {
      method: 'POST',
      body: JSON.stringify(event),
    }),
  updateScheduleEvent: (id: string, data: object) =>
    request(`/schedule/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteScheduleEvent: (id: string) =>
    request(`/schedule/${id}`, { method: 'DELETE' }),

  // ─── Checklist ────────────────────────────────────────────────────────────
  createChecklistItem: (item: object) =>
    request('/checklist', { method: 'POST', body: JSON.stringify(item) }),
  updateChecklistItem: (id: string, data: object) =>
    request(`/checklist/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteChecklistItem: (id: string) =>
    request(`/checklist/${id}`, { method: 'DELETE' }),

  // ─── SubTasks ─────────────────────────────────────────────────────────────
  createSubTask: (itemId: string, text: string) =>
    request(`/checklist/${itemId}/subtasks`, { method: 'POST', body: JSON.stringify({ text }) }),
  updateSubTask: (itemId: string, subTaskId: string, data: object) =>
    request(`/checklist/${itemId}/subtasks/${subTaskId}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteSubTask: (itemId: string, subTaskId: string) =>
    request(`/checklist/${itemId}/subtasks/${subTaskId}`, { method: 'DELETE' }),

  // ─── Export / Import ──────────────────────────────────────────────────────
  exportData: () =>
    request<{ subjects: any[]; schedule: any[]; checklist: any[]; settings: any }>('/export'),
  importData: (data: object) =>
    request('/import', { method: 'POST', body: JSON.stringify(data) }),

  // ─── Reset ────────────────────────────────────────────────────────────────
  resetData: () => request('/reset', { method: 'DELETE' }),

  // ─── Schedule Plans ───────────────────────────────────────────────────────
  getSchedulePlans: () =>
    request<any[]>('/schedule-plans'),
  createSchedulePlan: (plan: object) =>
    request('/schedule-plans', { method: 'POST', body: JSON.stringify(plan) }),
  updateSchedulePlan: (id: string, data: object) =>
    request(`/schedule-plans/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteSchedulePlan: (id: string) =>
    request(`/schedule-plans/${id}`, { method: 'DELETE' }),

  // ─── Archive ──────────────────────────────────────────────────────────────
  getArchive: () =>
    request<ArchiveEntry[]>('/archive'),
  restoreArchiveItem: (id: string) =>
    request<{ ok: true; category: ArchiveCategory; item: any }>(`/archive/${id}/restore`, { method: 'POST' }),
  permanentlyDeleteArchiveItem: (id: string) =>
    request(`/archive/${id}`, { method: 'DELETE' }),
};

export type ArchiveCategory = 'subject' | 'schedule' | 'checklist';

export interface ArchiveEntry {
  id: string;
  category: ArchiveCategory;
  originalId: string;
  deletedAt: string;
  data: any;
}
