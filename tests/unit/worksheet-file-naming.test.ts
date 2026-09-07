import { describe, expect, it } from 'vitest';
import { canonicalizeWorksheetFileName } from '@/lib/worksheetFileNaming';

const base = { courseName: 'Física II', courseCode: 'BFI02', academicTerm: '2026-1' };

describe('canonicalizeWorksheetFileName', () => {
  it('acepta PC y el código del curso', () => {
    expect(canonicalizeWorksheetFileName({ ...base, fileName: 'pc 2 de bfi02 2026-1.pdf', examType: 'practice' })).toEqual({
      title: 'Práctica calificada 2 de Física II 2026-1', error: null,
    });
  });

  it('acepta Susti y normaliza el título', () => {
    expect(canonicalizeWorksheetFileName({ ...base, fileName: 'susti de bfi02 2026-1.pdf', examType: 'substitute' })).toEqual({
      title: 'Examen sustitutorio de Física II 2026-1', error: null,
    });
  });

  it('acepta números arábigos y conserva detalles', () => {
    expect(canonicalizeWorksheetFileName({ ...base, fileName: 'final de fisica 2 2026-1 SECCION B SOLUCIONARIO.pdf', examType: 'final' })).toEqual({
      title: 'Examen final de Física II 2026-1 — SECCION B SOLUCIONARIO', error: null,
    });
  });

  it('rechaza el archivo si corresponde a otra carpeta', () => {
    expect(canonicalizeWorksheetFileName({ ...base, fileName: 'pc 2 de bfi02 2026-1.pdf', examType: 'midterm' }).error).toBeTruthy();
  });
});
