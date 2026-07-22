import { useEffect, useState } from 'react';
import { Upload } from 'lucide-react';
import { BottomSheet } from '@/components/shared/BottomSheet';

export function FinalExamImportSheet() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const show = () => setOpen(true);
    window.addEventListener('studyhub:final-exam-import-sheet', show);
    return () => window.removeEventListener('studyhub:final-exam-import-sheet', show);
  }, []);

  const openPicker = () => {
    const inputs = Array.from(document.querySelectorAll<HTMLInputElement>('input[type="file"][multiple][accept*=".xlsx"]'));
    const finalExamInput = inputs.find(input => input.accept.includes('.xls'));
    if (!finalExamInput) return;
    setOpen(false);
    window.setTimeout(() => finalExamInput.click(), 120);
  };

  return (
    <BottomSheet isOpen={open} onClose={() => setOpen(false)} title="Add Questions">
      <div className="space-y-3">
        <p className="text-sm leading-6 text-muted-foreground">
          Import one or more MCQ, Medical Case MCQ, or Flashcards Excel files into this Final Exam.
        </p>
        <button
          type="button"
          onClick={openPicker}
          className="flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-primary px-4 font-semibold text-primary-foreground shadow-sm transition-all duration-200 hover:opacity-90 active:scale-[.98]"
        >
          <Upload className="h-5 w-5" />
          Import files
        </button>
      </div>
    </BottomSheet>
  );
}
