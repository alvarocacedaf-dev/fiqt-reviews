import { describe, expect, it } from 'vitest';
import { getPagination, getTotalPages } from '@/lib/pagination';

describe('paginación', () => {
  it('calcula rangos inclusivos para Supabase', () => {
    expect(getPagination('1')).toEqual({ page: 1, pageSize: 25, from: 0, to: 24 });
    expect(getPagination('3')).toEqual({ page: 3, pageSize: 25, from: 50, to: 74 });
  });

  it('normaliza páginas inválidas y calcula el total', () => {
    expect(getPagination('-8').page).toBe(1);
    expect(getPagination('texto').page).toBe(1);
    expect(getTotalPages(51, 25)).toBe(3);
    expect(getTotalPages(0, 25)).toBe(1);
  });
});
