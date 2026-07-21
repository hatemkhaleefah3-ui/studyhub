import * as XLSX from "xlsx";
import type { ExamQuestion, Flashcard, QuestionType } from "@/hooks/useStudyData";

const FLASHCARD_HEADERS = ["Front face", "Back face"];
const EXAM_HEADERS = [
  "Question Type", "Question Text", "Choice 1", "Choice 2", "Choice 3", "Choice 4",
  "Correct Answer (1-4)", "Labs", "Histo",
];

type MediaFlashcard = Flashcard & { frontImage?: string; backImage?: string };

export interface FinalExamImportError { filename: string; reason: string }
export interface FinalExamImportResult {
  questions: ExamQuestion[];
  flashcards: MediaFlashcard[];
  errors: FinalExamImportError[];
}

const exactHeader = (row: unknown[], expected: string[]) =>
  expected.every((value, index) => String(row[index] ?? "").trim() === value);

export async function parseFinalExamFiles(files: File[]): Promise<FinalExamImportResult> {
  const result: FinalExamImportResult = { questions: [], flashcards: [], errors: [] };

  for (const file of files) {
    try {
      const workbook = XLSX.read(await file.arrayBuffer(), { type: "array" });
      const flashSheet = workbook.Sheets["Flashcards"];
      const examSheet = workbook.Sheets["Exam"];
      let recognized = false;

      if (flashSheet) {
        const rows: unknown[][] = XLSX.utils.sheet_to_json(flashSheet, { header: 1, blankrows: false });
        if (rows[0] && exactHeader(rows[0], FLASHCARD_HEADERS)) {
          recognized = true;
          const headers = rows[0].map(value => String(value ?? "").trim().toLowerCase());
          const frontImageIndex = headers.findIndex(value => value === "front image" || value === "front image link");
          const backImageIndex = headers.findIndex(value => value === "back image" || value === "back image link");
          rows.slice(1).forEach((row) => {
            const front = String(row[0] ?? "").trim();
            const back = String(row[1] ?? "").trim();
            const frontImage = String(frontImageIndex >= 0 ? row[frontImageIndex] ?? "" : row[2] ?? "").trim();
            const backImage = String(backImageIndex >= 0 ? row[backImageIndex] ?? "" : row[3] ?? "").trim();
            if ((front || frontImage) && (back || backImage)) result.flashcards.push({ id: crypto.randomUUID(), front, back, frontImage: frontImage || undefined, backImage: backImage || undefined });
          });
        }
      }

      if (examSheet) {
        const rows: unknown[][] = XLSX.utils.sheet_to_json(examSheet, { header: 1, blankrows: false });
        if (rows[0] && exactHeader(rows[0], EXAM_HEADERS)) {
          recognized = true;
          rows.slice(1).forEach((row) => {
            const rawType = String(row[0] ?? "").trim();
            const text = String(row[1] ?? "").trim();
            if (!text || (rawType !== "MCQ" && rawType !== "Medical Case MCQ")) return;
            const questionType = rawType as QuestionType;
            const correctAnswer = Number(row[6]);
            if (![1, 2, 3, 4].includes(correctAnswer)) return;
            result.questions.push({
              id: crypto.randomUUID(), questionType, text,
              choices: [String(row[2] ?? ""), String(row[3] ?? ""), String(row[4] ?? ""), String(row[5] ?? "")],
              correctAnswer,
              labs: questionType === "Medical Case MCQ" ? String(row[7] ?? "").trim() || undefined : undefined,
              histo: questionType === "Medical Case MCQ" ? String(row[8] ?? "").trim() || undefined : undefined,
            });
          });
        }
      }

      if (!recognized) result.errors.push({ filename: file.name, reason: "unrecognized format" });
    } catch {
      result.errors.push({ filename: file.name, reason: "unrecognized format" });
    }
  }

  return result;
}
