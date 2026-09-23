import Link from 'next/link';
import type { ReactNode } from 'react';
import { Icon } from '@/components/ui/Icon';
import { REWARD_THRESHOLDS } from '@/lib/rewardThresholds';
import styles from './rewards-card.module.css';

export type AcademicProgress = {
  approvedReviews: number;
  donatedWorksheets: number;
  total: number;
};

export type ContributionStatus = 'pending' | 'approved' | 'rejected' | null;

const rewards = [
  { goal: REWARD_THRESHOLDS.reviews, title: 'Acceso a las reseñas' },
  { goal: REWARD_THRESHOLDS.worksheetsCommunity, title: 'Comunidad de planchas' },
  { goal: REWARD_THRESHOLDS.oneAdminCourse, title: 'Planchas de 1 curso de la administración' },
  { goal: REWARD_THRESHOLDS.twoAdminCourses, title: 'Planchas de 2 cursos de la administración' },
  { goal: REWARD_THRESHOLDS.allAdminCourses, title: 'Planchas de todos los cursos de la administración' },
];

export function AcademicRewards({ progress, status, contribution, unavailable = false }: {
  progress: AcademicProgress | null;
  status: ContributionStatus;
  contribution: ReactNode;
  unavailable?: boolean;
}) {
  const approved = status === 'approved';
  const total = progress?.total ?? 0;
  const next = rewards.find(reward => total < reward.goal);
  const goal = next?.goal ?? REWARD_THRESHOLDS.allAdminCourses;
  const percentage = Math.min(100, Math.max(0, Math.round(total / goal * 100)));

  return (
    <aside className={styles.rewards} aria-labelledby="rewards-heading">
      <div className={styles.rewardHeading}>
        <span className={styles.rewardSymbol}><Icon name="star" className="h-5 w-5" /></span>
        <h2 id="rewards-heading">Tu ruta de recompensas</h2>
      </div>
      <p className={styles.description}>Tu experiencia y tus materiales ayudan a toda la comunidad.</p>

      {unavailable ? (
        <p role="status" className={styles.notice}>No pudimos consultar tu progreso. Recarga la página para intentarlo de nuevo.</p>
      ) : !progress ? (
        <p className={styles.notice}>Inicia sesión para consultar tu progreso y tus beneficios.</p>
      ) : (
        <>
          {approved ? (
            <>
              <p className={styles.approved}><Icon name="check" className="h-4 w-4" /> Aporte aprobado</p>
              <div className={styles.progressNumber}>
                <strong>{total}</strong><span>/ {goal}</span>
                <span className={styles.progressCaption}>contribuciones aprobadas</span>
              </div>
              <div
                className={styles.progressTrack}
                role="progressbar"
                aria-label="Avance hacia la siguiente recompensa"
                aria-valuemin={0}
                aria-valuemax={goal}
                aria-valuenow={Math.min(total, goal)}
                aria-valuetext={`${total} contribuciones aprobadas; meta de ${goal}`}
              >
                <span style={{ width: `${percentage}%` }} />
              </div>
              <p className={styles.breakdown}>
                <span>{progress.approvedReviews} reseñas</span>
                <span>{progress.donatedWorksheets} planchas</span>
              </p>
              <div className={styles.nextReward}>
                <p className={styles.eyebrow}>{next ? 'Tu próximo beneficio' : '¡Ruta completada!'}</p>
                <h3>{next?.title ?? 'Todas las recompensas actuales desbloqueadas'}</h3>
                <p>{next ? `Te faltan ${next.goal - total} contribuciones aprobadas.` : 'Gracias por compartir con la comunidad.'}</p>
              </div>
              <Link className={styles.primaryButton} href="/cursos-verificados">
                Ir a mis cursos verificados <Icon name="arrow-right" className="h-4 w-4" />
              </Link>
            </>
          ) : (
            <div className={styles.contributionIntro}>
              <span className={styles.statusLabel}>{status === 'pending' ? 'En revisión' : status === 'rejected' ? 'Necesita revisión' : 'Paso 1'}</span>
              <h3>{status === 'pending' ? 'Estamos revisando tu aporte' : status === 'rejected' ? 'Vuelve a enviar tu comprobante' : 'Empieza con tu aporte'}</h3>
              <p>{status === 'pending' ? 'Tus beneficios se habilitan cuando el aporte y las contribuciones requeridas estén aprobados.' : 'El aporte ayuda a mantener disponibles las planchas y los materiales de estudio.'}</p>
              {contribution}
            </div>
          )}

          <details className={styles.routeDetails}>
            <summary>Ver ruta completa <Icon name="chevron-down" className="h-4 w-4" /></summary>
            <ol className={styles.steps}>
              <li>
                <span className={approved ? styles.stepDone : styles.stepNumber}>{approved ? <Icon name="check" className="h-4 w-4" /> : '1'}</span>
                <div><h3>Aporte inicial</h3><p>{approved ? 'Aprobado' : status === 'pending' ? 'En revisión' : 'Pendiente'}</p></div>
              </li>
              {rewards.map((reward, index) => {
                const unlocked = approved && total >= reward.goal;
                return (
                  <li key={reward.goal}>
                    <span className={unlocked ? styles.stepDone : styles.stepNumber}>{unlocked ? <Icon name="check" className="h-4 w-4" /> : index + 2}</span>
                    <div>
                      <h3>{reward.title}</h3>
                      <p>{reward.goal} {reward.goal <= 5 ? 'reseñas aprobadas' : 'contribuciones en total'} · {unlocked ? 'Desbloqueado' : 'Pendiente'}</p>
                    </div>
                  </li>
                );
              })}
            </ol>
            {approved && contribution}
            <p className={styles.finePrint}>Los beneficios están sujetos a disponibilidad y a las condiciones comunicadas por FIQT Reviews.</p>
          </details>

          <p className={styles.rewardHelp}>
            Tras completar el paso 3 con 5 reseñas aprobadas, también suman tus planchas aprobadas. Por ejemplo: <strong>5 reseñas + 2 planchas = 7</strong>, suficiente para el paso 4 con el aporte aprobado.
          </p>
        </>
      )}
    </aside>
  );
}
