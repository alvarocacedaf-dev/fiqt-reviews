import { requireAdmin } from '@/lib/admin';
import { VerificationApprovalForm } from '@/components/VerificationApprovalForm';

type Submission = {
  id: string;
  user_id: string;
  file_url: string;
  created_at: string;
};

type Profile = {
  id: string;
  full_name: string | null;
  verification_status: string;
};

type ProfessorCourse = {
  course_id: string;
  professor_id: string;
  courses: { name: string; code: string | null; cycle_id: number } | { name: string; code: string | null; cycle_id: number }[] | null;
  professors: { full_name: string } | { full_name: string }[] | null;
};

function firstRelation<T>(relation: T | T[] | null): T | null {
  return Array.isArray(relation) ? relation[0] ?? null : relation;
}

export default async function AdminVerifications() {
  const { db } = await requireAdmin();
  const [{ data: rawItems }, { data: rawProfessorCourses }] = await Promise.all([
    db.from('verification_submissions').select('*').eq('status', 'pending').order('created_at'),
    db.from('course_professors').select('course_id,professor_id,courses(name,code,cycle_id),professors(full_name)'),
  ]);

  const items = (rawItems ?? []) as Submission[];
  const professorCourses = ((rawProfessorCourses ?? []) as unknown as ProfessorCourse[])
    .map(link => ({
      ...link,
      course: firstRelation(link.courses),
      professor: firstRelation(link.professors),
    }))
    .filter(link => link.course && link.professor)
    .sort((a, b) =>
      (a.course?.cycle_id ?? 999) - (b.course?.cycle_id ?? 999)
      || `${a.course?.code} ${a.professor?.full_name}`.localeCompare(`${b.course?.code} ${b.professor?.full_name}`, 'es'),
    );
  const userIds = [...new Set(items.map(item => item.user_id))];
  const { data: rawProfiles } = userIds.length
    ? await db.from('profiles').select('id,full_name,verification_status').in('id', userIds)
    : { data: [] };
  const profiles = Object.fromEntries(
    ((rawProfiles ?? []) as Profile[]).map(profile => [profile.id, profile]),
  );

  const signedUrls = Object.fromEntries(
    await Promise.all(
      items.map(async item => [
        item.id,
        (await db.storage.from('verification-evidence').createSignedUrl(item.file_url, 600)).data?.signedUrl ?? '#',
      ]),
    ),
  );

  return (
    <div className="space-y-6">
      <header className="panel">
        <p className="text-sm font-black text-royal">ADMINISTRACIÓN</p>
        <h1 className="mt-1 text-3xl font-black text-ink">Verificar cursos de estudiantes</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
          Revisa la evidencia y marca cada combinación de curso y profesor que corresponda. El estudiante solo podrá
          reseñar exactamente a los profesores seleccionados.
        </p>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          {['1. Revisa la foto', '2. Marca curso y profesor', '3. Aprueba el acceso'].map(step => (
            <div key={step} className="rounded-2xl bg-blue-50 px-4 py-3 text-sm font-bold text-royal">{step}</div>
          ))}
        </div>
      </header>

      {items.map(item => {
        const profile = profiles[item.user_id];
        const isPdf = item.file_url.toLowerCase().endsWith('.pdf');
        const url = signedUrls[item.id];

        return (
          <article key={item.id} className="overflow-hidden rounded-3xl bg-white shadow-card">
            <div className="border-b border-slate-200 bg-slate-50 px-6 py-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-wider text-royal">Cuenta solicitante</p>
                  <h2 className="text-xl font-black text-ink">{profile?.full_name || 'Estudiante sin nombre'}</h2>
                  <p className="mt-1 text-xs text-slate-500">ID: {item.user_id}</p>
                </div>
                <div className="text-right text-sm text-slate-600">
                  <span className="rounded-full bg-amber-100 px-3 py-1 font-bold text-amber-800">Pendiente</span>
                  <p className="mt-2">Enviado: {new Date(item.created_at).toLocaleString('es-PE')}</p>
                </div>
              </div>
            </div>

            <div className="grid gap-6 p-6 lg:grid-cols-[minmax(0,1fr)_minmax(360px,1fr)]">
              <section>
                <h3 className="font-black text-ink">Evidencia académica</h3>
                <div className="mt-3 overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
                  {isPdf ? (
                    <div className="flex min-h-72 items-center justify-center p-8 text-center">
                      <div>
                        <p className="text-lg font-black text-ink">Documento PDF</p>
                        <a href={url} target="_blank" rel="noreferrer" className="btn-primary mt-4">Abrir PDF privado</a>
                      </div>
                    </div>
                  ) : (
                    <a href={url} target="_blank" rel="noreferrer" title="Abrir imagen completa">
                      <img src={url} alt="Evidencia académica enviada" className="max-h-[520px] w-full object-contain" />
                    </a>
                  )}
                </div>
                <a href={url} target="_blank" rel="noreferrer" className="mt-3 inline-block text-sm font-bold text-royal underline">
                  Abrir evidencia en tamaño completo
                </a>
              </section>

              <div className="hidden">
                <input type="hidden" name="id" value={item.id} />
                <div>
                  <h3 className="font-black text-ink">Cursos y profesores autorizados</h3>
                  <p className="mt-1 text-sm text-slate-600">Marca cada profesor que el estudiante llevó en su curso.</p>
                  <div className="mt-3 max-h-72 space-y-2 overflow-y-auto rounded-2xl border border-slate-200 p-3">
                    {professorCourses.map(link => (
                      <label key={`${link.course_id}-${link.professor_id}`} className="flex cursor-pointer items-start gap-3 rounded-xl p-3 hover:bg-blue-50">
                        <input type="checkbox" name="professor_course_ids" value={`${link.course_id}|${link.professor_id}`} className="mt-1 h-4 w-4" />
                        <span className="text-sm">
                          <strong className="text-royal">{link.course?.code ?? 'SIN CÓDIGO'} — {link.course?.name}</strong>
                          <span className="block font-semibold text-slate-700">Profesor: {link.professor?.full_name}</span>
                        </span>
                      </label>
                    ))}
                    {!professorCourses.length && <p className="p-3 text-sm text-red-700">No hay profesores asociados a cursos.</p>}
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="text-sm font-semibold">Ciclo académico
                    <input name="academic_term" className="input mt-1" placeholder="Ejemplo: 2026-I" />
                  </label>
                  <label className="text-sm font-semibold">Sección
                    <input name="section" className="input mt-1" placeholder="Ejemplo: A" />
                  </label>
                </div>

                <label className="block text-sm font-semibold">Nota para el estudiante
                  <textarea name="notes" className="input mt-1 min-h-24" placeholder="Opcional al aprobar; explica el motivo si rechazas." />
                </label>

                <div className="rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-950">
                  <strong>Aprobar:</strong> habilita reseñas únicamente para los profesores y cursos marcados.
                </div>
                <div className="flex flex-wrap gap-3">
                  <button name="status" value="approved" className="btn-primary">Aprobar profesores seleccionados</button>
                  <button name="status" value="rejected" className="btn-secondary border-red-200 text-red-700 hover:bg-red-50">Rechazar evidencia</button>
                </div>
              </div>
              <VerificationApprovalForm
                submissionId={item.id}
                ocrEnabled={!process.env.VERCEL}
                options={professorCourses.map(link => ({
                  value: `${link.course_id}|${link.professor_id}`,
                  courseCode: link.course?.code ?? 'SIN CÓDIGO',
                  courseName: link.course?.name ?? '',
                  professorName: link.professor?.full_name ?? '',
                  cycleNumber: link.course?.cycle_id ?? 999,
                }))}
              />
            </div>
          </article>
        );
      })}

      {!items.length && (
        <div className="panel text-center">
          <p className="text-2xl font-black text-ink">No hay evidencias pendientes</p>
          <p className="mt-2 text-slate-600">Las nuevas solicitudes aparecerán aquí automáticamente.</p>
        </div>
      )}
    </div>
  );
}
