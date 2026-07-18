import { requireAdmin } from '@/lib/admin';

type Submission = {
  id: string;
  user_id: string;
  file_url: string;
  status: 'pending' | 'approved' | 'rejected';
  admin_notes: string | null;
  created_at: string;
  reviewed_at: string | null;
};

type Profile = {
  id: string;
  full_name: string | null;
  student_code: string | null;
  verification_status: string;
};

type Approval = {
  submission_id: string;
  academic_term: string | null;
  section: string | null;
  courses: { code: string | null; name: string } | { code: string | null; name: string }[] | null;
  professors: { full_name: string } | { full_name: string }[] | null;
};

function firstRelation<T>(relation: T | T[] | null): T | null {
  return Array.isArray(relation) ? relation[0] ?? null : relation;
}

const statusStyle = {
  pending: 'bg-amber-100 text-amber-800',
  approved: 'bg-emerald-100 text-emerald-800',
  rejected: 'bg-red-100 text-red-800',
};

const statusText = {
  pending: 'Pendiente',
  approved: 'Aprobada',
  rejected: 'Rechazada',
};

const accountStatusText: Record<string, string> = {
  unverified: 'Sin verificar',
  pending: 'En revisión',
  verified: 'Cuenta verificada',
  rejected: 'Requiere cambios',
};

