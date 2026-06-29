import { ProfessorCard } from '@/components/ProfessorCard';
import { getCourse, getCourseProfessors, getProfessorReviews } from '@/lib/data';

const courseSyllabi: Record<string, { label: string; href: string }> = {
  BDI01: {
    label: 'Ver sílabo del curso',
    href: '/silabos/BDI01-dibujo-en-ingenieria-i.pdf'
  },
  BDI02: {
    label: 'Ver sílabo del curso',
    href: '/silabos/BDI02-dibujo-en-ingenieria-ii.pdf'
  },
  BEF01: {
    label: 'Ver sílabo del curso',
    href: '/silabos/BEF01-etica-y-filosofia-politica.pdf'
  },
  BEG01: {
    label: 'Ver sílabo del curso',
    href: '/silabos/BEG01-economia-general.pdf'
  },
  BFI01: {
    label: 'Ver sílabo del curso',
    href: '/silabos/BFI01-fisica-i.pdf'
  },
  BFI02: {
    label: 'Ver sílabo del curso',
    href: '/silabos/BFI02-fisica-ii.pdf'
  },
  BFI03: {
    label: 'Ver sílabo del curso',
    href: '/silabos/BFI03-fisica-iii.pdf'
  },
  BFI04: {
    label: 'Ver sílabo del curso',
    href: '/silabos/BFI04-topicos-especiales-en-fisica.pdf'
  },
  BIC01: {
    label: 'Ver sílabo del curso',
    href: '/silabos/BIC01-introduccion-a-la-computacion.pdf'
  },
  BMA01: {
    label: 'Ver sílabo del curso',
    href: '/silabos/BMA01-calculo-diferencial.pdf'
  },
  BMA02: {
    label: 'Ver sílabo del curso',
    href: '/silabos/BMA02-calculo-integral.pdf'
  },
  BMA03: {
    label: 'Ver sílabo del curso',
    href: '/silabos/BMA03-algebra-lineal.pdf'
  },
  BMA04: {
    label: 'Ver sílabo del curso',
    href: '/silabos/BMA04-matematicas-basicas.pdf'
  },
  BMA05: {
    label: 'Ver sílabo del curso',
    href: '/silabos/BMA05-matematica-superior-i.pdf'
  },
  BMA06: {
    label: 'Ver sílabo del curso',
    href: '/silabos/BMA06-matematica-superior-ii.pdf'
  },
  BQU01: {
    label: 'Ver sílabo del curso',
    href: '/silabos/BQU01-quimica-i.pdf'
  },
  BQU02: {
    label: 'Ver sílabo del curso',
    href: '/silabos/BQU02-quimica-ii.pdf'
  },
  BRC01: {
    label: 'Ver sílabo del curso',
    href: '/silabos/BRC01-redaccion-y-comunicacion.pdf'
  },
  EP308: {
    label: 'Ver sílabo del curso',
    href: '/silabos/EP308-economia-y-organizacion-de-la-empresa.pdf'
  },
  MA613: {
    label: 'Ver sílabo del curso',
    href: '/silabos/MA613-estadistica-aplicada.pdf'
  },
  MA713: {
    label: 'Ver sílabo del curso',
    href: '/silabos/MA713-programacion-digital.pdf'
  },
  QU216: {
    label: 'Ver sílabo del curso',
    href: '/silabos/QU216-quimica-inorganica.pdf'
  },
  QU427: {
    label: 'Ver sílabo del curso',
    href: '/silabos/QU427-fisico-quimica-i.pdf'
  }
};

export default async function CoursePage({ params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = await params;
  const course = await getCourse(courseId);
  const professors = await getCourseProfessors(courseId);
  const rows = await Promise.all(professors.map(async professor => [professor.id, await getProfessorReviews(professor.id)] as const));
  const reviews = Object.fromEntries(rows);
  const syllabus = course?.code ? courseSyllabi[course.code] : null;

  return (
    <section>
      <div className="mb-6 text-white">
        <p className="text-sm font-bold text-gold">{course?.code ?? 'CURSO'}</p>
        <h1 className="text-3xl font-black">{course?.name ?? 'Profesores'}</h1>
        <p className="mt-1 text-blue-100">
          Docentes asociados como información pública referencial. Fuente visible: DIRCE UNI.
        </p>
        {syllabus && (
          <a
            href={syllabus.href}
            target="_blank"
            rel="noreferrer"
            className="mt-4 inline-flex items-center rounded-2xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:border-gold hover:bg-gold hover:text-ink"
          >
            📄 {syllabus.label}
          </a>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {professors.map(professor => (
          <ProfessorCard key={professor.id} professor={professor} courseId={courseId} courseName={course?.name ?? ''} reviews={reviews[professor.id]} />
        ))}
      </div>

      {!professors.length && <p className="panel">No hay profesores asociados a este curso todavía.</p>}
    </section>
  );
}
