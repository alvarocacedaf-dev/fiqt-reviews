import Link from 'next/link';
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

function RewardsCard({ approvedReviews }: { approvedReviews: number }) {
  const rewards = [
    { goal: 4, title: 'Acceso completo a la página' },
    { goal: 10, title: 'Planchas de 1 curso' },
    { goal: 18, title: 'Planchas de hasta 2 cursos' },
    { goal: 25, title: 'Visita técnica gratuita' },
  ];
  const nextReward = rewards.find(reward => approvedReviews < reward.goal);
  const progress = nextReward ? Math.min(100, Math.round((approvedReviews / nextReward.goal) * 100)) : 100;
  const remaining = nextReward ? nextReward.goal - approvedReviews : 0;

  return (
    <aside className="rounded-3xl border border-white/15 bg-[#071a3d]/85 p-5 text-white shadow-card backdrop-blur lg:sticky lg:top-24">
      <p className="text-xs font-black uppercase tracking-[0.25em] text-gold">Programa de beneficios</p>
      <h2 className="mt-2 text-2xl font-black">Comparte tu experiencia y desbloquea beneficios</h2>
      <p className="mt-3 text-sm leading-6 text-blue-100">
        Cada reseña aprobada ayuda a otros alumnos y te acerca a una nueva recompensa.
      </p>

      <div className="mt-5 rounded-2xl bg-white/10 p-4">
        <div className="flex items-center justify-between gap-3 text-sm font-bold">
          <span>{nextReward ? 'Próxima recompensa' : 'Ruta completada'}</span>
          <span className="rounded-full bg-gold px-3 py-1 text-xs font-black text-ink">
            {approvedReviews} aprobada{approvedReviews === 1 ? '' : 's'}
          </span>
        </div>
        <p className="mt-3 font-black text-white">{nextReward?.title ?? 'Todas las recompensas desbloqueadas'}</p>
        <div className="mt-3 h-3 overflow-hidden rounded-full bg-white/15">
          <div className="h-full rounded-full bg-gradient-to-r from-gold to-yellow-300" style={{ width: `${progress}%` }} />
        </div>
        <p className="mt-3 text-xs leading-5 text-blue-100">
          {nextReward
            ? `Te faltan ${remaining} reseña${remaining === 1 ? '' : 's'} aprobada${remaining === 1 ? '' : 's'} para alcanzar esta recompensa.`
            : 'Completaste todas las metas actuales. Seguiremos buscando nuevas recompensas para reconocer tu aporte.'}
        </p>
      </div>

      <div className="mt-5">
        <h3 className="text-sm font-black uppercase tracking-wider text-gold">Tu ruta de recompensas</h3>
        <p className="mt-2 text-xs leading-5 text-blue-100">Solo cuentan las reseñas aprobadas, responsables y basadas en experiencias académicas reales.</p>
        <div className="mt-3 space-y-2">
          {rewards.map(reward => {
            const unlocked = approvedReviews >= reward.goal;
            const isNext = nextReward?.goal === reward.goal;
            return (
              <div key={reward.goal} className={`flex items-center gap-3 rounded-xl border p-3 ${unlocked ? 'border-emerald-300/40 bg-emerald-400/15' : isNext ? 'border-gold/50 bg-gold/10' : 'border-white/10 bg-white/5'}`}>
                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-black ${unlocked ? 'bg-emerald-300 text-emerald-950' : 'bg-white/10 text-gold'}`}>
                  {reward.goal}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-black text-white">{reward.title}</p>
                  <p className="mt-0.5 text-[11px] font-bold text-blue-200">{unlocked ? 'Desbloqueado' : isNext ? 'Próximo objetivo' : 'Bloqueado'}</p>
                </div>
                <span className="text-sm" aria-hidden="true">{unlocked ? '✓' : '🔒'}</span>
              </div>
            );
          })}
        </div>
        <Link href="/cursos-verificados" className="btn-primary mt-4 w-full text-center">Ir a mis cursos verificados</Link>
        <p className="mt-4 rounded-2xl bg-gold/10 p-3 text-xs font-semibold leading-5 text-yellow-100">
          A mayor cantidad de reseñas aprobadas, buscaremos ofrecer mayores recompensas para reconocer tu aporte a la comunidad.
        </p>
        <p className="mt-3 text-[11px] leading-4 text-blue-200">Los beneficios están sujetos a disponibilidad y a las condiciones comunicadas por FIQT Reviews.</p>
      </div>

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
    {approvedReviewCount !== null && <RewardsCard approvedReviews={approvedReviewCount} />}
    </div>
  );
}
