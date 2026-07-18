import { requireAdmin } from '@/lib/admin';
import { ReviewModerationForm } from '@/components/ReviewModerationForm';

export default async function AdminReviews() {
  const { db } = await requireAdmin();
  const { data } = await db
    .from('reviews')
    .select('*, professors(full_name), courses(name)')
    .eq('status', 'pending')
    .order('created_at');

  return <div className="panel"><h1 className="text-2xl font-black text-ink">Reseñas pendientes</h1><div className="mt-5 space-y-4">{data?.map((r: any) => <article key={r.id} className="rounded-2xl border p-4"><p className="font-bold">{r.professors?.full_name} — {r.courses?.name}</p><p className="mt-2 text-sm">{r.comment}</p><p className="mt-2 text-xs text-slate-500">Tags: {r.selected_tags?.join(', ')}</p><ReviewModerationForm reviewId={r.id} professorId={r.professor_id} /></article>)}{!data?.length && <p>No hay reseñas pendientes.</p>}</div></div>;
}
