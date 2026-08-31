import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

type Course = { id: string; code: string | null; name: string; cycle_id: number | null };
type Professor = { id: string; full_name: string };
type Relation<T> = T | T[] | null;
type VerifiedPair = {
  course_id: string;
  professor_id: string;
  created_at: string;
  courses: Relation<Course>;
  professors: Relation<Professor>;
};
type RejectedSubmission = {
  id: string;
  file_url: string;
  admin_notes: string | null;
  created_at: string;
  reviewed_at: string | null;
};

function first<T>(value: Relation<T>): T | null {
  return Array.isArray(value) ? value[0] ?? null : value;
}

export default async function VerifiedCoursesPage() {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) redirect('/login');

  const [{ data: rawPairs, error }, { data: reviews }, { data: rawRejected, error: rejectedError }] = await Promise.all([
    db
      .from('verified_course_professors')
      .select('course_id,professor_id,created_at,courses(id,code,name,cycle_id),professors(id,full_name)')
      .eq('user_id', user.id),
    db.from('reviews').select('course_id,professor_id,status').eq('user_id', user.id),
    db
      .from('verification_submissions')
      .select('id,file_url,admin_notes,created_at,reviewed_at')
      .eq('user_id', user.id)
      .eq('status', 'rejected')
      .order('reviewed_at', { ascending: false }),
  ]);

  const rejectedSubmissions = (rawRejected ?? []) as RejectedSubmission[];
  const rejectedEvidenceUrls = Object.fromEntries(
    await Promise.all(rejectedSubmissions.map(async submission => [
      submission.id,
      (await db.storage.from('verification-evidence').createSignedUrl(submission.file_url, 600)).data?.signedUrl ?? null,
    ])),
  );

  const reviewed = new Map(
    (reviews ?? []).map(review => [`${review.course_id}|${review.professor_id}`, review.status]),
  );
  const pairs = ((rawPairs ?? []) as unknown as VerifiedPair[])
    .map(pair => ({ ...pair, course: first(pair.courses), professor: first(pair.professors) }))
    .filter(pair => pair.course && pair.professor)
    .sort((a, b) =>
      (a.course?.cycle_id ?? 999) - (b.course?.cycle_id ?? 999)
      || `${a.course?.code} ${a.professor?.full_name}`.localeCompare(`${b.course?.code} ${b.professor?.full_name}`, 'es'),
    );

  return (
    <section className="panel">
      <p className="text-sm font-black text-royal">ACCESOS APROBADOS</p>
      <h1 className="mt-1 text-3xl font-black text-ink">Cursos verificados</h1>
      <p className="mt-2 max-w-2xl text-slate-600">
        Aquí aparecen únicamente los cursos y profesores que fueron comprobados con tu evidencia. Puedes crear una reseña para cada combinación aprobada.
      </p>

      {error && <p className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 font-semibold text-red-800">No se pudieron cargar tus accesos: {error.message}</p>}
      {rejectedError && <p className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 font-semibold text-red-800">No se pudieron cargar tus verificaciones rechazadas: {rejectedError.message}</p>}

      {!rejectedError && rejectedSubmissions.length > 0 && (
        <section className="mt-7 space-y-4" aria-labelledby="rejected-verifications-title">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-red-700">Requieren corrección</p>
            <h2 className="mt-1 text-2xl font-black text-ink" id="rejected-verifications-title">Verificaciones rechazadas</h2>
          </div>
          {rejectedSubmissions.map(submission => {
            const evidenceUrl = rejectedEvidenceUrls[submission.id];
            const isPdf = submission.file_url.toLowerCase().endsWith('.pdf');
            return (
              <article className="overflow-hidden rounded-2xl border border-red-200 bg-red-50/70" key={submission.id}>
                <div className="grid gap-5 p-5 md:grid-cols-[minmax(220px,0.8fr)_minmax(0,1.2fr)] md:items-start">
                  <div className="overflow-hidden rounded-xl border border-red-100 bg-white">
                    {evidenceUrl ? (
                      isPdf ? (
                        <div className="flex min-h-52 items-center justify-center p-5 text-center">
                          <div>
                            <p className="font-black text-ink">Documento PDF enviado</p>
                            <a className="btn-secondary mt-4" href={evidenceUrl} rel="noreferrer" target="_blank">Abrir documento</a>
                          </div>
                        </div>
                      ) : (
                        <a href={evidenceUrl} rel="noreferrer" target="_blank" title="Abrir evidencia en tamaño completo">
                          <img alt="Evidencia de cursos rechazada" className="max-h-80 w-full object-contain" src={evidenceUrl} />
                        </a>
                      )
                    ) : (
                      <p className="p-5 text-center text-sm font-semibold text-red-800">No se pudo generar el enlace privado de la evidencia.</p>
                    )}
                  </div>
                  <div>
                    <p className="rounded-xl border border-red-200 bg-white p-4 font-black text-red-800">
                      Nota 1: Esta verificación de cursos ha sido rechazada.
                    </p>
                    <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-4 font-semibold leading-6 text-amber-950">
                      <strong>Nota 2:</strong> {submission.admin_notes?.trim() || 'El administrador no agregó una nota adicional.'}
                    </p>
                    <p className="mt-3 text-xs font-semibold text-slate-500">
                      Revisada: {submission.reviewed_at ? new Date(submission.reviewed_at).toLocaleString('es-PE') : 'fecha no disponible'}
                    </p>
                    <Link className="btn-primary mt-4" href="/verificacion">Enviar una nueva evidencia</Link>
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      )}

      <div className="mt-7 space-y-6">
        {pairs.map((pair, index) => {
          const course = pair.course!;
          const professor = pair.professor!;
          const key = `${pair.course_id}|${pair.professor_id}`;
          const reviewStatus = reviewed.get(key);
          const startsCycle = index === 0 || pairs[index - 1].course?.cycle_id !== course.cycle_id;

          return (
            <div key={key}>
              {startsCycle && <h2 className="mb-3 rounded-2xl bg-[#071a3d] px-5 py-3 text-lg font-black text-white">Ciclo {course.cycle_id ?? 'sin asignar'}</h2>}
              <article className="flex flex-col gap-4 rounded-2xl border border-blue-100 bg-blue-50/70 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-lg font-black text-royal">{course.code ?? 'SIN CÓDIGO'} — {course.name}</p>
                  <p className="mt-1 font-semibold text-slate-700">Profesor: {professor.full_name}</p>
                  <p className="mt-2 text-xs font-bold uppercase tracking-wide text-emerald-700">Verificado para tu cuenta</p>
                </div>
                {reviewStatus ? (
                  <span className="rounded-xl bg-white px-4 py-3 text-center text-sm font-black text-slate-700 shadow-sm">
                    Reseña {reviewStatus === 'approved' ? 'aprobada' : reviewStatus === 'rejected' ? 'rechazada' : 'pendiente'}
                  </span>
                ) : (
                  <Link href={`/profesores/${pair.professor_id}/resena/${pair.course_id}`} className="btn-primary shrink-0 text-center">
                    Crear reseña
                  </Link>
                )}
              </article>
            </div>
          );
        })}
      </div>

      {!error && !pairs.length && (
        <div className="mt-7 rounded-2xl bg-amber-50 p-6 text-center">
          <p className="text-xl font-black text-ink">Todavía no tienes cursos verificados</p>
          <p className="mt-2 text-slate-600">Cuando el administrador apruebe tu evidencia, los cursos y profesores aparecerán aquí.</p>
          <Link href="/verificacion" className="btn-primary mt-5">Ir a verificación</Link>
        </div>
      )}
    </section>
  );
}
