import { NextResponse } from 'next/server';
import { physicsExamAccess } from '@/lib/physicsExamAccess';
import { requestExamBank } from '@/lib/examQuestionBank';
import { createAdminClient } from '@/lib/supabase/admin';
import { getLiveExamBank } from '@/lib/liveExamBank';
export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  let bank = requestExamBank(request);
  if (!bank) return new Response(null, { status: 400 });
  const access = await physicsExamAccess(bank.courseId);
  if (access !== 200) return new Response(null, { status: access });
  try { bank = await getLiveExamBank(bank.key); }
  catch { return NextResponse.json({ error: 'No se pudo cargar el banco.' }, { status: 503 }); }
  const id = new URL(request.url).searchParams.get('id');
  const q = bank.questions.find(q => q.id === id && q.status === 'reviewed');
  if (!q) return new Response(null, { status: 404 });
  const { data, error } = await createAdminClient().storage.from('admin-worksheets').download(q.assetPath);
  if (error || !data) return NextResponse.json({ error: 'No se pudo cargar la pregunta.' }, { status: 503 });
  return new Response(data, { headers: { 'Content-Type': 'image/jpeg', 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' } });
}
