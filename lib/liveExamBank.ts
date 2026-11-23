import { createAdminClient } from '@/lib/supabase/admin';
import { getExamBank, type BankQuestion } from '@/lib/examQuestionBank';
import type { ExamGeneratorKey } from '@/lib/examGeneratorConfig';

export async function getLiveExamBank(key: ExamGeneratorKey) {
  const base = getExamBank(key);
  const { data, error } = await createAdminClient().from('exam_bank_questions')
    .select('question').eq('bank_key', key).eq('status', 'approved').order('id');
  if (error) throw new Error('No se pudo consultar el banco de preguntas.');
  const questions = [...base.questions, ...(data ?? []).map(row => row.question as BankQuestion)];
  return { ...base, questions, examCount: new Set(questions.map(q => q.term)).size };
}
