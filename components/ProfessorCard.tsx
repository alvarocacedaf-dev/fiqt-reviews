import Image from 'next/image';
import Link from 'next/link';
import type { Professor, Review } from '@/lib/types';
import { RatingSummary } from './RatingSummary';

function initials(name: string) {
  return name
    .split(/[,\s]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase())
    .join('');
}

export function ProfessorCard({
  professor,
  courseId,
  courseName,
  reviews = []
}: {
  professor: Professor;
  courseId: string;
  courseName: string;
  reviews?: Review[];
}) {
  const likes = reviews.filter(review => review.recommendation === 'like').length;
  const total = reviews.length;

  return (
    <article className="group relative min-h-[29rem] overflow-hidden rounded-[2.25rem] border-4 border-white bg-gradient-to-br from-white via-blue-50 to-blue-100 p-6 pb-12 shadow-card transition hover:-translate-y-1 hover:shadow-2xl">
      <div className="absolute left-4 top-3 text-center font-black leading-none text-royal">
        <div className="text-lg">FIQT</div>
        <div className="text-2xl text-gold">◆</div>
      </div>
      <div className="absolute bottom-4 right-5 rotate-180 text-center font-black leading-none text-royal">
        <div className="text-lg">FIQT</div>
        <div className="text-2xl text-gold">◆</div>
      </div>

      <div className="pt-10">
        <div className="mx-auto h-28 w-28 overflow-hidden rounded-3xl border-4 border-white bg-gradient-to-br from-blue-200 to-blue-50 shadow-inner">
          {professor.photo_url ? (
            <div className="relative h-full w-full">
              <Image src={professor.photo_url} fill className="object-cover" alt={`Foto de ${professor.full_name}`} />
            </div>
          ) : (
            <span className="grid h-full place-items-center text-3xl font-black text-royal">{initials(professor.full_name)}</span>
          )}
        </div>

        <div className="mt-5 text-center">
          <h3 className="text-xl font-black text-ink">{professor.full_name}</h3>
          <p className="mt-2 text-sm font-semibold text-royal">{courseName}</p>
          <p className="mt-1 text-xs text-slate-500">Fuente: {professor.source_name || 'DIRCE UNI'}</p>
        </div>

        <div className="my-5 rounded-2xl border border-blue-100 bg-white/70 p-3">
          <div className="mb-3 flex items-center justify-between text-xs font-bold text-slate-500">
            <span>Recomendaciones</span>
            <span>{total ? `${likes}/${total}` : 'Sin reseñas'}</span>
          </div>
          <RatingSummary reviews={reviews} />
        </div>

        <div className="relative z-10 grid grid-cols-2 gap-3">
          <Link className="btn-primary px-3 text-sm" href={`/profesores/${professor.id}`}>
            Ver perfil
          </Link>
          <Link className="btn-secondary px-3 text-sm" href={`/profesores/${professor.id}/resena/${courseId}`}>
            Crear reseña
          </Link>
        </div>
      </div>
    </article>
  );
}
