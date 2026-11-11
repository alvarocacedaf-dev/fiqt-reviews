import { NextResponse } from 'next/server';
import { randomInt } from 'node:crypto';
import { physicsExamAccess } from '@/lib/physicsExamAccess';
import { physicsPC1Bank } from '@/lib/examQuestionBank';
import { examCombinationPool, permutationParameters, questionsAtRank } from '@/lib/examCombinations';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
export const dynamic = 'force-dynamic';
export async function POST(request: Request) {
  const access = await physicsExamAccess();
  if (access !== 200) return NextResponse.json({ error: 'Necesitas acceso a las planchas de Física I.' }, { status: access });
  let count: number;
  try { count = (await request.json()).count; } catch { return NextResponse.json({ error: 'Solicitud inválida.' }, { status: 400 }); }
  let selection;
  try { selection = examCombinationPool(physicsPC1Bank.questions, count); }
  catch { return NextResponse.json({ error: 'Elige entre 1 y 10 preguntas.' }, { status: 400 }); }
  const { data: { user } } = await (await createClient()).auth.getUser();
  if (!user) return NextResponse.json({ error: 'Inicia sesión nuevamente.' }, { status: 401 });
  const { offset, step } = permutationParameters(selection.total);
  const { data, error } = await createAdminClient().rpc('reserve_practice_exam_combination', {
    p_user_id: user.id, p_bank_key: 'bfi01-pc1:' + selection.fingerprint,
    p_count: count, p_total: selection.total, p_offset: offset, p_step: step,
  });
  if (error || !data?.length) return NextResponse.json({ error: 'No se pudo guardar el historial del examen. Vuelve a intentarlo.' }, { status: 503 });
  const questions = questionsAtRank(selection.pool, count, Number(data[0].combination_rank));
  for (let i = questions.length - 1; i > 0; i--) { const j = randomInt(i + 1); [questions[i], questions[j]] = [questions[j], questions[i]]; }
  return NextResponse.json({ restarted: data[0].restarted, questions: questions.map(q => ({ id: q.id, sourceTitle: q.sourceTitle, originalNumber: q.originalNumber, page: q.page })) }, { headers: { 'Cache-Control': 'private, no-store' } });
}
