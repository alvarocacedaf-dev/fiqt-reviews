import { describe, expect, it } from 'vitest';
import bank from '@/data/question-banks/qu328-final.json';
import { examCombinationPool } from '@/lib/examCombinations';
import { examGeneratorKey } from '@/lib/examGeneratorConfig';

describe('banco de finales QU328', () => {
  it('cubre los nueve ciclos sin duplicar solucionarios y conserva procedencia', () => {
    expect(bank.questions).toHaveLength(46);
    expect(bank.sources).toHaveLength(12);
    expect(new Set(bank.questions.map(q => q.term)).size).toBe(bank.examCount);
    expect(bank.examCount).toBe(9);
    expect(new Set(bank.questions.map(q => q.duplicateKey)).size).toBe(46);
    expect(examCombinationPool(bank.questions, 6).pool).toHaveLength(46);
    for (const q of bank.questions) {
      expect(bank.sources.some(s => s.id === q.sourceId)).toBe(true);
      expect(q.sourcePages).toEqual([...new Set(q.rectangles.map(r => r[0]))].sort());
      expect(q.sha256).toMatch(/^[a-f0-9]{64}$/);
      expect(q.assetPath).toMatch(/^question-bank\/qu328-final\/v1\//);
      expect(q.width).toBeGreaterThan(300);
    }
  });
  it('mantiene los enlaces antiguos y solo admite bancos conocidos', () => {
    expect(examGeneratorKey({})).toBe('bfi01-pc1');
    expect(examGeneratorKey({ practice: '2' })).toBe('bfi01-pc2');
    expect(examGeneratorKey({ bank: 'qu328-final' })).toBe('qu328-final');
    expect(examGeneratorKey({ bank: '__proto__' })).toBeNull();
    expect(examGeneratorKey({ bank: 'constructor' })).toBeNull();
  });
});
