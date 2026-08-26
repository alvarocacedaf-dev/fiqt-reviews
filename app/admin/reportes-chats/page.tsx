import { requireAdmin } from '@/lib/admin';
import { Pagination } from '@/components/Pagination';
import { getPagination } from '@/lib/pagination';
import { updateChatReportStatus } from './actions';

type PageProps = {
  searchParams: Promise<{ error?: string; page?: string; success?: string }>;
};

type ChatReport = {
  id: string;
  thread_id: string;
  reporter_id: string;
  description: string;
  status: 'pending' | 'reviewed' | 'dismissed';
  created_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
  reviewed_by_label: string | null;
  report_type: 'harassment' | 'fraud' | 'other' | null;
  resolution: 'founded' | 'unfounded' | null;
};

type Attachment = {
  id: string;
  report_id: string;
  storage_path: string;
  original_name: string;
  mime_type: string;
  file_size: number;
};

type Thread = {
  id: string;
  user_a_id: string | null;
  user_b_id: string | null;
  ended_at: string | null;
};

type Profile = {
  id: string;
  full_name: string | null;
  student_code: string | null;
};

const statusStyles = {
  pending: 'bg-amber-100 text-amber-800',
  reviewed: 'bg-emerald-100 text-emerald-800',
  dismissed: 'bg-slate-200 text-slate-700',
};

const statusLabels = {
  pending: 'Pendiente',
  reviewed: 'Revisado',
  dismissed: 'Descartado',
};

const reportTypeLabels = {
  harassment: 'Acoso',
  fraud: 'Fraude',
  other: 'Otros',
};

const resolutionLabels = {
  founded: 'Fundado',
  unfounded: 'Infundado',
};

function formatDate(value: string | null) {
  if (!value) return 'Sin fecha';
  return new Intl.DateTimeFormat('es-PE', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'America/Lima',
  }).format(new Date(value));
}

function formatBytes(value: number) {
  return `${(value / 1024 / 1024).toFixed(2)} MB`;
}

function privateName(name?: string | null) {
  const parts = name?.trim().split(/\s+/).filter(Boolean) ?? [];
  if (!parts.length) return 'Usuario';
  if (parts.length === 1) return parts[0];
  return `${parts[0]}.${parts[1][0].toUpperCase()}`;
}

