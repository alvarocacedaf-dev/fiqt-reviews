import { createHash, randomInt } from 'node:crypto';
import type { BankQuestion } from '@/lib/examQuestionBank';
export function combinationCount(n: number, k: number) {
  if (!Number.isInteger(n) || !Number.isInteger(k) || k < 0 || k > n) return 0;
  let value = 1;
  for (let i = 1; i <= k; i++) value = value * (n - i + 1) / i;
  return Math.round(value);
}
export function examCombinationPool(questions: BankQuestion[], count: number) {
  const pool = [...new Map(questions.filter(q => q.status === 'reviewed').map(q => [q.duplicateKey, q])).values()]
    .sort((a, b) => a.duplicateKey.localeCompare(b.duplicateKey, 'en'));
  if (!Number.isInteger(count) || count < 1 || count > Math.min(10, pool.length)) throw new Error('Cantidad inválida');
  const total = combinationCount(pool.length, count);
  if (!Number.isSafeInteger(total) || total >= 2 ** 31) throw new Error('Banco demasiado grande');
  const fingerprint = createHash('sha256').update(JSON.stringify(pool.map(q => q.duplicateKey))).digest('hex');
  return { pool, total, fingerprint };
}
export function questionsAtRank<T>(pool: T[], count: number, rank: number): T[] {
  if (!Number.isInteger(rank) || rank < 0 || rank >= combinationCount(pool.length, count)) throw new Error('Índice inválido');
  const selected: T[] = [];
  for (let i = 0; i < pool.length && selected.length < count; i++) {
    const block = combinationCount(pool.length - i - 1, count - selected.length - 1);
    if (rank < block) selected.push(pool[i]);
    else rank -= block;
  }
  return selected;
}
export function permutationParameters(total: number) {
  const gcd = (a: number, b: number): number => b ? gcd(b, a % b) : a;
  let step = 1;
  if (total > 1) do { step = randomInt(1, total); } while (gcd(step, total) !== 1);
  return { offset: randomInt(total), step };
}
