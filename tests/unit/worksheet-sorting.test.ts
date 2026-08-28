import { describe, expect, it } from 'vitest';
import { compareAssessmentWorksheetFiles } from '@/lib/worksheetSorting';

function worksheet(title: string, academicTerm: string | null = null) {
  return {
    title,
    file_name: `${title}.pdf`,
    academic_term: academicTerm,
    created_at: '2026-08-28T00:00:00.000Z',
  };
}

describe('compareAssessmentWorksheetFiles', () => {
  it('ordena por número de práctica y después por ciclo académico', () => {
    const files = [
      worksheet('4 CUARTA PC DE INTEGRAL 2024-1'),
      worksheet('2 SEGUNDA PC DE INTEGRAL 2023-2'),
      worksheet('1 PRIMERA PC DE INTEGRAL 2024-2'),
      worksheet('1 PRIMERA PC DE INTEGRAL 2020-2'),
    ].sort(compareAssessmentWorksheetFiles);

    expect(files.map(file => file.title)).toEqual([
      '1 PRIMERA PC DE INTEGRAL 2020-2',
      '1 PRIMERA PC DE INTEGRAL 2024-2',
      '2 SEGUNDA PC DE INTEGRAL 2023-2',
      '4 CUARTA PC DE INTEGRAL 2024-1',
    ]);
  });

  it('coloca el enunciado antes de sus soluciones y numera estas naturalmente', () => {
    const files = [
      worksheet('4 CUARTA PC DE INTEGRAL 2024-1 SOLUCION 5'),
      worksheet('4 CUARTA PC DE INTEGRAL 2024-1 SOLUCION 2'),
      worksheet('4 CUARTA PC DE INTEGRAL 2024-1'),
      worksheet('4 CUARTA PC DE INTEGRAL 2024-1 SOLUCION 1'),
    ].sort(compareAssessmentWorksheetFiles);

    expect(files.map(file => file.title)).toEqual([
      '4 CUARTA PC DE INTEGRAL 2024-1',
      '4 CUARTA PC DE INTEGRAL 2024-1 SOLUCION 1',
      '4 CUARTA PC DE INTEGRAL 2024-1 SOLUCION 2',
      '4 CUARTA PC DE INTEGRAL 2024-1 SOLUCION 5',
    ]);
  });

  it('ordena parciales, finales y sustitutorios por ciclo y deja la solución después del examen', () => {
    const files = [
      worksheet('EXAMEN FINAL DE INTEGRAL 2024-1 SOLUCIONARIO'),
      worksheet('EXAMEN FINAL DE INTEGRAL 2023-2'),
      worksheet('EXAMEN FINAL DE INTEGRAL 2024-1'),
      worksheet('EXAMEN FINAL DE INTEGRAL 2020-2'),
    ].sort(compareAssessmentWorksheetFiles);

    expect(files.map(file => file.title)).toEqual([
      'EXAMEN FINAL DE INTEGRAL 2020-2',
      'EXAMEN FINAL DE INTEGRAL 2023-2',
      'EXAMEN FINAL DE INTEGRAL 2024-1',
      'EXAMEN FINAL DE INTEGRAL 2024-1 SOLUCIONARIO',
    ]);
  });
});
