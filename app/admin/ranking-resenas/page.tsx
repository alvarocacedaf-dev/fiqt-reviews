import { AdminEmptyState } from '@/components/AdminEmptyState';
import { Pagination } from '@/components/Pagination';
import { requireAdmin } from '@/lib/admin';
import { getPagination } from '@/lib/pagination';

type PageProps = { searchParams: Promise<{ page?: string }> };
type ReviewRow = { user_id: string | null; created_at: string };
type Profile = { id: string; full_name: string | null; student_code: string | null };
type RankingEntry = {
  userId: string;
  count: number;
  reachedAt: string;
  profile?: Profile;
};

const DATABASE_PAGE_SIZE = 1000;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function loadApprovedReviews(db: Awaited<ReturnType<typeof requireAdmin>>['db']) {
  const rows: ReviewRow[] = [];

  for (let from = 0; ; from += DATABASE_PAGE_SIZE) {
    const { data, error } = await db
      .from('reviews')
      .select('user_id,created_at')
      .eq('status', 'approved')
      .not('user_id', 'is', null)
      .order('created_at', { ascending: true })
      .range(from, from + DATABASE_PAGE_SIZE - 1);

    if (error) return { rows, error };
    const page = (data ?? []) as ReviewRow[];
    rows.push(...page);
    if (page.length < DATABASE_PAGE_SIZE) return { rows, error: null };
  }
}

export default async function ReviewRankingPage({ searchParams }: PageProps) {
  const query = await searchParams;
  const pagination = getPagination(query.page);
  const { db } = await requireAdmin();
  const { rows, error } = await loadApprovedReviews(db);

  const totals = new Map<string, Omit<RankingEntry, 'profile'>>();
  for (const review of rows) {
    if (!review.user_id || !UUID_PATTERN.test(review.user_id)) continue;
    const current = totals.get(review.user_id);
    totals.set(review.user_id, {
      userId: review.user_id,
      count: (current?.count ?? 0) + 1,
      // Las filas vienen en orden ascendente: esta fecha es cuando completó su total actual.
      reachedAt: review.created_at,
    });
  }

  const ordered = [...totals.values()].sort((left, right) => (
    right.count - left.count
    || left.reachedAt.localeCompare(right.reachedAt)
    || left.userId.localeCompare(right.userId)
  ));
  const pagedEntries = ordered.slice(pagination.from, pagination.to + 1);
  const userIds = pagedEntries.map(entry => entry.userId);
  const profiles: Profile[] = [];
  let profilesError: { message: string } | null = null;

  for (let index = 0; index < userIds.length; index += 100) {
    const result = await db
      .from('profiles')
      .select('id,full_name,student_code')
      .in('id', userIds.slice(index, index + 100));
    if (result.error) {
      profilesError = result.error;
      break;
    }
    profiles.push(...((result.data ?? []) as Profile[]));
  }

  const profilesById = Object.fromEntries(profiles.map(profile => [profile.id, profile]));
  const ranking: RankingEntry[] = pagedEntries.map(entry => ({
    ...entry,
    profile: profilesById[entry.userId],
  }));
  const queryError = error || profilesError;

  return (
    <div className="space-y-6">
      <header className="panel">
        <p className="text-sm font-black uppercase tracking-wider text-royal">Usuarios</p>
        <h1 className="mt-1 text-3xl font-black text-ink">Ranking de reseñas</h1>
        <p className="mt-2 text-sm text-slate-600">
          Cantidad de reseñas aprobadas por usuario. No se muestra el contenido de ninguna reseña.
          En caso de empate, aparece primero quien alcanzó antes su total actual.
        </p>
        {queryError && (
          <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm font-bold text-red-800">{queryError.message}</p>
        )}
      </header>

      {!queryError && ranking.length > 0 && (
        <section className="surface-card overflow-hidden" aria-label="Clasificación de usuarios por reseñas">
          <div className="divide-y divide-slate-200">
            {ranking.map((entry, index) => {
              const position = pagination.from + index + 1;
              return (
                <article className="flex items-center gap-4 px-5 py-4 sm:px-6" key={entry.userId}>
                  <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-full text-lg font-black ${
                    position === 1
                      ? 'bg-gold text-ink'
                      : position <= 3
                        ? 'bg-blue-100 text-royal'
                        : 'bg-slate-100 text-slate-600'
                  }`} aria-label={`Puesto ${position}`}>
                    {position}
                  </span>
                  <div className="min-w-0 flex-1">
                    <h2 className="truncate font-black text-ink">{entry.profile?.full_name || 'Estudiante sin nombre'}</h2>
                    <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                      {entry.profile?.student_code && <span>Código: {entry.profile.student_code}</span>}
                      <span>Alcanzó este total: {new Date(entry.reachedAt).toLocaleString('es-PE')}</span>
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-3xl font-black leading-none text-royal">{entry.count}</p>
                    <p className="mt-1 text-xs font-bold text-slate-500">reseña{entry.count === 1 ? '' : 's'}</p>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}

      {!queryError && !ordered.length && (
        <AdminEmptyState
          description="Los usuarios aparecerán cuando tengan al menos una reseña aprobada."
          icon="star"
          title="Todavía no hay reseñas aprobadas"
        />
      )}

      {!queryError && (
        <Pagination
          currentPage={pagination.page}
          pageSize={pagination.pageSize}
          pathname="/admin/ranking-resenas"
          totalItems={ordered.length}
        />
      )}
    </div>
  );
}
