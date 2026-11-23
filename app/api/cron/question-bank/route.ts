import { processExamBankQueue } from '@/lib/questionBankWorker';
export const runtime = 'nodejs';
export const maxDuration = 300;
export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  if (!process.env.CRON_SECRET || request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) return new Response(null, { status: 401 });
  await processExamBankQueue();
  return Response.json({ ok: true });
}
