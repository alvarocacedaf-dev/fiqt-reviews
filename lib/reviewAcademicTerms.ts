export const REVIEW_ACADEMIC_TERMS = [
  ...Array.from({ length: 8 }, (_, index) => 2018 + index)
    .flatMap(year => [1, 2, 3].map(term => `${year}-${term}`)),
  '2026-1',
];

export function isReviewAcademicTerm(value: string): boolean {
  return REVIEW_ACADEMIC_TERMS.includes(value);
}
