import Link from 'next/link';
import { ReviewForm } from '@/components/ReviewForm';
import { getCourse, getProfessor } from '@/lib/data';

export default async function CreateReviewPage({ params }: { params: Promise<{ professorId: string; courseId: string }> }) {
  const { professorId, courseId } = await params;
  const [professor, course] = await Promise.all([getProfessor(professorId), getCourse(courseId)]);

  if (!professor || !course) {
    return (
      <section className="panel">
        <h1 className="text-2xl font-black text-ink">No encontramos esta reseña</h1>
        <p className="mt-2 text-slate-600">El profesor o curso no existe.</p>
        <Link href="/ciclos" className="btn-primary mt-5">Volver a ciclos</Link>
      </section>
    );
  }

  return (
    <section className="panel">
      <div className="mb-6">
        <p className="text-sm font-bold text-royal">CREAR RESEÑA</p>
        <h1 className="mt-1 text-2xl font-black text-ink">Comparte tu experiencia</h1>
        <p className="mt-2 text-slate-600">Profesor/a: {professor.full_name}</p>
        <p className="text-sm text-slate-600">Curso: {course.code} — {course.name}</p>
      </div>
      <ReviewForm professorId={professorId} courseId={courseId} />
    </section>
  );
}
