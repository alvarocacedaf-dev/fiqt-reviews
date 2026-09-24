import { describe, expect, it } from 'vitest';
import { isWorksheetExamTypeAllowed, usesControlsInsteadOfPractices } from '@/lib/worksheetCategoryRules';

describe('worksheet category rules', () => {
  it('permite únicamente prácticas calificadas para BRN01', () => {
    expect(isWorksheetExamTypeAllowed('BRN01', 'practice')).toBe(true);
    expect(isWorksheetExamTypeAllowed('BRN01', 'midterm')).toBe(false);
    expect(isWorksheetExamTypeAllowed('brn01', 'final')).toBe(false);
    expect(isWorksheetExamTypeAllowed('BRN01', 'substitute')).toBe(false);
    expect(isWorksheetExamTypeAllowed('BRN01', 'quiz')).toBe(false);
    expect(isWorksheetExamTypeAllowed('BRN01', 'other')).toBe(false);
  });

  it('permite únicamente prácticas calificadas para PI111 — Balance de Materia y Energía', () => {
    expect(isWorksheetExamTypeAllowed('PI111', 'practice')).toBe(true);
    expect(isWorksheetExamTypeAllowed('PI111', 'midterm')).toBe(false);
    expect(isWorksheetExamTypeAllowed('pi111', 'final')).toBe(false);
    expect(isWorksheetExamTypeAllowed(' PI111 ', 'substitute')).toBe(false);
    expect(isWorksheetExamTypeAllowed('PI111', 'quiz')).toBe(false);
    expect(isWorksheetExamTypeAllowed('PI111', 'other')).toBe(false);
  });

  it('mantiene las categorías habituales para los demás cursos', () => {
    expect(isWorksheetExamTypeAllowed('BMA02', 'practice')).toBe(true);
    expect(isWorksheetExamTypeAllowed('BMA02', 'midterm')).toBe(true);
    expect(isWorksheetExamTypeAllowed('BMA02', 'final')).toBe(true);
    expect(isWorksheetExamTypeAllowed('BMA02', 'substitute')).toBe(true);
  });

  it('usa controles en lugar de prácticas calificadas para QU428 — Fisicoquímica II', () => {
    expect(usesControlsInsteadOfPractices('QU428')).toBe(true);
    expect(usesControlsInsteadOfPractices(' qu428 ')).toBe(true);
    expect(isWorksheetExamTypeAllowed('QU428', 'practice')).toBe(false);
    expect(isWorksheetExamTypeAllowed('QU428', 'quiz')).toBe(true);
    expect(isWorksheetExamTypeAllowed('QU428', 'midterm')).toBe(true);
    expect(isWorksheetExamTypeAllowed('QU428', 'final')).toBe(true);
    expect(isWorksheetExamTypeAllowed('QU428', 'substitute')).toBe(true);
  });

  it('rechaza valores desconocidos', () => {
    expect(isWorksheetExamTypeAllowed('BMA02', 'unknown')).toBe(false);
  });
});