export default async function AdminChatReportsPage({ searchParams }: PageProps) {
  const query = await searchParams;
  const { error: messageError, success } = query;
  const pagination = getPagination(query.page);
  const { db } = await requireAdmin();
  const { data: rawReports, error: reportsError, count } = await db
    .from('chat_reports')
    .select('id,thread_id,reporter_id,description,status,created_at,reviewed_at,reviewed_by,reviewed_by_label,report_type,resolution', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(pagination.from, pagination.to);

  const reports = (rawReports ?? []) as ChatReport[];
  const reportIds = reports.map(report => report.id);
  const threadIds = [...new Set(reports.map(report => report.thread_id))];

  const [
    { data: rawAttachments, error: attachmentsError },
    { data: rawThreads, error: threadsError },
  ] = await Promise.all([
    reportIds.length
      ? db
        .from('chat_report_attachments')
        .select('id,report_id,storage_path,original_name,mime_type,file_size')
        .in('report_id', reportIds)
        .order('created_at')
      : Promise.resolve({ data: [], error: null }),
    threadIds.length
      ? db
        .from('chat_threads')
        .select('id,user_a_id,user_b_id,ended_at')
        .in('id', threadIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  const attachments = (rawAttachments ?? []) as Attachment[];
  const threads = (rawThreads ?? []) as Thread[];
  const userIds = [
    ...new Set([
      ...reports.flatMap(report => [report.reporter_id, report.reviewed_by].filter(Boolean)),
      ...threads.flatMap(thread => [thread.user_a_id, thread.user_b_id].filter(Boolean)),
    ] as string[]),
  ];
  const { data: rawProfiles, error: profilesError } = userIds.length
    ? await db.from('profiles').select('id,full_name,student_code').in('id', userIds)
    : { data: [], error: null };

  const profiles = Object.fromEntries(
    ((rawProfiles ?? []) as Profile[]).map(profile => [profile.id, profile]),
  );
  const threadsById = Object.fromEntries(threads.map(thread => [thread.id, thread]));
  const attachmentsByReport = Object.groupBy(
    attachments,
    attachment => attachment.report_id,
  );
  const signedUrls = Object.fromEntries(
    await Promise.all(
      attachments.map(async attachment => {
        const { data } = await db.storage
          .from('chat-report-evidence')
          .createSignedUrl(attachment.storage_path, 3600);
        return [attachment.id, data?.signedUrl ?? '#'];
      }),
    ),
  );
  const queryError = reportsError || attachmentsError || threadsError || profilesError;
  const pendingCount = reports.filter(report => report.status === 'pending').length;
  const reviewedCount = reports.filter(report => report.status === 'reviewed').length;
  const dismissedCount = reports.filter(report => report.status === 'dismissed').length;

  return (
    <div className="space-y-6">
      <header className="panel">
        <p className="text-sm font-black text-royal">ADMINISTRACIÓN</p>
        <h1 className="mt-1 text-3xl font-black text-ink">Reportes de los chats</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
          Revisa los problemas comunicados por los usuarios junto con la descripción y las
          fotografías que adjuntaron como evidencia.
        </p>

        <div className="mt-5 flex flex-wrap gap-3">
          <span className="rounded-full bg-amber-100 px-4 py-2 text-sm font-black text-amber-800">
            {pendingCount} pendiente{pendingCount === 1 ? '' : 's'}
          </span>
          <span className="rounded-full bg-emerald-100 px-4 py-2 text-sm font-black text-emerald-800">
            {reviewedCount} revisado{reviewedCount === 1 ? '' : 's'}
          </span>
          <span className="rounded-full bg-slate-200 px-4 py-2 text-sm font-black text-slate-700">
            {dismissedCount} descartado{dismissedCount === 1 ? '' : 's'}
          </span>
        </div>

        {success && (
          <p className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm font-bold text-emerald-800">
            {success}
          </p>
        )}
        {(messageError || queryError) && (
          <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm font-bold text-red-800">
            {messageError || queryError?.message}
          </p>
        )}
      </header>

      {reports.map(report => {
        const reporter = profiles[report.reporter_id];
        const thread = threadsById[report.thread_id];
        const counterpartId = thread?.user_a_id === report.reporter_id
          ? thread.user_b_id
          : thread?.user_a_id;
        const counterpart = counterpartId ? profiles[counterpartId] : undefined;
        const evidence = attachmentsByReport[report.id] ?? [];

        return (
          <details className="surface-card-interactive group overflow-hidden" key={report.id}>
            <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-5 bg-slate-50 px-6 py-5 [&::-webkit-details-marker]:hidden">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-black uppercase tracking-wider text-royal">
                  Reporte de chat
                </p>
                <h2 className="mt-1 text-xl font-black text-ink">
                  {privateName(reporter?.full_name)}
                </h2>
                <div className="mt-1 space-y-0.5 text-xs text-slate-500">
                  {reporter?.student_code && <p>Código: {reporter.student_code}</p>}
                  <p className="break-all">ID de la cuenta: {report.reporter_id}</p>
                  <p>Enviado: {formatDate(report.created_at)}</p>
                </div>
              </div>

              <div className="min-w-52 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3">
                <p className="text-xs font-black uppercase tracking-wider text-royal">
                  Chat relacionado
                </p>
                <p className="mt-1 text-sm font-black text-ink">
                  Con {privateName(counterpart?.full_name)}
                </p>
              </div>

              <div className="flex min-w-32 flex-col items-end gap-2">
                <span className={`rounded-full px-4 py-2 text-xs font-black ${statusStyles[report.status]}`}>
                  {statusLabels[report.status]}
                </span>
                <span className="text-xs font-black text-royal">
                  <span className="group-open:hidden">Ver reporte ↓</span>
                  <span className="hidden group-open:inline">Ocultar reporte ↑</span>
                </span>
              </div>
            </summary>

            <div className="grid gap-6 border-t border-slate-200 p-6 lg:grid-cols-[minmax(0,1fr)_280px]">
              <div>
                <p className="text-xs font-black uppercase tracking-wider text-royal">
                  ¿Qué sucedió?
                </p>
                <p className="mt-2 whitespace-pre-wrap rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-700">
                  {report.description}
                </p>

                <p className="mt-6 text-xs font-black uppercase tracking-wider text-royal">
                  Fotografías adjuntas ({evidence.length})
                </p>
                <div className="mt-3 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {evidence.map(attachment => (
                    <a
                      className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50"
                      href={signedUrls[attachment.id]}
                      key={attachment.id}
                      rel="noreferrer"
                      target="_blank"
                    >
                      <img
                        alt={`Evidencia ${attachment.original_name}`}
                        className="h-48 w-full object-cover"
                        src={signedUrls[attachment.id]}
                      />
                      <div className="p-3">
                        <p className="truncate text-sm font-bold text-ink">
                          {attachment.original_name}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {formatBytes(attachment.file_size)}
                        </p>
                      </div>
                    </a>
                  ))}
                </div>
              </div>

              <aside className="space-y-4">
                <section className="rounded-2xl border border-slate-200 bg-blue-50 p-4 text-xs text-slate-600">
                  <p className="text-xs font-black uppercase tracking-wider text-royal">
                    Información del chat
                  </p>
                  <p className="mt-2">
                    Finalizado: {formatDate(thread?.ended_at ?? null)}
                  </p>
                  <p className="mt-1 break-all text-slate-500">
                    ID: {report.thread_id}
                  </p>
                </section>

                {report.reviewed_at && (
                  <section className="rounded-2xl bg-slate-100 p-4 text-xs text-slate-600">
                    <p>Última revisión: {formatDate(report.reviewed_at)}</p>
                    {report.report_type && (
                      <p className="mt-1">
                        Tipo: <strong>{reportTypeLabels[report.report_type]}</strong>
                      </p>
                    )}
                    {report.resolution && (
                      <p className="mt-1">
                        Conclusión: <strong>{resolutionLabels[report.resolution]}</strong>
                      </p>
                    )}
                    {(report.reviewed_by_label || report.reviewed_by) && (
                      <p className="mt-1">
                        Por: {report.reviewed_by_label
                          || privateName(profiles[report.reviewed_by as string]?.full_name)}
                      </p>
                    )}
                  </section>
                )}

                <div className="grid gap-2">
                  {report.status !== 'reviewed' && (
                    <form action={updateChatReportStatus} className="grid gap-4">
                      <input name="report_id" type="hidden" value={report.id} />
                      <input name="status" type="hidden" value="reviewed" />

                      <label className="grid gap-2 text-sm font-black text-ink">
                        Tipo de reporte:
                        <select className="input" defaultValue="" name="report_type" required>
                          <option disabled value="">Selecciona una opción</option>
                          <option value="harassment">Acoso</option>
                          <option value="fraud">Fraude</option>
                          <option value="other">Otros</option>
                        </select>
                      </label>

                      <fieldset className="grid gap-2">
                        <legend className="text-sm font-black text-ink">Conclusión:</legend>
                        <label className="flex items-center gap-2 text-sm font-bold text-slate-700">
                          <input name="resolution" required type="radio" value="founded" />
                          Fundado
                        </label>
                        <label className="flex items-center gap-2 text-sm font-bold text-slate-700">
                          <input name="resolution" required type="radio" value="unfounded" />
                          Infundado
                        </label>
                      </fieldset>

                      <label className="grid gap-2 text-sm font-black text-ink">
                        Código del asistente:
                        <input
                          autoComplete="off"
                          className="input"
                          name="action_code"
                          placeholder="Código del asistente"
                          required
                          type="password"
                        />
                      </label>

                      <button className="btn-primary w-full" type="submit">
                        Marcar como revisado
                      </button>
                    </form>
                  )}
                  {report.status !== 'pending' && (
                    <form action={updateChatReportStatus}>
                      <input name="report_id" type="hidden" value={report.id} />
                      <input name="status" type="hidden" value="pending" />
                      <button
                        className="w-full px-4 py-2 text-sm font-bold text-royal"
                        type="submit"
                      >
                        Devolver a pendientes
                      </button>
                    </form>
                  )}
                </div>
              </aside>
            </div>
          </details>
        );
      })}

      {!reports.length && !queryError && (
        <div className="panel text-center">
          <p className="text-xl font-black text-ink">Todavía no se recibieron reportes de chats.</p>
          <p className="mt-2 text-sm text-slate-600">
            Los reportes enviados por los usuarios aparecerán aquí automáticamente.
          </p>
        </div>
      )}
      <Pagination
        currentPage={pagination.page}
        pageSize={pagination.pageSize}
        pathname="/admin/reportes-chats"
        searchParams={{ error: messageError, success }}
        totalItems={count ?? 0}
      />
    </div>
  );
}
