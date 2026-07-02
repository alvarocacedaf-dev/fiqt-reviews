import { CycleSelector } from '@/components/CycleSelector';
import { getCycles } from '@/lib/data';
import { isSupabaseConfigured } from '@/lib/demo';
import { createClient } from '@/lib/supabase/server';

async function getApprovedReviewCount() {
  if (!isSupabaseConfigured) return null;

  const db = await createClient();
  const {
    data: { user },
  } = await db.auth.getUser();

  if (!user) return null;

  const { count } = await db
    .from('reviews')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('status', 'approved');

  return count ?? 0;
}

function InitialMissionCard({ approvedReviews }: { approvedReviews: number }) {
  const goal = 4;
  const completed = approvedReviews >= goal;
  const progress = Math.min(100, Math.round((approvedReviews / goal) * 100));

  return (
    <aside className="rounded-3xl border border-white/15 bg-[#071a3d]/85 p-5 text-white shadow-card backdrop-blur lg:sticky lg:top-24">
      <p className="text-xs font-black uppercase tracking-[0.25em] text-gold">Meta inicial</p>
      <h2 className="mt-2 text-2xl font-black">Comparte lo que aprendiste viviendo el curso</h2>
      <p className="mt-3 text-sm leading-6 text-blue-100">
        Cada reseña responsable ayuda a que otros alumnos tomen mejores decisiones.
      </p>

      <div className="mt-5 rounded-2xl bg-white/10 p-4">
        <div className="flex items-center justify-between gap-3 text-sm font-bold">
          <span>{completed ? 'Meta completada' : 'Tu avance'}</span>
          <span className="rounded-full bg-gold px-3 py-1 text-xs font-black text-ink">
            {Math.min(approvedReviews, goal)} / {goal}
          </span>
        </div>
        <div className="mt-3 h-3 overflow-hidden rounded-full bg-white/15">
          <div className="h-full rounded-full bg-gradient-to-r from-gold to-yellow-300" style={{ width: `${progress}%` }} />
        </div>
        <p className="mt-3 text-xs leading-5 text-blue-100">
          {completed
            ? 'Meta inicial completada. Tus reseñas responsables ayudan a otros alumnos a tomar mejores decisiones.'
            : 'Completa 4 reseñas aprobadas para desbloquear tu insignia de colaborador inicial. Solo cuentan experiencias académicas reales y respetuosas.'}
        </p>
      </div>

      <a
        href="/ciclos"
        className="mt-4 inline-flex w-full items-center justify-center rounded-xl border border-white/15 bg-white px-4 py-2.5 text-sm font-black text-royal transition hover:bg-gold hover:text-ink"
      >
        Buscar cursos para reseñar
      </a>
    </aside>
  );
}

export default async function CyclesPage() {
  const [cycles, approvedReviewCount] = await Promise.all([getCycles(), getApprovedReviewCount()]);

  return (
    <div className={approvedReviewCount === null ? '' : 'grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start'}>
    <section className="panel">
      <p className="text-sm font-bold text-royal">RUTA ACADÉMICA</p>
      <h1 className="mt-1 text-3xl font-black text-ink">Explora por ciclo</h1>
      <p className="mt-2 text-slate-600">Selecciona el ciclo o tipo de curso que quieres consultar.</p>
      <div className="mt-7">
        <CycleSelector cycles={cycles} />
      </div>
      {!cycles.length && (
        <p className="mt-6 rounded-xl bg-amber-50 p-4 text-amber-900">
          Aún no hay ciclos cargados. Ejecuta la migración y sus datos de ejemplo en Supabase.
        </p>
      )}
    </section>
    {approvedReviewCount !== null && <InitialMissionCard approvedReviews={approvedReviewCount} />}
    </div>
  );
}
