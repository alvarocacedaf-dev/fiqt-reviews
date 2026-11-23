import bank from '@/data/question-banks/bfi01-pc1.json';
import pc2 from '@/data/question-banks/bfi01-pc2.json';
import organicFinal from '@/data/question-banks/qu328-final.json';
import { EXAM_GENERATORS, examGeneratorKey, type ExamGeneratorKey } from '@/lib/examGeneratorConfig';
export function getExamBank(key: ExamGeneratorKey) {
  const data = key === 'qu328-final' ? organicFinal : key === 'bfi01-pc2' ? pc2 : bank;
  return { ...EXAM_GENERATORS[key], questions: data.questions, examCount: data.examCount };
}
export function requestExamBank(request: Request) {
  const params = new URL(request.url).searchParams;
  const key = examGeneratorKey({ bank: params.get('bank'), practice: params.get('practice') });
  return key ? getExamBank(key) : null;
}
export const physicsPC1Bank = bank;
export type BankQuestion = Omit<typeof bank.questions[number], 'gravity'> & { gravity?: number };
export function selectExamQuestions(questions: BankQuestion[], count: number, random: () => number = Math.random) {
  const eligible = [...new Map(questions.filter(q => q.status === 'reviewed').map(q => [q.duplicateKey, q])).values()];
  if (!Number.isInteger(count) || count < 1 || count > Math.min(6, eligible.length)) throw new Error('Elige entre 1 y 6 preguntas disponibles.');
  const shuffle = <T,>(items: T[]) => {
    const result = [...items];
    for (let i = result.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [result[i], result[j]] = [result[j], result[i]]; }
    return result;
  };
  const groups = new Map<string, BankQuestion[]>();
  for (const q of shuffle(eligible)) groups.set(q.term, [...(groups.get(q.term) ?? []), q]);
  const terms = shuffle([...groups.keys()]);
  const selected: BankQuestion[] = [];
  while (selected.length < count) for (const term of terms) {
    const q = groups.get(term)!.pop();
    if (q) selected.push(q);
    if (selected.length === count) break;
  }
  return shuffle(selected);
}