export default async function VerifiedAccountsPage() {
  const { db } = await requireAdmin();
  const [{ data: rawSubmissions }, { data: rawApprovals }] = await Promise.all([
    db.from('verification_submissions')
      .select('id,user_id,file_url,status,admin_notes,created_at,reviewed_at')
      .order('created_at', { ascending: false }),
    db.from('verification_submission_approvals')
      .select('submission_id,academic_term,section,courses(code,name),professors(full_name)'),
  ]);

  const submissions = (rawSubmissions ?? []) as Submission[];
  const userIds = [...new Set(submissions.map(item => item.user_id))];
  const { data: rawProfiles } = userIds.length
    ? await db.from('profiles').select('id,full_name,student_code,verification_status').in('id', userIds)
    : { data: [] };
  const profiles = Object.fromEntries(((rawProfiles ?? []) as Profile[]).map(profile => [profile.id, profile]));

  const approvalsBySubmission = ((rawApprovals ?? []) as unknown as Approval[]).reduce<Record<string, Approval[]>>(
    (groups, approval) => {
      (groups[approval.submission_id] ??= []).push(approval);
      return groups;
    },
    {},
  );

  const signedUrls = Object.fromEntries(await Promise.all(submissions.map(async item => [
    item.id,
    (await db.storage.from('verification-evidence').createSignedUrl(item.file_url, 3600)).data?.signedUrl ?? '#',
  ])));

  const submissionsByUser = submissions.reduce<Record<string, Submission[]>>((groups, submission) => {
    (groups[submission.user_id] ??= []).push(submission);
    return groups;
  }, {});

  return (
    <div className="space-y-6">
      <header className="panel">
        <p className="text-sm font-black text-royal">ADMINISTRACIÓN</p>
        <h1 className="mt-1 text-3xl font-black text-ink">Cuentas verificadas</h1>
        <p className="mt-2 text-sm text-slate-600">
          Historial de cuentas, evidencias enviadas, decisiones y cursos aprobados por cada foto.
        </p>
      </header>

      {Object.entries(submissionsByUser).map(([userId, accountSubmissions]) => {
        const profile = profiles[userId];
        return (
          <details key={userId} className="group overflow-hidden rounded-3xl bg-white shadow-card">
            <summary className="cursor-pointer list-none bg-slate-50 px-6 py-5">
              <p className="text-xs font-black uppercase tracking-wider text-royal">Cuenta</p>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-2xl font-black text-ink">{profile?.full_name || 'Estudiante sin nombre'}</h2>
                <div className="flex items-center gap-3">
                  <span className="rounded-full bg-blue-100 px-3 py-1 text-sm font-black text-royal">
                    {accountStatusText[profile?.verification_status ?? 'unverified'] ?? profile?.verification_status}
                  </span>
                  <span className="text-sm font-black text-royal">
                    <span className="group-open:hidden">Ver evidencias ↓</span>
                    <span className="hidden group-open:inline">Ocultar evidencias ↑</span>
                  </span>
                </div>
              </div>
              <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm text-slate-600">
                {profile?.student_code && <span>Código: {profile.student_code}</span>}
                <span>ID: {userId}</span>
                <span>{accountSubmissions.length} evidencia{accountSubmissions.length === 1 ? '' : 's'}</span>
              </div>
            </summary>

            <div className="grid gap-5 border-t border-slate-200 p-6 xl:grid-cols-2">
              {accountSubmissions.map(submission => {
                const url = signedUrls[submission.id];
                const isPdf = submission.file_url.toLowerCase().endsWith('.pdf');
                const approvals = approvalsBySubmission[submission.id] ?? [];
                return (
                  <article key={submission.id} className="overflow-hidden rounded-2xl border border-slate-200">
                    <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 px-4 py-3">
                      <div>
                        <p className="text-sm font-bold text-ink">Enviada: {new Date(submission.created_at).toLocaleString('es-PE')}</p>
                        {submission.reviewed_at && <p className="text-xs text-slate-500">Revisada: {new Date(submission.reviewed_at).toLocaleString('es-PE')}</p>}
                      </div>
                      <span className={`rounded-full px-3 py-1 text-sm font-black ${statusStyle[submission.status]}`}>
                        {statusText[submission.status]}
                      </span>
                    </div>

                    <div className="p-4">
                      <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
                        {isPdf ? (
                          <div className="flex min-h-56 items-center justify-center p-6 text-center">
                            <div><p className="font-black text-ink">Documento PDF</p><a href={url} target="_blank" rel="noreferrer" className="btn-primary mt-3">Abrir PDF</a></div>
                          </div>
                        ) : (
                          <a href={url} target="_blank" rel="noreferrer" title="Abrir imagen completa">
                            <img src={url} alt="Evidencia de verificación" className="h-72 w-full object-contain" />
                          </a>
                        )}
                      </div>

                      <h3 className="mt-4 font-black text-ink">Cursos aprobados por esta evidencia</h3>
                      {approvals.length ? (
                        <ul className="mt-2 space-y-2">
                          {approvals.map((approval, index) => {
                            const course = firstRelation(approval.courses);
                            const professor = firstRelation(approval.professors);
                            return (
                              <li key={`${submission.id}-${index}`} className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-950">
                                <strong>{course?.code || 'Sin código'} — {course?.name || 'Curso no encontrado'}</strong>
                                <span className="block">Profesor: {professor?.full_name || 'No registrado'}</span>
                                {(approval.academic_term || approval.section) && <span className="block text-xs">{approval.academic_term || 'Ciclo no indicado'}{approval.section ? ` · Sección ${approval.section}` : ''}</span>}
                              </li>
                            );
                          })}
                        </ul>
                      ) : (
                        <p className="mt-2 rounded-xl bg-slate-50 p-3 text-sm text-slate-600">
                          {submission.status === 'approved'
                            ? 'Esta evidencia es anterior al registro detallado y no se puede asociar con certeza.'
                            : 'No se aprobaron cursos con esta evidencia.'}
                        </p>
                      )}

                      {submission.admin_notes && <p className="mt-3 text-sm text-slate-600"><strong>Nota:</strong> {submission.admin_notes}</p>}
                    </div>
                  </article>
                );
              })}
            </div>
          </details>
        );
      })}

      {!submissions.length && <div className="panel text-center"><p className="text-xl font-black text-ink">Todavía no hay cuentas con evidencias.</p></div>}
    </div>
  );
}
