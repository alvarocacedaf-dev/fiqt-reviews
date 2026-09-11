import { describe, expect, it } from 'vitest';
import { isReviewAcademicTerm, REVIEW_ACADEMIC_TERMS } from '@/lib/reviewAcademicTerms';

describe('ciclos académicos de las reseñas', () => {
  it('incluye los tres ciclos de 2018 a 2025 y únicamente 2026-1', () => {
    expect(REVIEW_ACADEMIC_TERMS).toHaveLength(25);
    expect(REVIEW_ACADEMIC_TERMS[0]).toBe('2018-1');
    expect(REVIEW_ACADEMIC_TERMS.at(-1)).toBe('2026-1');
    expect(REVIEW_ACADEMIC_TERMS).toContain('2025-3');
    expect(REVIEW_ACADEMIC_TERMS).not.toContain('2026-2');
  });

  it('rechaza valores fuera de las opciones permitidas', () => {
    expect(isReviewAcademicTerm('2020-3')).toBe(true);
    expect(isReviewAcademicTerm('2017-3')).toBe(false);
    expect(isReviewAcademicTerm('2026-2')).toBe(false);
    expect(isReviewAcademicTerm('')).toBe(false);
  });
});
