import { ProfessorCard } from '@/components/ProfessorCard';
import { getCourse, getCourseProfessors, getProfessorReviews } from '@/lib/data';

export default async function CoursePage({ params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = await params;
  const course = await getCourse(courseId);
  const professors = await getCourseProfessors(courseId);
  const rows = await Promise.all(professors.map(async professor => [professor.id, await getProfessorReviews(professor.id)] as const));
  const reviews = Object.fromEntries(rows);

  return (
    <section>
      <div className="mb-6 text-white">
        <p className="text-sm font-bold text-gold">{course?.code ?? 'CURSO'}</p>
        <h1 className="text-3xl font-black">{course?.name ?? 'Profesores'}</h1>
        <p className="mt-1 text-blue-100">
          Docentes asociados como información pública referencial. Fuente visible: DIRCE UNI.
        </p>
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
