import { useEffect } from "react";
import { useStudyData } from "@/hooks/useStudyData";

export function AttachmentFormatNormalizer() {
  const { subjects, updateSubject } = useStudyData();

  useEffect(() => {
    subjects.forEach(subject => {
      const attachments = subject.attachments ?? [];
      let changed = false;
      const normalized = attachments.map(attachment => {
        const current = attachment as typeof attachment & { format: string };
        if (current.format === "File" && /^https?:\/\//i.test(current.url)) {
          changed = true;
          return { ...current, format: "Link" } as any;
        }
        return current;
      });
      if (changed) updateSubject(subject.id, { attachments: normalized as any });
    });
  }, [subjects, updateSubject]);

  return null;
}
