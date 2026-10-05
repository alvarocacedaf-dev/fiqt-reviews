import { describe, expect, it } from 'vitest';
import { worksheetLibraryCycleLabel } from '@/components/AdminWorksheetLibraryManager';

describe('grupos de la biblioteca de planchas', () => {
  it('conserva los nombres de los ciclos regulares', () => {
    expect(worksheetLibraryCycleLabel(1)).toBe('Ciclo 1');
    expect(worksheetLibraryCycleLabel(10)).toBe('Ciclo 10');
  });

  it('nombra correctamente los cursos electivos y complementarios', () => {
    expect(worksheetLibraryCycleLabel(11)).toBe('Cursos electivos');
    expect(worksheetLibraryCycleLabel(12)).toBe('Cursos complementarios');
  });
});
