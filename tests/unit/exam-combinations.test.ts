import { describe, expect, it } from 'vitest';
import { combinationCount, questionsAtRank, permutationParameters, examCombinationPool } from '@/lib/examCombinations';
import { physicsPC1Bank } from '@/lib/examQuestionBank';
describe('combinaciones sin repetición', () => {
  it('recorre todas las combinaciones, no solo cambios de orden', () => {
    const pool = ['a','b','c','d','e'];
    for (let count = 1; count <= 5; count++) {
      const total = combinationCount(pool.length, count);
      const { offset, step } = permutationParameters(total);
      const seen = new Set<string>();
      for (let cursor = 0; cursor < total; cursor++) {
        const result = questionsAtRank(pool, count, (offset + cursor * step) % total);
        expect(result).toHaveLength(count);
        expect(new Set(result).size).toBe(count);
        seen.add(result.sort().join(','));
      }
      expect(seen.size).toBe(total);
    }
  });
  it('mantiene la identidad aunque cambie el orden del banco', () => {
    const first = examCombinationPool(physicsPC1Bank.questions, 5);
    expect(first.total).toBe(combinationCount(74, 5));
    expect(examCombinationPool([...physicsPC1Bank.questions].reverse(), 5).fingerprint).toBe(first.fingerprint);
  });
  it('valida los límites', () => {
    expect(() => questionsAtRank([1,2], 1, 2)).toThrow();
    expect(() => examCombinationPool(physicsPC1Bank.questions, 0)).toThrow();
    expect(() => examCombinationPool(physicsPC1Bank.questions, 7)).toThrow();
    expect(examCombinationPool(physicsPC1Bank.questions, 6).total).toBe(combinationCount(74, 6));
    expect(examCombinationPool(physicsPC1Bank.questions, 6).total).toBeLessThan(2 ** 31);
  });
});
