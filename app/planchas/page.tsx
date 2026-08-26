import { redirect } from 'next/navigation';
import { WorksheetPreferencesForm } from '@/components/WorksheetPreferencesForm';
import { Icon } from '@/components/ui/Icon';
import { createClient } from '@/lib/supabase/server';
import { getWorksheetSanctionState } from '@/lib/worksheetSanctions';

const MINIMUM_APPROVED_REVIEWS = 16;

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
    sanctionState,
  ] = await Promise.all([
    db.from('profiles').select('role').eq('id', user.id).single(),
    db
      .from('reviews')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('status', 'approved'),
    getWorksheetSanctionState(db),
  ]);

  const approvedReviews = count ?? 0;
  const isAdmin = profile?.role === 'admin';
  const isUnlocked = isAdmin || approvedReviews >= MINIMUM_APPROVED_REVIEWS;

  if (profileError || (!isAdmin && countError)) {
    return (
      <section className="panel">
        <h1 className="flex items-center gap-2 text-3xl font-black text-ink">Planchas <Icon className="h-7 w-7" name="lock" /></h1>
        <p className="mt-4 rounded-2xl bg-red-50 p-4 font-semibold text-red-800">
          No pudimos comprobar tus reseñas aprobadas. Inténtalo nuevamente en unos minutos.
        </p>
      </section>
    );
  }

  if (!isAdmin && sanctionState.isPermanentlyBlocked) {
    redirect('/ciclos');
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
        <p className="text-sm font-black uppercase tracking-[0.2em] text-royal">Comunidad de planchas</p>
        <h1 className="mt-2 flex items-center gap-3 text-3xl font-black text-ink">
          Planchas <Icon className="h-7 w-7" name={isUnlocked ? 'unlock' : 'lock'} />
        </h1>
        <p className="mt-3 max-w-3xl leading-7 text-slate-600">
          Indica de qué cursos puedes compartir planchas y cuáles deseas conseguir. Cada vez que guardes tus
          selecciones, buscaremos una coincidencia: una persona que quiera una plancha que tú tienes y que, al
          mismo tiempo, tenga una que tú buscas. Cuando se encuentre un match, ambos recibirán una notificación
          y podrán consultarlo en la sección <strong>Mis matches</strong>.
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
          isUnlocked={isUnlocked}
          approvedReviews={approvedReviews}
          requiredReviews={MINIMUM_APPROVED_REVIEWS}
        />
      )}
    </div>
  );
}
