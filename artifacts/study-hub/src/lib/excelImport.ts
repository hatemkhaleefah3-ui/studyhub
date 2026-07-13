import * as XLSX from 'xlsx';
import type { ExamQuestion, QuestionType } from '@/hooks/useStudyData';

/**
 * Parses the exam-questions Excel file described in the feature spec
 * (section 1.6). Fixed columns, one header row, one question per row:
 *   1 Question type ("MCQ" | "Medical Case MCQ")
 *   2 Question text
 *   3-6 Choice 1-4
 *   7 Correct answer (1-4)
 *   8 Labs (Medical Case MCQ only)
 *   9 Histo discovery (Medical Case MCQ only)
 *
 * Plain deterministic spreadsheet parsing — no AI/LLM involved.
 */
export async function parseExamExcel(file: File): Promise<ExamQuestion[]> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, blankrows: false });

  const dataRows = rows.slice(1); // skip header row
  const questions: ExamQuestion[] = [];

  for (const row of dataRows) {
    if (!row || row.length === 0) continue;
    const [rawType, text, c1, c2, c3, c4, rawCorrect, labs, histo] = row;
    if (!text) continue;

    const questionType: QuestionType =
      String(rawType || '').trim().toLowerCase() === 'medical case mcq' ? 'Medical Case MCQ' : 'MCQ';

    const correctAnswer = Math.min(4, Math.max(1, parseInt(String(rawCorrect), 10) || 1));

    questions.push({
      id: crypto.randomUUID(),
      questionType,
      text: String(text).trim(),
      choices: [String(c1 ?? ''), String(c2 ?? ''), String(c3 ?? ''), String(c4 ?? '')],
      correctAnswer,
      labs: questionType === 'Medical Case MCQ' ? String(labs ?? '').trim() || undefined : undefined,
      histo: questionType === 'Medical Case MCQ' ? String(histo ?? '').trim() || undefined : undefined,
    });
  }

  return questions;
}
