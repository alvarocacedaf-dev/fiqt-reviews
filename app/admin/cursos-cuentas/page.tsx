import { requireAdmin } from '@/lib/admin';
import { removeVerifiedCourseAccess } from '../actions';

type PageProps = { searchParams: Promise<{ error?: string; success?: string }> };
type Profile = { id: string; full_name: string | null; student_code: string | null };
type VerifiedCourseRow = {
  user_id: string;
  course_id: string;
  academic_term: string | null;
  section: string | null;
  courses: { code: string | null; name: string } | { code: string | null; name: string }[] | null;
};
type VerifiedProfessorRow = {
  user_id: string;
  course_id: string;
  professors: { full_name: string } | { full_name: string }[] | null;
};
type CourseAccess = {
  userId: string;
  courseId: string;
  code: string | null;
  name: string;
  terms: string[];
  professors: string[];
};

function firstRelation<T>(relation: T | T[] | null): T | null {
  return Array.isArray(relation) ? relation[0] ?? null : relation;
}

export default async function AccountCoursesPage({ searchParams }: PageProps) {
  const { error, success } = await searchParams;
  const { db } = await requireAdmin();
  const [{ data: rawCourses, error: coursesError }, { data: rawProfessors }] = await Promise.all([
    db.from('verified_courses').select('user_id,course_id,academic_term,section,courses(code,name)').order('created_at', { ascending: false }),
    db.from('verified_course_professors').select('user_id,course_id,professors(full_name)'),
  ]);

  const rows = (rawCourses ?? []) as unknown as VerifiedCourseRow[];
  const professorRows = (rawProfessors ?? []) as unknown as VerifiedProfessorRow[];
  const professorsByAccess = professorRows.reduce<Record<string, string[]>>((groups, row) => {
    const professor = firstRelation(row.professors);
    if (professor) (groups[`${row.user_id}|${row.course_id}`] ??= []).push(professor.full_name);
    return groups;
  }, {});

  const accessByKey = new Map<string, CourseAccess>();
  for (const row of rows) {
    const course = firstRelation(row.courses);
    const key = `${row.user_id}|${row.course_id}`;
    const term = [row.academic_term, row.section ? `Sección ${row.section}` : null].filter(Boolean).join(' · ');
    const existing = accessByKey.get(key);
    if (existing) {
      if (term && !existing.terms.includes(term)) existing.terms.push(term);
    } else {
      accessByKey.set(key, {
        userId: row.user_id,
        courseId: row.course_id,
        code: course?.code ?? null,
        name: course?.name ?? 'Curso no encontrado',
        terms: term ? [term] : [],
        professors: professorsByAccess[key] ?? [],
      });
    }
  }

  const accesses = [...accessByKey.values()];
  const userIds = [...new Set(accesses.map(access => access.userId))];
  const { data: rawProfiles } = userIds.length
    ? await db.from('profiles').select('id,full_name,student_code').in('id', userIds)
    : { data: [] };
  const profiles = Object.fromEntries(((rawProfiles ?? []) as Profile[]).map(profile => [profile.id, profile]));
  const accessesByUser = accesses.reduce<Record<string, CourseAccess[]>>((groups, access) => {
    (groups[access.userId] ??= []).push(access);
    return groups;
  }, {});

  return <div className="space-y-6">
    <header className="panel">
      <p className="text-sm font-black text-royal">ADMINISTRACIÓN</p>
      <h1 className="mt-1 text-3xl font-black text-ink">Cursos de cuentas</h1>
      <p className="mt-2 text-sm text-slate-600">Consulta y corrige los cursos habilitados para cada estudiante. Quitar un curso también revoca todos sus profesores autorizados.</p>
      {(error || coursesError) && <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm font-bold text-red-800">{error || coursesError?.message}</p>}
      {success && <p className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm font-bold text-emerald-800">{success}</p>}
    </header>

    {Object.entries(accessesByUser).map(([userId, accountAccesses]) => {
      const profile = profiles[userId];
      return <details key={userId} className="group overflow-hidden rounded-3xl bg-white shadow-card">
        <summary className="cursor-pointer list-none bg-slate-50 px-6 py-5">
          <p className="text-xs font-black uppercase tracking-wider text-royal">Cuenta</p>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-2xl font-black text-ink">{profile?.full_name || 'Estudiante sin nombre'}</h2>
            <span className="text-sm font-black text-royal"><span className="group-open:hidden">Ver cursos ↓</span><span className="hidden group-open:inline">Ocultar cursos ↑</span></span>
          </div>
          <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm text-slate-600">
            {profile?.student_code && <span>Código: {profile.student_code}</span>}
            <span>ID: {userId}</span>
            <span>{accountAccesses.length} curso{accountAccesses.length === 1 ? '' : 's'}</span>
          </div>
        </summary>

        <div className="space-y-3 border-t border-slate-200 p-6">
          {accountAccesses.map(access => <article key={access.courseId} className="rounded-2xl border border-slate-200 p-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h3 className="font-black text-royal">{access.code || 'Sin código'} — {access.name}</h3>
                <p className="mt-1 text-sm text-slate-600">Profesores: {access.professors.length ? access.professors.join(', ') : 'Sin profesor autorizado'}</p>
                {access.terms.length > 0 && <p className="mt-1 text-xs text-slate-500">{access.terms.join(' · ')}</p>}
              </div>
              <form action={removeVerifiedCourseAccess} className="flex flex-wrap items-center gap-2">
                <input type="hidden" name="user_id" value={userId} />
                <input type="hidden" name="course_id" value={access.courseId} />
                <input required type="password" autoComplete="off" name="action_code" className="input max-w-xs" placeholder="Código del propietario" />
                <button className="btn-secondary border-red-200 text-red-700 hover:bg-red-50">Quitar</button>
              </form>
            </div>
          </article>)}
        </div>
      </details>;
    })}

    {!accesses.length && !coursesError && <div className="panel text-center"><p className="text-xl font-black text-ink">No hay cursos habilitados en ninguna cuenta.</p></div>}
  </div>;
}
