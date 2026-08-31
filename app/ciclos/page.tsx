import Link from 'next/link';
import { CycleSelector } from '@/components/CycleSelector';
import { ContributionModal } from '@/components/ContributionModal';
import { PageGuideModal } from '@/components/PageGuideModal';
import { Icon } from '@/components/ui/Icon';
import { getCycles } from '@/lib/data';
import { isSupabaseConfigured } from '@/lib/demo';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { REWARD_THRESHOLDS } from '@/lib/rewardThresholds';
import {
  getWorksheetSanctionState,
  seriousReportCategoryLabels,
  type WorksheetSanction,
} from '@/lib/worksheetSanctions';

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

async function getContributionStatus() {
  if (!isSupabaseConfigured) return null;

  const db = await createClient();
  const {
    data: { user },
  } = await db.auth.getUser();

  if (!user) return null;

  const { data } = await db
    .from('contribution_submissions')
    .select('status')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const status = data?.status;
  return status === 'pending' || status === 'approved' || status === 'rejected' ? status : null;
}

async function getWorksheetFileCount() {
  if (!isSupabaseConfigured) return 0;

  const db = createAdminClient();
  const { count, error } = await db
    .from('admin_worksheets')
    .select('id', { count: 'exact', head: true });

  return error ? 0 : count ?? 0;
}

async function getPrivateWorksheetSanctions() {
  if (!isSupabaseConfigured) return null;

  const db = await createClient();
  const {
    data: { user },
  } = await db.auth.getUser();

  if (!user) return null;

  const [{ data: profile }, sanctionState] = await Promise.all([
    db.from('profiles').select('role').eq('id', user.id).single(),
    getWorksheetSanctionState(db),
  ]);

  if (profile?.role === 'admin' || sanctionState.error) return [];
  return sanctionState.sanctions;
}

function WorksheetSanctionNotices({ sanctions }: { sanctions: WorksheetSanction[] }) {
  if (!sanctions.length) return null;

  return (
    <div className="space-y-3">
      {sanctions.map(sanction => {
        const category = seriousReportCategoryLabels[sanction.report_type];
        const isBlocked = sanction.founded_count >= 2;

        return (
          <section
            className={`rounded-3xl border p-5 shadow-card ${
              isBlocked
                ? 'border-red-300 bg-red-50 text-red-950'
                : 'border-amber-300 bg-amber-50 text-amber-950'
            }`}
            key={sanction.report_type}
          >
            <p className="text-xs font-black uppercase tracking-[0.2em]">
              {isBlocked ? 'Acceso a Planchas deshabilitado' : 'Advertencia de la comunidad de Planchas'}
            </p>
            <p className="mt-2 font-semibold leading-7">
              {isBlocked ? (
                <>
                  Tu cuenta acumuló dos reportes fundados en la categoría de <strong>{category}</strong>. Por
                  este motivo, no podrás entrar a la sección de Planchas de forma permanente.
                </>
              ) : (
                <>
                  Tu cuenta ha sido reportada por un chat en la categoría de <strong>{category}</strong> y el
                  reporte fue declarado fundado por las pruebas. De tener otro reporte fundado en la categoría
                  de <strong>{category}</strong>, no podrás entrar a la sección de Planchas de forma permanente.
                </>
              )}
            </p>
          </section>
        );
      })}
    </div>
  );
}

