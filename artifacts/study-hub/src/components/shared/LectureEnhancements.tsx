import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'wouter';
import { useStudyData, type StudyType } from '@/hooks/useStudyData';
import type { LectureImportRow } from '@/lib/excelImport';

type PendingLectureImport = {
  subjectId: string;
  type: StudyType;
  beforeIds: Set<string>;
  rows: LectureImportRow[];
};

function lectureRoute(location: string) {
  const match = location.match(/^\/subjects\/([^/]+)\/lectures/);
  if (!match) return null;
  const params = new URLSearchParams(window.location.search);
  return {
    subjectId: decodeURIComponent(match[1]),
    type: params.get('type') === 'practical' ? 'practical' as const : 'theoretical' as const,
  };
}

/**
 * Keeps the existing lecture page implementation small while connecting two
 * cross-cutting behaviors:
 * 1. optional Links values parsed from lecture spreadsheets are assigned to
 *    the lectures created by the existing import loop;
 * 2. a completed lecture-card hold opens that lecture's saved link.
 */
export function LectureEnhancements() {
  const [location] = useLocation();
  const { subjects, updateLecture } = useStudyData();
  const pending = useRef<PendingLectureImport | null>(null);
  const [pendingVersion, setPendingVersion] = useState(0);

  useEffect(() => {
    const handleParsedImport = (event: Event) => {
      const route = lectureRoute(location);
      if (!route) return;
      const subject = subjects.find(item => item.id === route.subjectId);
      if (!subject) return;
      const rows = ((event as CustomEvent<{ rows?: LectureImportRow[] }>).detail?.rows ?? [])
        .map(row => ({ name: String(row.name ?? '').trim(), link: String(row.link ?? '').trim() }))
        .filter(row => row.name);
      pending.current = {
        subjectId: route.subjectId,
        type: route.type,
        beforeIds: new Set(subject.lectures.filter(item => item.type === route.type).map(item => item.id)),
        rows,
      };
      setPendingVersion(value => value + 1);
    };

    window.addEventListener('studyhub:lecture-import-parsed', handleParsedImport);
    return () => window.removeEventListener('studyhub:lecture-import-parsed', handleParsedImport);
  }, [location, subjects]);

  useEffect(() => {
    const request = pending.current;
    if (!request) return;
    const subject = subjects.find(item => item.id === request.subjectId);
    if (!subject) return;

    const created = subject.lectures.filter(
      item => item.type === request.type && !request.beforeIds.has(item.id),
    );
    if (created.length < request.rows.length) return;

    const used = new Set<string>();
    request.rows.forEach(row => {
      if (!row.link) return;
      const lecture = created.find(item => !used.has(item.id) && item.name.trim() === row.name);
      if (!lecture) return;
      used.add(lecture.id);
      updateLecture(request.subjectId, lecture.id, { link: row.link });
    });
    pending.current = null;
  }, [subjects, pendingVersion, updateLecture]);

  useEffect(() => {
    const handleOpen = (event: Event) => {
      const route = lectureRoute(location);
      if (!route) return;
      const subject = subjects.find(item => item.id === route.subjectId);
      if (!subject) return;
      const text = String((event as CustomEvent<{ text?: string }>).detail?.text ?? '');
      const lecture = subject.lectures
        .filter(item => item.type === route.type && item.link.trim())
        .sort((a, b) => b.name.length - a.name.length)
        .find(item => text.includes(item.name));
      if (!lecture?.link) return;
      window.open(lecture.link, '_blank', 'noopener,noreferrer');
    };

    window.addEventListener('studyhub:lecture-longpress-open', handleOpen);
    return () => window.removeEventListener('studyhub:lecture-longpress-open', handleOpen);
  }, [location, subjects]);

  return null;
}
