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

function first<T>(value: Relation<T>): T | null {
  return Array.isArray(value) ? value[0] ?? null : value;
}

export default async function VerifiedCoursesPage() {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) redirect('/login');

  const [{ data: rawPairs, error }, { data: reviews }] = await Promise.all([
    db
      .from('verified_course_professors')
      .select('course_id,professor_id,created_at,courses(id,code,name,cycle_id),professors(id,full_name)')
      .eq('user_id', user.id),
    db.from('reviews').select('course_id,professor_id,status').eq('user_id', user.id),
  ]);

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