function RewardsCard({ approvedReviews, contributionStatus }: { approvedReviews: number; contributionStatus: 'pending' | 'approved' | 'rejected' | null }) {
  const rewards = [
    { goal: REWARD_THRESHOLDS.reviews, title: 'Acceso a las reseñas' },
    { goal: REWARD_THRESHOLDS.worksheetsCommunity, title: 'Acceso completo a la comunidad de planchas' },
    { goal: REWARD_THRESHOLDS.oneAdminCourse, title: 'Planchas de 1 curso de la administración' },
    { goal: REWARD_THRESHOLDS.twoAdminCourses, title: 'Planchas de 2 cursos de la administración' },
    { goal: REWARD_THRESHOLDS.allAdminCourses, title: 'Acceso completo a la descarga de todas las planchas de todos los cursos' },
  ];
  const nextReward = rewards.find(reward => approvedReviews < reward.goal);
  const contributionApproved = contributionStatus === 'approved';
  const contributionIsPending = contributionStatus === 'pending';
  const contributionIsRejected = contributionStatus === 'rejected';
  const progress = contributionApproved
    ? nextReward ? Math.min(100, Math.round((approvedReviews / nextReward.goal) * 100)) : 100
    : contributionIsPending ? 50 : 0;
  const remaining = nextReward ? nextReward.goal - approvedReviews : 0;
  const progressTitle = contributionApproved
    ? nextReward?.title ?? 'Todas las recompensas desbloqueadas'
    : 'Aporte a la página';
  const progressDescription = !contributionApproved
    ? contributionIsPending
      ? 'Tu comprobante está en revisión. Cuando sea aprobado, podrás comenzar a avanzar con tus reseñas.'
      : contributionIsRejected
        ? 'Tu comprobante fue rechazado. Envíalo nuevamente para completar el primer paso de tu ruta.'
        : 'Este es el primer paso obligatorio. Realiza el aporte y envía tu comprobante para iniciar tu ruta de recompensas.'
    : nextReward
      ? `Te faltan ${remaining} reseña${remaining === 1 ? '' : 's'} aprobada${remaining === 1 ? '' : 's'} para alcanzar esta recompensa.`
      : 'Completaste todas las metas actuales. Seguiremos buscando nuevas recompensas para reconocer tu aporte.';

  return (
    <aside className="rounded-3xl border border-white/15 bg-[#071a3d]/85 p-5 text-white shadow-card backdrop-blur lg:sticky lg:top-24">
      <p className="text-xs font-black uppercase tracking-[0.25em] text-gold">Programa de beneficios</p>
      <h2 className="mt-2 text-2xl font-black">Comparte tu experiencia y desbloquea beneficios</h2>
      <p className="mt-3 text-sm leading-6 text-blue-100">
        Primero completa tu aporte a la página. Después, cada reseña aprobada te acercará a una nueva recompensa.
      </p>

      <div className="mt-5 rounded-2xl bg-white/10 p-4">
        <div className="flex items-center justify-between gap-3 text-sm font-bold">
          <span>{contributionApproved ? nextReward ? 'Próxima recompensa' : 'Ruta completada' : 'Primer paso obligatorio'}</span>
          <span className="rounded-full bg-gold px-3 py-1 text-xs font-black text-ink">
            {contributionApproved
              ? `${approvedReviews} aprobada${approvedReviews === 1 ? '' : 's'}`
              : contributionIsPending ? 'En revisión' : 'Paso 1'}
          </span>
        </div>
        <p className="mt-3 font-black text-white">{progressTitle}</p>
        <div className="mt-3 h-3 overflow-hidden rounded-full bg-white/15">
          <div className="progress-fill h-full rounded-full bg-gradient-to-r from-gold to-yellow-300" style={{ width: `${progress}%` }} />
        </div>
        <p className="mt-3 text-xs leading-5 text-blue-100">
          {progressDescription}
        </p>
      </div>

      <div className="mt-5">
        <h3 className="text-sm font-black uppercase tracking-wider text-gold">Tu ruta de recompensas</h3>
        <p className="mt-2 text-xs leading-5 text-blue-100">Solo cuentan las reseñas aprobadas, responsables y basadas en experiencias académicas reales.</p>
        <div className="mt-3 space-y-2">
          <ContributionModal initialStatus={contributionStatus} />
          {rewards.map(reward => {
            const unlocked = contributionApproved && approvedReviews >= reward.goal;
            const isNext = contributionApproved && nextReward?.goal === reward.goal;
            return (
              <div key={reward.goal} className={`flex items-center gap-3 rounded-xl border p-3 ${unlocked ? 'border-emerald-300/40 bg-emerald-400/15' : isNext ? 'border-gold/50 bg-gold/10' : 'border-white/10 bg-white/5'}`}>
                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-black ${unlocked ? 'bg-emerald-300 text-emerald-950' : 'bg-white/10 text-gold'}`}>
                  {reward.goal}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-black text-white">{reward.title}</p>
                  <p className="mt-0.5 text-[11px] font-bold text-blue-200">{unlocked ? 'Desbloqueado' : isNext ? 'Próximo objetivo' : 'Bloqueado'}</p>
                </div>
                <Icon className="h-4 w-4" name={unlocked ? 'check' : 'lock'} />
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
  const [cycles, approvedReviewCount, contributionStatus, worksheetSanctions, worksheetFileCount] = await Promise.all([
    getCycles(),
    getApprovedReviewCount(),
    getContributionStatus(),
    getPrivateWorksheetSanctions(),
    getWorksheetFileCount(),
  ]);

  return (
    <div className={approvedReviewCount === null ? '' : 'grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start'}>
    <div className="space-y-6">
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
      <PageGuideModal />
      <p className="w-fit rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-sm font-bold text-white shadow-sm">
        Contador de planchas: <span className="text-gold">{worksheetFileCount.toLocaleString('es-PE')}</span>
      </p>
      <section className="rounded-2xl border border-white/15 bg-white/10 p-5 text-white shadow-card">
        <h2 className="text-sm font-black uppercase tracking-[0.18em] text-gold">
          Notificaciones periódicas
        </h2>
        <div className="mt-4 space-y-3">
          <p className="rounded-xl border border-white/10 bg-[#071a3d]/65 p-4 text-sm leading-6 text-blue-50">
            Queremos agradecerles el gran recibimiento que ha tenido la página durante estos primeros dos días de lanzamiento. Aún se están cargando más planchas y materiales de estudio, además de los que ya tiene la administración.
          </p>
          <p className="rounded-xl border border-gold/30 bg-gold/10 p-4 text-sm font-semibold leading-6 text-yellow-50">
            Por ser la primera semana de lanzamiento, cuando el contador de planchas llegue a 2,000, se habilitará el acceso completo a las planchas de todos los cursos para los primeros 100 usuarios que completen los tres primeros pasos de <strong className="font-black uppercase text-gold">Tu ruta de recompensas</strong>.
          </p>
          <p className="rounded-xl border border-white/10 bg-[#071a3d]/65 p-4 text-sm leading-6 text-blue-50">
            Durante esta primera semana continuaremos realizando mejoras en la página para ofrecer más beneficios a los estudiantes.
          </p>
        </div>
      </section>
      {contributionStatus === 'approved' && (
        <p className="rounded-xl border border-emerald-300/40 bg-emerald-400/10 px-4 py-3 text-sm font-semibold text-emerald-100">
          * Tu aporte fue aprobado. Sigue avanzando en la ruta de recompensas para que disfrutes de la página.
        </p>
      )}
      {worksheetSanctions && <WorksheetSanctionNotices sanctions={worksheetSanctions} />}
    </div>
    {approvedReviewCount !== null && <RewardsCard approvedReviews={approvedReviewCount} contributionStatus={contributionStatus} />}
    </div>
  );
}
