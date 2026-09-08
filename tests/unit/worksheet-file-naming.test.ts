import { describe, expect, it } from 'vitest';
import { canonicalizeWorksheetFileName } from '@/lib/worksheetFileNaming';

const base = { courseName: 'Física II', courseCode: 'BFI02', academicTerm: '2026-1' };

describe('canonicalizeWorksheetFileName', () => {
  it('acepta PC y el código del curso', () => {
    expect(canonicalizeWorksheetFileName({ ...base, fileName: 'pc 2 de bfi02 2026-1.pdf', examType: 'practice' })).toEqual({
      title: 'Práctica calificada 2 de Física II 2026-1', error: null, academicTerm: '2026-1',
    });
  });

  it('acepta Susti y normaliza el título', () => {
    expect(canonicalizeWorksheetFileName({ ...base, fileName: 'susti de bfi02 2026-1.pdf', examType: 'substitute' })).toEqual({
      title: 'Examen sustitutorio de Física II 2026-1', error: null, academicTerm: '2026-1',
    });
  });

  it('acepta números arábigos y conserva detalles', () => {
    expect(canonicalizeWorksheetFileName({ ...base, fileName: 'final de fisica 2 2026-1 SECCION B SOLUCIONARIO.pdf', examType: 'final' })).toEqual({
      title: 'Examen final de Física II 2026-1 — SECCION B SOLUCIONARIO', error: null, academicTerm: '2026-1',
    });
  });

  it('rechaza el archivo si corresponde a otra carpeta', () => {
    expect(canonicalizeWorksheetFileName({ ...base, fileName: 'pc 2 de bfi02 2026-1.pdf', examType: 'midterm' }).error).toBeTruthy();
  });

  it('detecta el ciclo individual abreviado cuando aparece al inicio', () => {
    expect(canonicalizeWorksheetFileName({
      ...base,
      academicTerm: '',
      fileName: '19-3 PARCIAL BFI02.pdf',
      examType: 'midterm',
    })).toEqual({
      title: 'Examen parcial de Física II 2019-3', error: null, academicTerm: '2019-3',
    });
  });

  it('conserva los detalles de un archivo con ciclo al inicio', () => {
    expect(canonicalizeWorksheetFileName({
      ...base,
      academicTerm: '',
      fileName: '25-1 PARCIAL CON SOL BFI02.pdf',
      examType: 'midterm',
    })).toEqual({
      title: 'Examen parcial de Física II 2025-1 — con sol', error: null, academicTerm: '2025-1',
    });
  });

  it('acepta el código del curso antes de los detalles adicionales', () => {
    expect(canonicalizeWorksheetFileName({
      ...base,
      academicTerm: '',
      fileName: '23-1 PARCIAL BFI02 CON SOL_.pdf',
      examType: 'midterm',
    })).toEqual({
      title: 'Examen parcial de Física II 2023-1 — con sol', error: null, academicTerm: '2023-1',
    });
  });

  it('acepta el ordinal antes de PC y una sección unida al código', () => {
    expect(canonicalizeWorksheetFileName({
      courseName: 'Matemáticas Básicas',
      courseCode: 'BMA04',
      academicTerm: '',
      fileName: '1ra PC BMA04B 25-2.pdf',
      examType: 'practice',
    })).toEqual({
      title: 'Práctica calificada 1 de Matemáticas Básicas 2025-2 — SECCIÓN B',
      error: null,
      academicTerm: '2025-2',
    });
  });

  it('acepta 2da como número de práctica', () => {
    expect(canonicalizeWorksheetFileName({
      courseName: 'Matemáticas Básicas',
      courseCode: 'BMA04',
      academicTerm: '',
      fileName: '2da PC BMA04B 25-2.pdf',
      examType: 'practice',
    })).toEqual({
      title: 'Práctica calificada 2 de Matemáticas Básicas 2025-2 — SECCIÓN B',
      error: null,
      academicTerm: '2025-2',
    });
  });

  it('conserva SOLUCIONARIO después del ciclo y descarta el DE gramatical', () => {
    expect(canonicalizeWorksheetFileName({
      courseName: 'Física II',
      courseCode: 'BFI02',
      academicTerm: '',
      fileName: '2 PC DE FÍSICA 2 2018-1 SOLUCIONARIO.pdf',
      examType: 'practice',
    })).toEqual({
      title: 'Práctica calificada 2 de Física II 2018-1 — SOLUCIONARIO',
      error: null,
      academicTerm: '2018-1',
    });
  });

  it('normaliza una práctica sin detalles posteriores al ciclo', () => {
    expect(canonicalizeWorksheetFileName({
      courseName: 'Física II',
      courseCode: 'BFI02',
      academicTerm: '',
      fileName: '5 PC DE FÍSICA 2 2018-1.pdf',
      examType: 'practice',
    })).toEqual({
      title: 'Práctica calificada 5 de Física II 2018-1',
      error: null,
      academicTerm: '2018-1',
    });
  });
});
