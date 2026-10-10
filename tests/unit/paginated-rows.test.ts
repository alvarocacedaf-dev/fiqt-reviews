import { describe, expect, it, vi } from 'vitest';
import { loadAllPaginatedRows, uniqueRowsBy } from '@/lib/paginatedRows';

describe('carga paginada de catálogos administrativos', () => {
  it('continúa después del límite de 1000 filas de Supabase', async () => {
    const firstPage = Array.from({ length: 1000 }, (_, index) => ({ id: index }));
    const secondPage = Array.from({ length: 6 }, (_, index) => ({ id: 1000 + index }));
    const fetchPage = vi.fn()
      .mockResolvedValueOnce({ data: firstPage, error: null })
      .mockResolvedValueOnce({ data: secondPage, error: null });

    const rows = await loadAllPaginatedRows(fetchPage);

    expect(rows).toHaveLength(1006);
    expect(fetchPage).toHaveBeenNthCalledWith(1, 0, 999);
    expect(fetchPage).toHaveBeenNthCalledWith(2, 1000, 1999);
  });

  it('deja una sola opción por combinación de curso y profesor', () => {
    const rows = [
      { courseId: 'qu216', professorId: 'profesor-1', term: '2025-2' },
      { courseId: 'qu216', professorId: 'profesor-1', term: '2026-1' },
      { courseId: 'qu216', professorId: 'profesor-2', term: '2026-1' },
    ];

    expect(uniqueRowsBy(rows, row => `${row.courseId}|${row.professorId}`)).toHaveLength(2);
  });
});
