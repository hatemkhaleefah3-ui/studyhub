import { useEffect, useRef } from "react";
import { useStudyData } from "@/hooks/useStudyData";

type DisplayFormat = "Image" | "Link" | "File";

export function AttachmentFormatNormalizer() {
  const { subjects, updateSubject } = useStudyData();
  const subjectsRef = useRef(subjects);
  const selectedRef = useRef<DisplayFormat>("Link");
  const pendingRef = useRef<{ before: Record<string, string>; format: DisplayFormat } | null>(null);
  subjectsRef.current = subjects;

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const button = (event.target as HTMLElement | null)?.closest("button");
      if (!button) return;
      const label = button.textContent?.trim();
      if (label === "Image" || label === "Link" || label === "File") selectedRef.current = label;
      if (label === "Add Attachment" || label === "Save Changes") {
        const before: Record<string, string> = {};
        subjectsRef.current.forEach(subject => (subject.attachments ?? []).forEach(item => { before[item.id] = JSON.stringify(item); }));
        pendingRef.current = { before, format: selectedRef.current };
      }
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  useEffect(() => {
    const pending = pendingRef.current;
    if (!pending) return;
    for (const subject of subjects) {
      const attachments = subject.attachments ?? [];
      const changedIndex = attachments.findIndex(item => !pending.before[item.id] || pending.before[item.id] !== JSON.stringify(item));
      if (changedIndex < 0) continue;
      const next = attachments.map((item, index) => index === changedIndex ? ({ ...item, format: pending.format } as any) : item);
      pendingRef.current = null;
      updateSubject(subject.id, { attachments: next as any });
      return;
    }
  }, [subjects, updateSubject]);

  return null;
}
