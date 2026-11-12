import { describe, expect, it } from 'vitest';
import { physicsPC1Bank, selectExamQuestions } from '@/lib/examQuestionBank';
describe('banco piloto de Física I', () => {
  it('cubre los 18 archivos de enunciados sin volver a sortear los dos solucionarios', () => {
    expect(physicsPC1Bank.questions).toHaveLength(74);
    expect(physicsPC1Bank.sources).toHaveLength(20);
    const included = physicsPC1Bank.sources.filter(s => s.status === 'included');
    expect(included).toHaveLength(18);
    expect(physicsPC1Bank.sources.filter(s => s.status === 'solution-only')).toHaveLength(2);
    for (const source of included) expect(physicsPC1Bank.questions.some(q => q.sourceId === source.id)).toBe(true);
    expect(new Set(physicsPC1Bank.questions.map(q => q.duplicateKey)).size).toBe(74);
    for (const q of physicsPC1Bank.questions) expect(included.some(s => s.id === q.sourceId)).toBe(true);
  });
  it('mezcla cinco ciclos sin repetir preguntas', () => {
    for (let i = 0; i < 30; i++) {
      const result = selectExamQuestions(physicsPC1Bank.questions, 5);
      expect(new Set(result.map(q => q.term)).size).toBe(5);
      expect(new Set(result.map(q => q.duplicateKey)).size).toBe(5);
    }
  });
  it('no selecciona pendientes ni duplicados editoriales', () => {
    const first = physicsPC1Bank.questions[0];
    const list = [first, { ...first, id: 'duplicate' }, { ...first, id: 'pending', duplicateKey: 'pending', status: 'pending-review' }];
    expect(selectExamQuestions(list, 1)).toHaveLength(1);
    expect(() => selectExamQuestions(list, 2)).toThrow();
  });
  it('rechaza cantidades inválidas y conserva el banco', () => {
    const original = JSON.stringify(physicsPC1Bank);
    for (const n of [0, -1, 7, 10, 11, 2.5, NaN]) expect(() => selectExamQuestions(physicsPC1Bank.questions, n)).toThrow();
    expect(selectExamQuestions(physicsPC1Bank.questions, 6)).toHaveLength(6);
    expect(JSON.stringify(physicsPC1Bank)).toBe(original);
  });
});
