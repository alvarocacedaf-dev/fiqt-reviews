import { NextResponse } from 'next/server';
import { randomInt } from 'node:crypto';
import { physicsExamAccess } from '@/lib/physicsExamAccess';
import { requestExamBank } from '@/lib/examQuestionBank';
import { examCombinationPool, permutationParameters, questionsAtRank } from '@/lib/examCombinations';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getLiveExamBank } from '@/lib/liveExamBank';
export const dynamic = 'force-dynamic';
export async function POST(request: Request) {
  let bank = requestExamBank(request);
  if (!bank) return new Response(null, { status: 400 });
  const access = await physicsExamAccess(bank.courseId);
  if (access !== 200) return NextResponse.json({ error: 'Necesitas acceso a las planchas de ' + bank.courseName + '.' }, { status: access });
  try { bank = await getLiveExamBank(bank.key); }
  catch { return NextResponse.json({ error: 'No se pudo cargar el banco. Inténtalo nuevamente.' }, { status: 503 }); }
  let count: number;
  try { count = (await request.json()).count; } catch { return NextResponse.json({ error: 'Solicitud inválida.' }, { status: 400 }); }
  let selection;
  try { selection = examCombinationPool(bank.questions, count); }
  catch { return NextResponse.json({ error: 'Elige entre 1 y 6 preguntas.' }, { status: 400 }); }
  const { data: { user } } = await (await createClient()).auth.getUser();
  if (!user) return NextResponse.json({ error: 'Inicia sesión nuevamente.' }, { status: 401 });
  const { offset, step } = permutationParameters(selection.total);
  const { data, error } = await createAdminClient().rpc('reserve_live_exam_combination', {
    p_user_id: user.id, p_bank_key: bank.key, p_fingerprint: selection.fingerprint,
    p_keys: selection.pool.map(q => q.duplicateKey), p_count: count, p_offset: offset, p_step: step,
  });
  if (error || !data?.length) return NextResponse.json({ error: 'No se pudo guardar el historial del examen. Vuelve a intentarlo.' }, { status: 503 });
  if (data[0].pending) return NextResponse.json({ pending: true }, { status: 202, headers: { 'Cache-Control': 'private, no-store' } });
  const questions = questionsAtRank(selection.pool, count, Number(data[0].combination_rank));
  for (let i = questions.length - 1; i > 0; i--) { const j = randomInt(i + 1); [questions[i], questions[j]] = [questions[j], questions[i]]; }
  return NextResponse.json({ restarted: data[0].restarted, questions: questions.map(q => ({ id: q.id, sourceTitle: q.sourceTitle, originalNumber: q.originalNumber, page: q.page })) }, { headers: { 'Cache-Control': 'private, no-store' } });
}
