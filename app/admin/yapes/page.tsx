import Link from 'next/link';
import { AdminEmptyState } from '@/components/AdminEmptyState';
import { requireAdmin } from '@/lib/admin';
import { moderateContribution } from './actions';

const PAGE_SIZE = 24;

type PageProps = {
  searchParams: Promise<{ error?: string; page?: string; status?: string; success?: string }>;
};

type Contribution = {
  amount: number;
  created_at: string;
  id: string;
  receipt_path: string;
  reviewed_at: string | null;
  status: 'approved' | 'pending' | 'rejected';
  user_id: string;
};

type Profile = {
  full_name: string | null;
  id: string;
  student_code: string | null;
};

const statusLabels = {
  approved: 'Aprobado',
  pending: 'Pendiente',
  rejected: 'Rechazado',
} as const;

const statusClasses = {
  approved: 'bg-emerald-100 text-emerald-800',
  pending: 'bg-amber-100 text-amber-800',
  rejected: 'bg-red-100 text-red-800',
} as const;

export default async function AdminYapesPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const status = ['approved', 'pending', 'rejected'].includes(params.status ?? '')
    ? params.status as Contribution['status']
    : 'all';
  const { db } = await requireAdmin();
  const from = (page - 1) * PAGE_SIZE;

  let request = db
    .from('contribution_submissions')
    .select('id,user_id,receipt_path,amount,status,reviewed_at,created_at', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, from + PAGE_SIZE - 1);
  if (status !== 'all') request = request.eq('status', status);

  const { data: rawItems, count, error: queryError } = await request;
  const items = (rawItems ?? []) as Contribution[];
  const userIds = [...new Set(items.map(item => item.user_id))];
  const { data: rawProfiles } = userIds.length
    ? await db.from('profiles').select('id,full_name,student_code').in('id', userIds)
    : { data: [] };
  const profiles = Object.fromEntries(
    ((rawProfiles ?? []) as Profile[]).map(profile => [profile.id, profile]),
  );

  const signedUrls = Object.fromEntries(
    await Promise.all(items.map(async item => {
      const { data } = await db.storage
        .from('contribution-evidence')
        .createSignedUrl(item.receipt_path, 600);
      return [item.id, data?.signedUrl ?? null];
    })),
  ) as Record<string, string | null>;

  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const filterHref = (nextStatus: string, nextPage = 1) => {
    const query = new URLSearchParams();
    if (nextStatus !== 'all') query.set('status', nextStatus);
    if (nextPage > 1) query.set('page', String(nextPage));
    const value = query.toString();
    return `/admin/yapes${value ? `?${value}` : ''}`;
  };

  return (
    <div className="space-y-6">
      <header className="panel">
        <p className="text-sm font-black uppercase tracking-[0.14em] text-royal">Administración</p>
        <h1 className="mt-1 text-3xl font-black text-ink">Yapes</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
          Revisa los comprobantes enviados desde “Aporte a la página”. Las imágenes permanecen privadas y los enlaces
          de visualización caducan automáticamente.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          {(['all', 'pending', 'approved', 'rejected'] as const).map(value => (
            <Link
              key={value}
              className={`rounded-full px-4 py-2 text-sm font-bold transition ${status === value ? 'bg-royal text-white' : 'bg-blue-50 text-royal hover:bg-blue-100'}`}
              href={filterHref(value)}
            >
              {value === 'all' ? 'Todos' : statusLabels[value]}
            </Link>
          ))}
        </div>
      </header>

      {params.error && <p className="rounded-xl bg-red-50 p-4 text-sm font-bold text-red-800">{params.error}</p>}
      {params.success && <p className="rounded-xl bg-emerald-50 p-4 text-sm font-bold text-emerald-800">{params.success}</p>}
      {queryError && <p className="rounded-xl bg-red-50 p-4 text-sm font-bold text-red-800">No se pudieron cargar los comprobantes: {queryError.message}</p>}

      <section className="grid gap-5 xl:grid-cols-2">
        {items.map(item => {
          const profile = profiles[item.user_id];
          const url = signedUrls[item.id];
          return (
            <article key={item.id} className="surface-card overflow-hidden">
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 bg-slate-50 px-5 py-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-wider text-royal">Comprobante de aporte</p>
                  <h2 className="mt-1 text-lg font-black text-ink">{profile?.full_name || 'Estudiante sin nombre'}</h2>
                  <p className="mt-1 text-xs text-slate-500">Código: {profile?.student_code || 'No registrado'}</p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-black ${statusClasses[item.status]}`}>
                  {statusLabels[item.status]}
                </span>
              </div>

              <div className="p-5">
                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
                  {url ? (
                    <a href={url} target="_blank" rel="noreferrer" title="Abrir comprobante completo">
                      <img className="h-72 w-full object-contain" src={url} alt={`Comprobante enviado por ${profile?.full_name || 'estudiante'}`} />
                    </a>
                  ) : (
                    <div className="flex h-72 items-center justify-center p-6 text-center text-sm font-semibold text-red-700">
                      No se pudo generar el enlace privado de esta imagen.
                    </div>
                  )}
                </div>

                <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                  <div className="rounded-xl bg-blue-50 p-3"><dt className="font-bold text-slate-500">Monto declarado</dt><dd className="mt-1 font-black text-ink">S/ {Number(item.amount).toFixed(2)}</dd></div>
                  <div className="rounded-xl bg-blue-50 p-3"><dt className="font-bold text-slate-500">Enviado</dt><dd className="mt-1 font-black text-ink">{new Date(item.created_at).toLocaleString('es-PE')}</dd></div>
                </dl>

                {item.status === 'pending' ? (
                  <form action={moderateContribution} className="mt-4 flex flex-wrap gap-3">
                    <input type="hidden" name="id" value={item.id} />
                    <button className="btn-primary" name="status" value="approved">Aprobar aporte</button>
                    <button className="btn-secondary border-red-200 text-red-700 hover:bg-red-50" name="status" value="rejected">Rechazar</button>
                    {url && <a className="btn-secondary" href={url} target="_blank" rel="noreferrer">Abrir imagen</a>}
                  </form>
                ) : (
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                    <p className="text-xs text-slate-500">Revisado: {item.reviewed_at ? new Date(item.reviewed_at).toLocaleString('es-PE') : 'Sin fecha'}</p>
                    {url && <a className="btn-secondary" href={url} target="_blank" rel="noreferrer">Abrir imagen</a>}
                  </div>
                )}
              </div>
            </article>
          );
        })}
      </section>

      {!queryError && !items.length && (
        <AdminEmptyState
          description="Los comprobantes aparecerán aquí cuando los estudiantes los envíen desde Aporte a la página."
          icon="attachment"
          title="No hay comprobantes en esta categoría"
        />
      )}

      {totalPages > 1 && (
        <nav aria-label="Paginación de comprobantes" className="flex items-center justify-center gap-3">
          {page > 1 && <Link className="btn-secondary" href={filterHref(status, page - 1)}>Anterior</Link>}
          <span className="text-sm font-bold text-white">Página {page} de {totalPages} · {total} comprobantes</span>
          {page < totalPages && <Link className="btn-secondary" href={filterHref(status, page + 1)}>Siguiente</Link>}
        </nav>
      )}
    </div>
  );
}
