import { describe, expect, it } from 'vitest';
import { isWorksheetExamTypeAllowed } from '@/lib/worksheetCategoryRules';

describe('worksheet category rules', () => {
  it('permite únicamente prácticas calificadas para BRN01', () => {
    expect(isWorksheetExamTypeAllowed('BRN01', 'practice')).toBe(true);
    expect(isWorksheetExamTypeAllowed('BRN01', 'midterm')).toBe(false);
    expect(isWorksheetExamTypeAllowed('brn01', 'final')).toBe(false);
    expect(isWorksheetExamTypeAllowed('BRN01', 'substitute')).toBe(false);
    expect(isWorksheetExamTypeAllowed('BRN01', 'quiz')).toBe(false);
    expect(isWorksheetExamTypeAllowed('BRN01', 'other')).toBe(false);
  });

  it('mantiene las categorías habituales para los demás cursos', () => {
    expect(isWorksheetExamTypeAllowed('BMA02', 'practice')).toBe(true);
    expect(isWorksheetExamTypeAllowed('BMA02', 'midterm')).toBe(true);
    expect(isWorksheetExamTypeAllowed('BMA02', 'final')).toBe(true);
    expect(isWorksheetExamTypeAllowed('BMA02', 'substitute')).toBe(true);
  });

  it('rechaza valores desconocidos', () => {
    expect(isWorksheetExamTypeAllowed('BMA02', 'unknown')).toBe(false);
  });
});
