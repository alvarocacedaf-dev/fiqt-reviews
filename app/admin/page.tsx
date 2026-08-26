import Link from 'next/link';
import { requireAdmin } from '@/lib/admin';

type StorageUsageRow = {
  bucket_id: string;
  object_count: number;
  total_bytes: number;
};

type CleanupStatusRow = {
  pending_jobs: number;
  failed_jobs: number;
  completed_jobs: number;
  last_activity_at: string | null;
  last_error: string | null;
};

function formatBytes(bytes: number) {
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
  if (bytes >= 1024 ** 2) return `${(bytes / 1024 ** 2).toFixed(2)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${bytes} bytes`;
}

export default async function Admin() {
  const { db } = await requireAdmin();
  const [reviews, verifications, reviewReports, chatReports, storageUsageResult, cleanupStatusResult] = await Promise.all([
    db.from('reviews').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    db
      .from('verification_submissions')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending'),
    db.from('review_reports').select('*', { count: 'exact', head: true }),
    db
      .from('chat_reports')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending'),
    db.rpc('admin_storage_usage'),
    db.rpc('admin_chat_cleanup_status'),
  ]);
  const storageUsage = (storageUsageResult.data ?? []) as StorageUsageRow[];
  const totalStorageBytes = storageUsage.reduce(
    (total, bucket) => total + Number(bucket.total_bytes),
    0,
  );
  const totalStorageFiles = storageUsage.reduce(
    (total, bucket) => total + Number(bucket.object_count),
    0,
  );
  const cleanupStatus = ((cleanupStatusResult.data ?? []) as CleanupStatusRow[])[0];
  const cards = [
    ['Reseñas pendientes', reviews.count, '/admin/resenas'],
    ['Verificaciones pendientes', verifications.count, '/admin/verificaciones'],
    ['Reportes de reseñas', reviewReports.count, '/admin/resenas'],
    ['Reportes de chats pendientes', chatReports.count, '/admin/reportes-chats'],
  ];

  return (
    <div className="panel">
      <h1 className="text-3xl font-black text-ink">Panel básico</h1>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(([name, count, href]) => (
          <Link
            className="surface-card-interactive border-blue-100 bg-blue-50 p-5"
            href={href as string}
            key={name as string}
          >
            <p className="text-sm text-slate-600">{name}</p>
            <p className="text-3xl font-black text-royal">{count ?? 0}</p>
          </Link>
        ))}
      </div>

      <section className="surface-muted mt-6 border-blue-100 bg-blue-50 p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-sm text-slate-600">Almacenamiento utilizado</p>
            <p className="text-3xl font-black text-royal">{formatBytes(totalStorageBytes)}</p>
          </div>
          <p className="text-sm font-bold text-slate-600">{totalStorageFiles} archivos</p>
        </div>

        {storageUsageResult.error ? (
          <p className="mt-3 text-sm font-bold text-amber-800">
            Aplica la migración 023 para consultar el almacenamiento desde este panel.
          </p>
        ) : (
          <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            {storageUsage.map(bucket => (
              <div className="surface-muted bg-white p-3" key={bucket.bucket_id}>
                <p className="truncate text-xs font-bold text-slate-500">{bucket.bucket_id}</p>
                <p className="mt-1 font-black text-ink">{formatBytes(Number(bucket.total_bytes))}</p>
                <p className="text-xs text-slate-500">{bucket.object_count} archivos</p>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="surface-muted mt-6 p-5">
        <h2 className="text-xl font-black text-ink">Limpieza automática de chats</h2>
        {cleanupStatusResult.error ? (
          <p className="mt-3 text-sm font-bold text-amber-800">
            Aplica la migración 029 para consultar y reintentar el estado de limpieza.
          </p>
        ) : (
          <>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div className="surface-muted bg-white p-4">
                <p className="text-xs font-bold text-slate-500">Pendientes</p>
                <p className="text-2xl font-black text-royal">{cleanupStatus?.pending_jobs ?? 0}</p>
              </div>
              <div className="surface-muted bg-white p-4">
                <p className="text-xs font-bold text-slate-500">Con fallo, se reintentarán</p>
                <p className="text-2xl font-black text-red-700">{cleanupStatus?.failed_jobs ?? 0}</p>
              </div>
              <div className="surface-muted bg-white p-4">
                <p className="text-xs font-bold text-slate-500">Completados</p>
                <p className="text-2xl font-black text-emerald-700">{cleanupStatus?.completed_jobs ?? 0}</p>
              </div>
            </div>
            {cleanupStatus?.last_activity_at && (
              <p className="mt-3 text-xs font-semibold text-slate-500">
                Última actividad: {new Intl.DateTimeFormat('es-PE', {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                  timeZone: 'America/Lima',
                }).format(new Date(cleanupStatus.last_activity_at))}
              </p>
            )}
            {cleanupStatus?.last_error && (
              <p className="mt-3 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-800">
                Último fallo: {cleanupStatus.last_error}
              </p>
            )}
          </>
        )}
      </section>
    </div>
  );
}
