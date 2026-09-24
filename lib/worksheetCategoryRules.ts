export const WORKSHEET_EXAM_TYPES = [
  'practice',
  'midterm',
  'final',
  'substitute',
  'quiz',
  'other',
] as const;

export type WorksheetExamType = typeof WORKSHEET_EXAM_TYPES[number];

const PRACTICE_ONLY_COURSE_CODES = new Set(['BRN01', 'PI111']);
const PRACTICE_REPLACEMENT_LABELS: Record<string, string> = {
  QU428: 'Controles',
  QU328: 'Test o Pasitos',
};

export function worksheetPracticeReplacementLabel(courseCode: string | null | undefined) {
  return PRACTICE_REPLACEMENT_LABELS[courseCode?.trim().toUpperCase() ?? ''] ?? null;
}

export function isWorksheetExamTypeAllowed(
  courseCode: string | null | undefined,
  examType: string,
) {
  if (!WORKSHEET_EXAM_TYPES.includes(examType as WorksheetExamType)) return false;
  if (PRACTICE_ONLY_COURSE_CODES.has(courseCode?.trim().toUpperCase() ?? '')) {
    return examType === 'practice';
  }
  if (worksheetPracticeReplacementLabel(courseCode) && examType === 'practice') return false;
  return true;
}
