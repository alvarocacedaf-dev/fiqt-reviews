import { requireAdmin } from '@/lib/admin';

type WorksheetMatch = {
  id: string;
  user_a_id: string;
  user_b_id: string;
  user_a_gives_course_id: string;
  user_b_gives_course_id: string;
  status: 'active' | 'invalidated';
  detected_at: string;
  last_confirmed_at: string;
  invalidated_at: string | null;
};

type Profile = {
  id: string;
  full_name: string | null;
  student_code: string | null;
};

type Course = {
  id: string;
  code: string | null;
  name: string;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat('es-PE', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'America/Lima',
  }).format(new Date(value));
}

function AccountExchange({
  gives,
  profile,
  receives,
  userId,
}: {
  gives: Course | undefined;
  profile: Profile | undefined;
  receives: Course | undefined;
  userId: string;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-black uppercase tracking-wider text-royal">Cuenta</p>
      <h3 className="mt-1 text-xl font-black text-ink">
        {profile?.full_name || 'Estudiante sin nombre'}
      </h3>
      <div className="mt-1 space-y-0.5 text-xs text-slate-500">
        {profile?.student_code && <p>Código: {profile.student_code}</p>}
        <p>ID: {userId}</p>
      </div>

      <div className="mt-4 grid gap-3">
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
          <p className="text-xs font-black uppercase tracking-wider text-emerald-800">Entrega</p>
          <p className="mt-1 font-black text-emerald-950">
            {gives?.code || 'Sin código'} — {gives?.name || 'Curso no encontrado'}
          </p>
        </div>
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-3">
          <p className="text-xs font-black uppercase tracking-wider text-royal">Recibe</p>
          <p className="mt-1 font-black text-ink">
            {receives?.code || 'Sin código'} — {receives?.name || 'Curso no encontrado'}
          </p>
        </div>
      </div>
    </section>
  );
}

export default async function AdminWorksheetMatchesPage() {
  const { db } = await requireAdmin();
  const { data: rawMatches, error } = await db
    .from('worksheet_matches')
    .select(`
      id,
      user_a_id,
      user_b_id,
      user_a_gives_course_id,
      user_b_gives_course_id,
      status,
      detected_at,
      last_confirmed_at,
      invalidated_at
    `)
    .order('detected_at', { ascending: false });

  const matches = (rawMatches ?? []) as WorksheetMatch[];
  const userIds = [...new Set(matches.flatMap(match => [match.user_a_id, match.user_b_id]))];
  const courseIds = [
    ...new Set(matches.flatMap(match => [
      match.user_a_gives_course_id,
      match.user_b_gives_course_id,
    ])),
  ];

  const [
    { data: rawProfiles, error: profilesError },
    { data: rawCourses, error: coursesError },
  ] = await Promise.all([
    userIds.length
      ? db.from('profiles').select('id,full_name,student_code').in('id', userIds)
      : Promise.resolve({ data: [], error: null }),
    courseIds.length
      ? db.from('courses').select('id,code,name').in('id', courseIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  const profiles = Object.fromEntries(
    ((rawProfiles ?? []) as Profile[]).map(profile => [profile.id, profile]),
  );
  const courses = Object.fromEntries(
    ((rawCourses ?? []) as Course[]).map(course => [course.id, course]),
  );
  const activeCount = matches.filter(match => match.status === 'active').length;
  const invalidatedCount = matches.length - activeCount;
  const queryError = error || profilesError || coursesError;

  return (
    <div className="space-y-6">
      <header className="panel">
        <p className="text-sm font-black text-royal">ADMINISTRACIÓN</p>
        <h1 className="mt-1 text-3xl font-black text-ink">Matches de planchas</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
          Historial automático de coincidencias recíprocas directas. El administrador solamente
          consulta los resultados; no tiene que aprobarlos ni rechazarlos.
        </p>

        <div className="mt-5 flex flex-wrap gap-3">
          <span className="rounded-full bg-emerald-50 px-4 py-2 text-sm font-black text-emerald-800">
            {activeCount} activo{activeCount === 1 ? '' : 's'}
          </span>
          <span className="rounded-full bg-slate-100 px-4 py-2 text-sm font-black text-slate-600">
            {invalidatedCount} invalidado{invalidatedCount === 1 ? '' : 's'}
          </span>
        </div>

        {queryError && (
          <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm font-bold text-red-800">
            {queryError.message}
          </p>
        )}
      </header>

      {matches.map(match => {
        const isActive = match.status === 'active';
        return (
          <article className="overflow-hidden rounded-3xl bg-white shadow-card" key={match.id}>
            <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 bg-slate-50 px-6 py-4">
              <div>
                <p className="text-xs font-black uppercase tracking-wider text-royal">
                  Match recíproco directo
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  Detectado: {formatDate(match.detected_at)}
                </p>
              </div>
              <span className={`rounded-full px-4 py-2 text-xs font-black ${
                isActive
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-slate-200 text-slate-600'
              }`}>
                {isActive ? 'Activo' : 'Ya no coincide'}
              </span>
            </header>

            <div className="grid gap-5 p-6 lg:grid-cols-2">
              <AccountExchange
                gives={courses[match.user_a_gives_course_id]}
                profile={profiles[match.user_a_id]}
                receives={courses[match.user_b_gives_course_id]}
                userId={match.user_a_id}
              />
              <AccountExchange
                gives={courses[match.user_b_gives_course_id]}
                profile={profiles[match.user_b_id]}
                receives={courses[match.user_a_gives_course_id]}
                userId={match.user_b_id}
              />
            </div>

            {!isActive && match.invalidated_at && (
              <p className="border-t border-slate-200 px-6 py-3 text-xs font-semibold text-slate-500">
                Dejó de coincidir: {formatDate(match.invalidated_at)}
              </p>
            )}
          </article>
        );
      })}

      {!matches.length && !error && (
        <div className="panel text-center">
          <p className="text-xl font-black text-ink">Todavía no se detectaron matches recíprocos.</p>
          <p className="mt-2 text-sm text-slate-600">
            Aparecerán automáticamente cuando dos cuentas guarden selecciones compatibles.
          </p>
        </div>
      )}
    </div>
  );
}

