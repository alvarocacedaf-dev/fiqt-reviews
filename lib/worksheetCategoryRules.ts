export const WORKSHEET_EXAM_TYPES = [
  'practice',
  'midterm',
  'final',
  'substitute',
  'quiz',
  'other',
] as const;

export type WorksheetExamType = typeof WORKSHEET_EXAM_TYPES[number];

const PRACTICE_ONLY_COURSE_CODES = new Set(['BRN01']);

export function isWorksheetExamTypeAllowed(
  courseCode: string | null | undefined,
  examType: string,
) {
  if (!WORKSHEET_EXAM_TYPES.includes(examType as WorksheetExamType)) return false;
  if (PRACTICE_ONLY_COURSE_CODES.has(courseCode?.trim().toUpperCase() ?? '')) {
    return examType === 'practice';
  }
  return true;
}
