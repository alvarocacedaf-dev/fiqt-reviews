import { describe, expect, it } from 'vitest';
import { normalizeSearchText } from '@/lib/search';

describe('normalizeSearchText', () => {
  it('permite buscar nombres sin escribir sus tildes', () => {
    expect(normalizeSearchText('Tópicos Especiales en Física')).toBe('topicos especiales en fisica');
    expect(normalizeSearchText('topicos')).toBe('topicos');
  });

  it('ignora mayúsculas y espacios exteriores', () => {
    expect(normalizeSearchText('  CÁLCULO INTEGRAL  ')).toBe('calculo integral');
  });
});
