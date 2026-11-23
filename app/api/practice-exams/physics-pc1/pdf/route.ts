import { NextResponse } from 'next/server';
import { physicsExamAccess } from '@/lib/physicsExamAccess';
import { requestExamBank } from '@/lib/examQuestionBank';
import { createAdminClient } from '@/lib/supabase/admin';
import { buildPracticeExamPdf } from '@/lib/practiceExamPdf';
import { getLiveExamBank } from '@/lib/liveExamBank';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function POST(request: Request) {
  let bank = requestExamBank(request);
  if (!bank) return new Response(null, { status: 400 });
  const access = await physicsExamAccess(bank.courseId);
  if (access !== 200) return NextResponse.json({ error: 'Necesitas acceso a ' + bank.courseName + '.' }, { status: access });
  try { bank = await getLiveExamBank(bank.key); }
  catch { return NextResponse.json({ error: 'No se pudo cargar el banco.' }, { status: 503 }); }
  let ids: unknown;
  try { ids = (await request.json()).ids; } catch { return NextResponse.json({ error: 'Solicitud inválida.' }, { status: 400 }); }
  if (!Array.isArray(ids) || ids.length < 1 || ids.length > 6 || new Set(ids).size !== ids.length || ids.some(id => typeof id !== 'string')) return NextResponse.json({ error: 'Selección inválida.' }, { status: 400 });
  const questions = ids.map(id => bank.questions.find(q => q.id === id && q.status === 'reviewed'));
  if (questions.some(q => !q)) return NextResponse.json({ error: 'Pregunta no disponible.' }, { status: 400 });
  const db = createAdminClient();
  try {
    const bytes = await buildPracticeExamPdf(questions.filter(q => q !== undefined), async q => {
      const { data, error } = await db.storage.from('admin-worksheets').download(q.assetPath);
      if (error || !data) throw new Error('Pregunta no disponible');
      return new Uint8Array(await data.arrayBuffer());
    }, bank);
    return new Response(Buffer.from(bytes), { headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': 'attachment; filename="' + bank.filename + '"', 'Cache-Control': 'private, no-store' } });
  } catch { return NextResponse.json({ error: 'No se pudo preparar el PDF. Vuelve a intentarlo.' }, { status: 503 }); }
}
