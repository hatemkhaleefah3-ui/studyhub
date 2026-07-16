import * as XLSX from 'xlsx';
import type { ExamQuestion, QuestionType } from '@/hooks/useStudyData';

// ── Lecture bulk-import ────────────────────────────────────────────────────────

export interface NameImportResult {
  names: string[];
  skipped: number;
}

/**
 * Parses a single-column "Name" Excel or CSV file for bulk import.
 * Column A header: "Name" (optional — detected and skipped if present).
 * Blank rows are counted as skipped.
 */
export async function parseNameListExcel(file: File): Promise<NameImportResult> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, blankrows: false });

  if (rows.length === 0) return { names: [], skipped: 0 };

  // Detect header row: skip if first cell looks like "name"
  const firstRow = rows[0];
  const hasHeader =
    firstRow &&
    typeof firstRow[0] === 'string' &&
    firstRow[0].trim().toLowerCase() === 'name';

  const dataRows = hasHeader ? rows.slice(1) : rows;
  const names: string[] = [];
  let skipped = 0;

  for (const row of dataRows) {
    if (!row || row.length === 0) continue;
    const name = String(row[0] ?? '').trim();
    if (!name) { skipped++; continue; }
    names.push(name);
  }

  return { names, skipped };
}

// Kept as an alias for callers that think in terms of "Lectures" / "Exams" —
// both bulk-import a single "Name" column.
export const parseLectureExcel = parseNameListExcel;
export const parseExamNameListExcel = parseNameListExcel;

// ── Flashcards bulk-import ──────────────────────────────────────────────────────

export interface FlashcardImportRow {
  front: string;
  back: string;
}

export interface FlashcardImportResult {
  rows: FlashcardImportRow[];
  skipped: number;
}

/**
 * Parses a "Front face" / "Back face" Excel or CSV file for bulk flashcard import.
 * Column A: front face, Column B: back face. Rows missing either value are skipped.
 */
export async function parseFlashcardExcel(file: File): Promise<FlashcardImportResult> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, blankrows: false });

  if (rows.length === 0) return { rows: [], skipped: 0 };

  const firstRow = rows[0];
  const hasHeader =
    firstRow &&
    typeof firstRow[0] === 'string' &&
    firstRow[0].trim().toLowerCase() === 'front face';

  const dataRows = hasHeader ? rows.slice(1) : rows;
  const result: FlashcardImportRow[] = [];
  let skipped = 0;

  for (const row of dataRows) {
    if (!row || row.length === 0) continue;
    const front = String(row[0] ?? '').trim();
    const back = String(row[1] ?? '').trim();
    if (!front || !back) { skipped++; continue; }
    result.push({ front, back });
  }

  return { rows: result, skipped };
}

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
