import { requireAdmin } from '@/lib/admin';

type ObservedReview = {
  id: string;
  user_id: string;
  status: 'approved' | 'rejected';
  comment: string;
  moderation_reason: string | null;
  moderated_by_label: string | null;
  recommendation: 'like' | 'dislike';
  selected_tags: string[] | null;
  clarity_rating: number;
  difficulty_rating: number;
  fairness_rating: number;
  treatment_rating: number;
  workload_rating: number;
  created_at: string;
  courses: { code: string | null; name: string } | { code: string | null; name: string }[] | null;
  professors: { full_name: string } | { full_name: string }[] | null;
};

type Profile = {
  id: string;
  full_name: string | null;
  student_code: string | null;
};

function firstRelation<T>(relation: T | T[] | null): T | null {
  return Array.isArray(relation) ? relation[0] ?? null : relation;
}

export default async function ObservedReviewsPage() {
  const { db } = await requireAdmin();
  const { data: rawReviews, error } = await db
    .from('reviews')
    .select(`
      id,user_id,status,comment,moderation_reason,moderated_by_label,recommendation,selected_tags,
      clarity_rating,difficulty_rating,fairness_rating,treatment_rating,workload_rating,created_at,
      courses(code,name),professors(full_name)
    `)
    .in('status', ['approved', 'rejected'])
    .order('created_at', { ascending: false });

  const reviews = (rawReviews ?? []) as unknown as ObservedReview[];
  const userIds = [...new Set(reviews.map(review => review.user_id))];
  const { data: rawProfiles } = userIds.length
    ? await db.from('profiles').select('id,full_name,student_code').in('id', userIds)
    : { data: [] };
  const profiles = Object.fromEntries(((rawProfiles ?? []) as Profile[]).map(profile => [profile.id, profile]));
  const reviewsByUser = reviews.reduce<Record<string, ObservedReview[]>>((groups, review) => {
    (groups[review.user_id] ??= []).push(review);
    return groups;
  }, {});

  return (
    <div className="space-y-6">
      <header className="panel">
        <p className="text-sm font-black text-royal">ADMINISTRACIÓN</p>
        <h1 className="mt-1 text-3xl font-black text-ink">Reseñas ya observadas</h1>
        <p className="mt-2 text-sm text-slate-600">
          Historial de reseñas que ya fueron aprobadas o rechazadas, agrupadas por cuenta.
        </p>
        {error && <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm font-bold text-red-700">No se pudieron cargar las reseñas: {error.message}</p>}
      </header>

      {Object.entries(reviewsByUser).map(([userId, accountReviews]) => {
        const profile = profiles[userId];
        const approvedCount = accountReviews.filter(review => review.status === 'approved').length;
        const rejectedCount = accountReviews.length - approvedCount;
        return (
          <details key={userId} className="group overflow-hidden rounded-3xl bg-white shadow-card">
            <summary className="cursor-pointer list-none bg-slate-50 px-6 py-5">
              <p className="text-xs font-black uppercase tracking-wider text-royal">Cuenta</p>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-2xl font-black text-ink">{profile?.full_name || 'Estudiante sin nombre'}</h2>
                <span className="text-sm font-black text-royal">
                  <span className="group-open:hidden">Ver reseñas ↓</span>
                  <span className="hidden group-open:inline">Ocultar reseñas ↑</span>
                </span>
              </div>
              <div className="mt-2 flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-600">
                {profile?.student_code && <span>Código: {profile.student_code}</span>}
                <span>ID: {userId}</span>
                <span>{accountReviews.length} reseña{accountReviews.length === 1 ? '' : 's'}</span>
                <span className="font-bold text-emerald-700">{approvedCount} aprobada{approvedCount === 1 ? '' : 's'}</span>
                <span className="font-bold text-red-700">{rejectedCount} rechazada{rejectedCount === 1 ? '' : 's'}</span>
              </div>
            </summary>

            <div className="grid gap-5 border-t border-slate-200 p-6 xl:grid-cols-2">
              {accountReviews.map(review => {
                const course = firstRelation(review.courses);
                const professor = firstRelation(review.professors);
                const ratings = [review.clarity_rating, review.difficulty_rating, review.fairness_rating, review.treatment_rating, review.workload_rating];
                const average = ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length;
                return (
                  <article key={review.id} className="overflow-hidden rounded-2xl border border-slate-200">
                    <header className="flex flex-wrap items-start justify-between gap-3 bg-slate-50 px-5 py-4">
                      <div>
                        <p className="font-black text-royal">{course?.code || 'Sin código'} — {course?.name || 'Curso no encontrado'}</p>
                        <h3 className="font-bold text-ink">Profesor: {professor?.full_name || 'No encontrado'}</h3>
                        <p className="mt-1 text-xs text-slate-500">Enviada: {new Date(review.created_at).toLocaleString('es-PE')}</p>
                        <p className="mt-1 text-xs font-bold text-slate-600">Observada por: {review.moderated_by_label || 'Sin código registrado'}</p>
                      </div>
                      <span className={`rounded-full px-3 py-1 text-sm font-black ${review.status === 'approved' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                        {review.status === 'approved' ? 'Aprobada' : 'Rechazada'}
                      </span>
                    </header>

                    <div className="space-y-4 p-5">
                      <div className="flex flex-wrap gap-2 text-sm">
                        <span className="rounded-full bg-blue-50 px-3 py-1 font-black text-royal">Promedio: {average.toFixed(1)}/5</span>
                        <span className={`rounded-full px-3 py-1 font-bold ${review.recommendation === 'like' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                          {review.recommendation === 'like' ? 'Lo recomienda' : 'No lo recomienda'}
                        </span>
                      </div>

                      <p className="whitespace-pre-wrap text-sm text-slate-700">{review.comment || 'Sin comentario.'}</p>

                      {review.selected_tags?.length ? (
                        <div className="flex flex-wrap gap-2">
                          {review.selected_tags.map(tag => <span key={tag} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">{tag}</span>)}
                        </div>
                      ) : null}

                      {review.status === 'rejected' && (
                        <p className="rounded-xl bg-red-50 p-3 text-sm text-red-800">
                          <strong>Motivo del rechazo:</strong> {review.moderation_reason || 'No se registró un motivo.'}
                        </p>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          </details>
        );
      })}

      {!reviews.length && !error && (
        <div className="panel text-center">
          <p className="text-xl font-black text-ink">Todavía no hay reseñas aprobadas o rechazadas.</p>
        </div>
      )}
    </div>
  );
}
