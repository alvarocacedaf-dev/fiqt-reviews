import { after, NextResponse } from 'next/server';
import { getAdminApiContext } from '@/lib/adminApi';
import { createAdminClient } from '@/lib/supabase/admin';
import { processExamBankQueue } from '@/lib/questionBankWorker';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function GET(request: Request) {
  const context = await getAdminApiContext();
  if ('error' in context) return NextResponse.json({ error: context.error }, { status: context.status });
  if (!context.isOwner) return NextResponse.json({ error: 'Solo el propietario puede revisar el banco.' }, { status: 403 });
  const id = new URL(request.url).searchParams.get('id');
  const db = createAdminClient();
  if (id) {
    const { data: job, error } = await db.from('exam_bank_jobs').select('*,admin_worksheets(title,academic_term,file_name)').eq('id', id).maybeSingle();
    if (error) return NextResponse.json({ error: 'No se pudo consultar el procesamiento.' }, { status: 503 });
    if (!job) return NextResponse.json({ error: 'No existe.' }, { status: 404 });
    const result = await db.from('exam_bank_questions').select('*').eq('job_id', id).order('ordinal');
    if (result.error) return NextResponse.json({ error: 'No se pudieron leer los borradores.' }, { status: 503 });
    if (job.status === 'queued' || job.status === 'processing' && Date.parse(job.lease_until) < Date.now()) after(() => processExamBankQueue(id));
    return NextResponse.json({ job, questions: result.data }, { headers: { 'Cache-Control': 'private, no-store' } });
  }
  const result = await db.from('exam_bank_jobs').select('id,bank_key,status,error,warning,created_at,admin_worksheets(title)').order('created_at', { ascending: false }).limit(100);
  if (result.error) return NextResponse.json({ error: 'No se pudo leer el banco. Comprueba que se aplicaron las migraciones.' }, { status: 503 });
  after(() => processExamBankQueue());
  return NextResponse.json({ jobs: result.data }, { headers: { 'Cache-Control': 'private, no-store' } });
}

export async function POST(request: Request) {
  const context = await getAdminApiContext();
  if ('error' in context) return NextResponse.json({ error: context.error }, { status: context.status });
  if (!context.isOwner) return NextResponse.json({ error: 'Solo el propietario puede modificar el banco.' }, { status: 403 });
  const body = await request.json().catch(() => null);
  if (!body || typeof body.id !== 'string' || !['retry','add','finish'].includes(body.action)) return NextResponse.json({ error: 'Solicitud inválida.' }, { status: 400 });
  const db = createAdminClient();
  const { data: job } = await db.from('exam_bank_jobs').select('*').eq('id', body.id).maybeSingle();
  if (!job) return NextResponse.json({ error: 'No existe.' }, { status: 404 });
  if (body.action === 'retry') {
    const result = await db.from('exam_bank_jobs').update({ status: 'queued', error: null }).eq('id', job.id).in('status', ['failed','queued','waiting_pdf']).select('id');
    if (result.error || !result.data?.length) return NextResponse.json({ error: 'El examen ya se está procesando o revisando.' }, { status: 409 });
    after(() => processExamBankQueue(job.id));
  } else {
    const result = await db.rpc('review_exam_bank_job', { p_id: job.id, p_action: body.action });
    if (result.error) return NextResponse.json({ error: result.error.message }, { status: 409 });
  }
  return NextResponse.json({ ok: true });
}
