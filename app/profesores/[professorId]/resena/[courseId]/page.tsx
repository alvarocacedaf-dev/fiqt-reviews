import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ReviewForm } from '@/components/ReviewForm';
import { getCourse, getProfessor } from '@/lib/data';
import { createClient } from '@/lib/supabase/server';

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

  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) {
    redirect(`/registro?next=${encodeURIComponent(`/profesores/${professorId}/resena/${courseId}`)}`);
  }

  const [{ data: verifiedCourse }, { data: verifiedProfessor }] = await Promise.all([
    db.from('verified_courses')
      .select('id')
      .eq('user_id', user.id)
      .eq('course_id', courseId)
      .limit(1),
    db.from('verified_course_professors')
      .select('id')
      .eq('user_id', user.id)
      .eq('course_id', courseId)
      .eq('professor_id', professorId)
      .limit(1),
  ]);

  if (!verifiedCourse?.length || !verifiedProfessor?.length) {
    const message = !verifiedCourse?.length
      ? 'Aún no tienes este curso en tus cursos verificados, no puedes CREAR RESEÑA.'
      : 'Este profesor aún no está verificado para este curso en tu cuenta, no puedes CREAR RESEÑA.';

    return (
      <section className="panel mx-auto max-w-3xl">
        <p className="text-sm font-bold text-royal">CREAR RESEÑA</p>
        <h1 className="mt-1 text-2xl font-black text-ink">No puedes crear esta reseña</h1>
        <p className="mt-5 rounded-2xl bg-amber-50 p-5 font-bold leading-7 text-amber-950">{message}</p>
        <p className="mt-4 text-sm text-slate-600">Primero debes enviar una evidencia y esperar a que el curso y el profesor sean aprobados para tu cuenta.</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/verificacion" className="btn-primary">Solicitar verificación</Link>
          <Link href="/cursos-verificados" className="btn-secondary">Ver mis cursos verificados</Link>
          <Link href={`/cursos/${courseId}`} className="btn-secondary">Volver al curso</Link>
        </div>
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
