import { requireAdmin } from '@/lib/admin';

type Profile = {
  id: string;
  full_name: string | null;
  student_code: string | null;
};

type CourseRelation = {
  code: string | null;
  name: string;
};

type WorksheetPreferenceRow = {
  user_id: string;
  course_id: string;
  preference: 'have' | 'want';
  updated_at: string;
  courses: CourseRelation | CourseRelation[] | null;
};

type SelectedCourse = {
  courseId: string;
  code: string | null;
  name: string;
};

type AccountPreferences = {
  have: SelectedCourse[];
  want: SelectedCourse[];
};

function firstRelation<T>(relation: T | T[] | null): T | null {
  return Array.isArray(relation) ? relation[0] ?? null : relation;
}

function CourseList({
  courses,
  emptyText,
  title,
}: {
  courses: SelectedCourse[];
  emptyText: string;
  title: string;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-lg font-black text-ink">{title}</h3>
        <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-royal">
          {courses.length}
        </span>
      </div>

      <div className="mt-4 space-y-2">
        {courses.map(course => (
          <article className="rounded-xl border border-blue-100 bg-white p-3" key={course.courseId}>
            <p className="font-black text-royal">
              {course.code || 'Sin código'} — {course.name}
            </p>
          </article>
        ))}

        {!courses.length && (
          <p className="rounded-xl bg-white p-3 text-sm text-slate-500">{emptyText}</p>
        )}
      </div>
    </section>
  );
}

export default async function AdminWorksheetsPage() {
  const { db } = await requireAdmin();
  const { data: rawPreferences, error } = await db
    .from('worksheet_preferences')
    .select('user_id,course_id,preference,updated_at,courses(code,name)')
    .order('updated_at', { ascending: false });

  const rows = (rawPreferences ?? []) as unknown as WorksheetPreferenceRow[];
  const userIds = [...new Set(rows.map(row => row.user_id))];
  const { data: rawProfiles, error: profilesError } = userIds.length
    ? await db.from('profiles').select('id,full_name,student_code').in('id', userIds)
    : { data: [], error: null };

  const profiles = Object.fromEntries(
    ((rawProfiles ?? []) as Profile[]).map(profile => [profile.id, profile]),
  );

  const preferencesByUser = rows.reduce<Record<string, AccountPreferences>>((groups, row) => {
    const course = firstRelation(row.courses);
    const account = (groups[row.user_id] ??= { have: [], want: [] });
    const selectedCourse = {
      courseId: row.course_id,
      code: course?.code ?? null,
      name: course?.name ?? 'Curso no encontrado',
    };

    if (row.preference === 'have') {
      account.have.push(selectedCourse);
    } else {
      account.want.push(selectedCourse);
    }

    return groups;
  }, {});

  return (
    <div className="space-y-6">
      <header className="panel">
        <p className="text-sm font-black text-royal">ADMINISTRACIÓN</p>
        <h1 className="mt-1 text-3xl font-black text-ink">Planchas</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Consulta las cuentas que guardaron cursos en “Planchas que tengo” o “Planchas que quiero”.
        </p>
        {(error || profilesError) && (
          <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm font-bold text-red-800">
            {error?.message || profilesError?.message}
          </p>
        )}
      </header>

      {Object.entries(preferencesByUser).map(([userId, preferences]) => {
        const profile = profiles[userId];
        const total = preferences.have.length + preferences.want.length;

        return (
          <details className="group overflow-hidden rounded-3xl bg-white shadow-card" key={userId}>
            <summary className="cursor-pointer list-none bg-slate-50 px-6 py-5">
              <p className="text-xs font-black uppercase tracking-wider text-royal">Cuenta</p>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-2xl font-black text-ink">
                  {profile?.full_name || 'Estudiante sin nombre'}
                </h2>
                <span className="text-sm font-black text-royal">
                  <span className="group-open:hidden">Ver selecciones ↓</span>
                  <span className="hidden group-open:inline">Ocultar selecciones ↑</span>
                </span>
              </div>
              <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm text-slate-600">
                {profile?.student_code && <span>Código: {profile.student_code}</span>}
                <span>ID: {userId}</span>
                <span>{preferences.have.length} que tiene</span>
                <span>{preferences.want.length} que quiere</span>
                <span>{total} selección{total === 1 ? '' : 'es'} en total</span>
              </div>
            </summary>

            <div className="grid gap-5 border-t border-slate-200 p-6 lg:grid-cols-2">
              <CourseList
                courses={preferences.have}
                emptyText="Esta cuenta no registró planchas que tenga."
                title="Planchas que tengo"
              />
              <CourseList
                courses={preferences.want}
                emptyText="Esta cuenta no registró planchas que quiera."
                title="Planchas que quiero"
              />
            </div>
          </details>
        );
      })}

      {!rows.length && !error && (
        <div className="panel text-center">
          <p className="text-xl font-black text-ink">Todavía no hay cuentas con selecciones de Planchas.</p>
        </div>
      )}
    </div>
  );
}

