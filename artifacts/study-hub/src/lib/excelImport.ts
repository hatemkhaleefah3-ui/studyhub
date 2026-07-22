import * as XLSX from 'xlsx';
import type { ExamQuestion, QuestionType } from '@/hooks/useStudyData';

export interface NameImportResult {
  names: string[];
  skipped: number;
}

export interface LectureImportRow {
  name: string;
  link: string;
}

export interface LectureImportResult extends NameImportResult {
  rows: LectureImportRow[];
}

export async function parseNameListExcel(file: File): Promise<NameImportResult> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, blankrows: false });
  if (rows.length === 0) return { names: [], skipped: 0 };
  const firstRow = rows[0];
  const hasHeader = firstRow && typeof firstRow[0] === 'string' && ['name', 'names'].includes(firstRow[0].trim().toLowerCase());
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

/**
 * Lecture lists support either:
 * - one column: Names
 * - two columns: Names | Links
 *
 * Singular Name/Link headers and headerless rows remain supported for older files.
 * The existing Subjects page still receives the names array, while the parsed rows
 * are announced so the matching newly-created lectures can receive their links.
 */
export async function parseLectureExcel(file: File): Promise<LectureImportResult> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rawRows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, blankrows: false });
  if (rawRows.length === 0) return { names: [], rows: [], skipped: 0 };

  const headers = (rawRows[0] ?? []).map(value => String(value ?? '').trim().toLowerCase());
  const hasHeader = ['name', 'names'].includes(headers[0]);
  const headerLinkIndex = headers.findIndex(value => value === 'link' || value === 'links');
  const linkIndex = headerLinkIndex >= 0 ? headerLinkIndex : 1;
  const dataRows = hasHeader ? rawRows.slice(1) : rawRows;
  const rows: LectureImportRow[] = [];
  let skipped = 0;

  for (const row of dataRows) {
    if (!row || row.length === 0) continue;
    const name = String(row[0] ?? '').trim();
    const link = String(row[linkIndex] ?? '').trim();
    if (!name) { skipped++; continue; }
    rows.push({ name, link });
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('studyhub:lecture-import-parsed', { detail: { rows } }));
  }

  return { names: rows.map(row => row.name), rows, skipped };
}

export const parseExamNameListExcel = parseNameListExcel;

export interface FlashcardImportRow {
  front: string;
  back: string;
  frontImage?: string;
  backImage?: string;
}

export interface FlashcardImportResult {
  rows: FlashcardImportRow[];
  skipped: number;
}

export async function parseFlashcardExcel(file: File): Promise<FlashcardImportResult> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, blankrows: false });
  if (rows.length === 0) return { rows: [], skipped: 0 };

  const headers = (rows[0] ?? []).map(value => String(value ?? '').trim().toLowerCase());
  const hasHeader = headers[0] === 'front face' && headers[1] === 'back face';
  const frontImageIndex = headers.findIndex(value => value === 'front image' || value === 'front image link');
  const backImageIndex = headers.findIndex(value => value === 'back image' || value === 'back image link');
  const dataRows = hasHeader ? rows.slice(1) : rows;
  const result: FlashcardImportRow[] = [];
  let skipped = 0;

  for (const row of dataRows) {
    if (!row || row.length === 0) continue;
    const front = String(row[0] ?? '').trim();
    const back = String(row[1] ?? '').trim();
    const frontImage = String(frontImageIndex >= 0 ? row[frontImageIndex] ?? '' : row[2] ?? '').trim();
    const backImage = String(backImageIndex >= 0 ? row[backImageIndex] ?? '' : row[3] ?? '').trim();
    if ((!front && !frontImage) || (!back && !backImage)) { skipped++; continue; }
    result.push({ front, back, frontImage: frontImage || undefined, backImage: backImage || undefined });
  }
  return { rows: result, skipped };
}

export async function parseExamExcel(file: File): Promise<ExamQuestion[]> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, blankrows: false });
  const dataRows = rows.slice(1);
  const questions: ExamQuestion[] = [];
  for (const row of dataRows) {
    if (!row || row.length === 0) continue;
    const [rawType, text, c1, c2, c3, c4, rawCorrect, labs, histo] = row;
    if (!text) continue;
    const questionType: QuestionType = String(rawType || '').trim().toLowerCase() === 'medical case mcq' ? 'Medical Case MCQ' : 'MCQ';
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
