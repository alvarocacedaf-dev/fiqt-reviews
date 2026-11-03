import { describe, expect, it } from 'vitest';
import { groupPracticeFiles, practiceFolderNumber } from '@/lib/worksheetPracticeFolders';
const file = (title: string, file_name = title + '.pdf') => ({ title, file_name });
describe('subcarpetas de prácticas calificadas', () => {
  it('identifica números, abreviaturas, ordinales y el nombre original', () => {
    expect(practiceFolderNumber(file('Práctica calificada 1 de Métodos 2023-1'))).toBe(1);
    expect(practiceFolderNumber(file('PC-02'))).toBe(2);
    expect(practiceFolderNumber(file('Séptima práctica calificada'))).toBe(7);
    expect(practiceFolderNumber(file('Evaluación', 'PC_6.docx'))).toBe(6);
    expect(practiceFolderNumber(file('Práctica calificada 2023-1'))).toBeNull();
  });
  it('ordena subcarpetas y conserva todos los archivos y el orden interno', () => {
    const files = [file('PC 3'), file('PC 1 A'), file('Sin número'), file('PC 1 B')];
    const groups = groupPracticeFiles(files);
    expect(groups.map(g => g.label)).toEqual(['Práctica calificada 1', 'Práctica calificada 3', 'Prácticas sin número identificado']);
    expect(groups[0].files).toEqual([files[1], files[3]]);
    expect(groups.flatMap(g => g.files)).toHaveLength(4);
  });
});
