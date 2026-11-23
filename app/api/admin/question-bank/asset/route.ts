import { getAdminApiContext } from '@/lib/adminApi';
import { createAdminClient } from '@/lib/supabase/admin';
import type { QuestionPage } from '@/lib/questionBankReview';
export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  const context = await getAdminApiContext();
  if ('error' in context) return new Response(null, { status: context.status });
  if (!context.isOwner) return new Response(null, { status: 403 });
  const params = new URL(request.url).searchParams;
  const db = createAdminClient();
  let path: string | undefined;
  if (params.has('question')) {
    const result = await db.from('exam_bank_questions').select('question').eq('id', params.get('question')).maybeSingle();
    path = result.data?.question?.assetPath;
  } else {
    const result = await db.from('exam_bank_jobs').select('pages').eq('id', params.get('job')).maybeSingle();
    path = (result.data?.pages as QuestionPage[] | undefined)?.find(p => p.page === Number(params.get('page')))?.path;
  }
  if (!path) return new Response(null, { status: 404 });
  const { data, error } = await db.storage.from('admin-worksheets').download(path);
  if (error || !data) return new Response(null, { status: 503 });
  return new Response(data, { headers: { 'Content-Type': 'image/jpeg', 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' } });
}
