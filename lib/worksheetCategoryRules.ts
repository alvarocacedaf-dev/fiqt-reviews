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
const CONTROLS_INSTEAD_OF_PRACTICES_COURSE_CODES = new Set(['QU428']);

export function usesControlsInsteadOfPractices(courseCode: string | null | undefined) {
  return CONTROLS_INSTEAD_OF_PRACTICES_COURSE_CODES.has(courseCode?.trim().toUpperCase() ?? '');
}

export function isWorksheetExamTypeAllowed(
  courseCode: string | null | undefined,
  examType: string,
) {
  if (!WORKSHEET_EXAM_TYPES.includes(examType as WorksheetExamType)) return false;
  if (PRACTICE_ONLY_COURSE_CODES.has(courseCode?.trim().toUpperCase() ?? '')) {
    return examType === 'practice';
  }
  if (usesControlsInsteadOfPractices(courseCode) && examType === 'practice') return false;
  return true;
}
