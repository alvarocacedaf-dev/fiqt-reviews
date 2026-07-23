import { redirect } from 'next/navigation';
import { WorksheetPreferencesForm } from '@/components/WorksheetPreferencesForm';
import { createClient } from '@/lib/supabase/server';

const MINIMUM_APPROVED_REVIEWS = 18;

type PageProps = {
  searchParams: Promise<{ error?: string; success?: string }>;
};

type Course = {
  id: string;
  code: string | null;
  name: string;
  cycle_id: number | null;
};

type Cycle = {
  id: number;
  number: number;
  name: string;
};

type Preference = {
  course_id: string;
  preference: 'have' | 'want';
};

export default async function WorksheetsPage({ searchParams }: PageProps) {
  const { error, success } = await searchParams;
  const db = await createClient();
  const {
    data: { user },
  } = await db.auth.getUser();

  if (!user) redirect('/login?next=/planchas');

  const [
    { data: profile, error: profileError },
    { count, error: countError },
  ] = await Promise.all([
    db.from('profiles').select('role').eq('id', user.id).single(),
    db
      .from('reviews')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('status', 'approved'),
  ]);

  const approvedReviews = count ?? 0;
  const isAdmin = profile?.role === 'admin';

  if (profileError || (!isAdmin && countError)) {
    return (
      <section className="panel">
        <h1 className="text-3xl font-black text-ink">Planchas 🔒</h1>
        <p className="mt-4 rounded-2xl bg-red-50 p-4 font-semibold text-red-800">
          No pudimos comprobar tus reseñas aprobadas. Inténtalo nuevamente en unos minutos.
        </p>
      </section>
    );
  }

  if (!isAdmin && approvedReviews < MINIMUM_APPROVED_REVIEWS) {
    const remaining = MINIMUM_APPROVED_REVIEWS - approvedReviews;
    const progress = Math.round((approvedReviews / MINIMUM_APPROVED_REVIEWS) * 100);

    return (
      <section className="panel mx-auto max-w-2xl">
        <p className="text-sm font-black uppercase tracking-[0.2em] text-royal">Beneficio bloqueado</p>
        <h1 className="mt-2 text-3xl font-black text-ink">Planchas 🔒</h1>
        <p className="mt-4 leading-7 text-slate-600">
          Esta opción se habilita cuando alcanzas 18 reseñas aprobadas. Actualmente tienes{' '}
          <strong>{approvedReviews}</strong>.
        </p>
        <div className="mt-6 rounded-2xl bg-blue-50 p-5">
          <div className="flex items-center justify-between gap-4 text-sm font-black text-royal">
            <span>Tu progreso</span>
            <span>{approvedReviews} / {MINIMUM_APPROVED_REVIEWS}</span>
          </div>
          <div className="mt-3 h-3 overflow-hidden rounded-full bg-blue-100">
            <div className="h-full rounded-full bg-gold" style={{ width: `${progress}%` }} />
          </div>
          <p className="mt-3 text-sm text-slate-600">
            Te faltan {remaining} reseña{remaining === 1 ? '' : 's'} aprobada{remaining === 1 ? '' : 's'} para desbloquearla.
          </p>
        </div>
      </section>
    );
  }

  const [
    { data: rawCourses, error: coursesError },
    { data: rawCycles },
    { data: rawPreferences, error: preferencesError },
  ] = await Promise.all([
    db.from('courses').select('id,code,name,cycle_id').order('cycle_id').order('name'),
    db.from('cycles').select('id,number,name').order('number'),
    db.from('worksheet_preferences').select('course_id,preference').eq('user_id', user.id),
  ]);

  const courses = (rawCourses ?? []) as Course[];
  const cycles = (rawCycles ?? []) as Cycle[];
  const preferences = (rawPreferences ?? []) as Preference[];
  const cyclesById = Object.fromEntries(cycles.map(cycle => [cycle.id, cycle]));
  const courseOptions = courses.map(course => {
    const cycle = course.cycle_id === null ? null : cyclesById[course.cycle_id];
    return {
      id: course.id,
      code: course.code,
      name: course.name,
      cycleLabel: cycle ? `Ciclo ${cycle.number} — ${cycle.name}` : 'Curso sin ciclo asignado',
    };
  });

  const initialHave = preferences
    .filter(preference => preference.preference === 'have')
    .map(preference => preference.course_id);
  const initialWant = preferences
    .filter(preference => preference.preference === 'want')
    .map(preference => preference.course_id);

  return (
    <div className="space-y-6">
      <section className="panel">
        <p className="text-sm font-black uppercase tracking-[0.2em] text-royal">Beneficio desbloqueado</p>
        <h1 className="mt-2 text-3xl font-black text-ink">Planchas 🔓</h1>
        <p className="mt-3 max-w-3xl leading-7 text-slate-600">
          Organiza los cursos de los que ya tienes planchas y aquellos de los que deseas conseguir material.
          {isAdmin
            ? ' Esta opción está disponible por tu rol de administrador.'
            : ` Esta opción está disponible porque alcanzaste ${approvedReviews} reseñas aprobadas.`}
        </p>
      </section>

      {success && <p className="rounded-2xl bg-emerald-50 p-4 font-semibold text-emerald-800">{success}</p>}
      {error && <p className="rounded-2xl bg-red-50 p-4 font-semibold text-red-800">{error}</p>}
      {coursesError && (
        <p className="rounded-2xl bg-red-50 p-4 font-semibold text-red-800">
          No se pudo cargar el catálogo de cursos.
        </p>
      )}
      {preferencesError && (
        <p className="rounded-2xl bg-amber-50 p-4 font-semibold text-amber-900">
          Primero debes aplicar la migración 005 en Supabase para guardar selecciones.
        </p>
      )}

      {!coursesError && (
        <WorksheetPreferencesForm
          courses={courseOptions}
          initialHave={initialHave}
          initialWant={initialWant}
        />
      )}
    </div>
  );
}
