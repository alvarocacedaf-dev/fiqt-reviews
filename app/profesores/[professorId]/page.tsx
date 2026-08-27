import { RatingSummary } from '@/components/RatingSummary';
import { ContentHeader } from '@/components/ContentHeader';
import { StatusBadge } from '@/components/StatusBadge';
import { Icon } from '@/components/ui/Icon';
import { getCourse, getCourseProfessors, getProfessor, getProfessorReviews, hasReviewAccess } from '@/lib/data';
import { demoCourseProfessors, demoCourses, isSupabaseConfigured } from '@/lib/demo';
import { getBundledMaterialForProfessor } from '@/lib/bundledCourseMaterials';
import { createClient } from '@/lib/supabase/server';

type CourseInfo = { name: string; code: string | null };
type CourseLink = {
  course_id: string;
  courses: CourseInfo | CourseInfo[] | null;
};

function getCourseInfo(link: CourseLink): CourseInfo | null {
  if (Array.isArray(link.courses)) return link.courses[0] ?? null;
  return link.courses;
}

export default async function ProfessorPage({
  params,
  searchParams,
}: {
  params: Promise<{ professorId: string }>;
  searchParams: Promise<{ courseId?: string | string[] }>;
}) {
  const [{ professorId }, query] = await Promise.all([params, searchParams]);
  const courseId = typeof query.courseId === 'string' ? query.courseId : null;
  const [hasGeneralReviewAccess, contextCourse, contextProfessors] = await Promise.all([
    hasReviewAccess(),
    courseId ? getCourse(courseId) : Promise.resolve(null),
    courseId ? getCourseProfessors(courseId) : Promise.resolve([]),
  ]);
  const isFirstCycleProfile = contextCourse?.cycle_id === 1
    && contextProfessors.some(professor => professor.id === professorId);
  const canViewReviews = hasGeneralReviewAccess || isFirstCycleProfile;

  if (!canViewReviews) {
    return (
      <section className="panel">
        <h1 className="text-2xl font-black text-ink">Perfil bloqueado</h1>
        <p className="mt-2 text-slate-600">Aún te falta completar tus 4 primeras reseñas</p>
      </section>
    );
  }

  const [professor, reviews] = await Promise.all([getProfessor(professorId), getProfessorReviews(professorId)]);
  let links: CourseLink[] = [];

  if (isSupabaseConfigured) {
    const db = await createClient();
    const { data } = await db.from('course_professors').select('course_id,courses(name,code)').eq('professor_id', professorId);
    links = (data ?? []) as unknown as CourseLink[];
  } else {
    links = demoCourseProfessors
      .filter(link => link.professor_id === professorId)
      .map(link => {
        const course = demoCourses.find(c => c.id === link.course_id);
        return { course_id: link.course_id, courses: course ? { name: course.name, code: course.code } : null };
      })
      .filter(link => link.courses);
  }

  const courseNames = links.map(link => getCourseInfo(link)?.name).filter(Boolean).join(', ');

  if (!professor) return <section className="panel">Profesor no encontrado.</section>;

  const material = getBundledMaterialForProfessor(professorId, professor.full_name);

  return (
    <section className="space-y-6">
      <ContentHeader
        actions={<div className="surface-muted min-w-48 bg-white p-3"><RatingSummary reviews={reviews} /></div>}
        description={<>Cursos asociados: {courseNames || 'Por asignar'}<span className="mt-1 block text-xs text-slate-500">Información pública referencial · Fuente: DIRCE UNI</span></>}
        eyebrow="Perfil docente"
        title={professor.full_name}
      />

      {material && (
        <div className="panel">
          <p className="text-sm font-bold text-royal">MATERIAL DEL CURSO</p>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-5">
            <div>
              <h2 className="text-xl font-black text-ink">{material.title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">{material.description}</p>
              <p className="mt-2 text-xs font-bold text-slate-500">
                Archivo {material.fileType} · {material.contents} · {(material.fileSize / (1024 * 1024)).toFixed(2)} MB
              </p>
            </div>
            <a
              className="btn-primary shrink-0"
              download={material.fileName}
              href={material.fileUrl}
            >
              {material.downloadLabel}
            </a>
          </div>
        </div>
      )}

      <div className="panel">
        <h2 className="text-xl font-black text-ink">Reseñas aprobadas</h2>
        <div className="mt-5 space-y-4">
          {reviews.map(review => (
            <article key={review.id} className="surface-card-interactive p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="flex items-center gap-2 font-semibold text-royal">
                <Icon className="h-4 w-4" name={review.recommendation === 'like' ? 'check' : 'close'} />
                {review.recommendation === 'like' ? 'Lo recomienda' : 'No lo recomienda'}
              </p>
                <StatusBadge tone={review.recommendation === 'like' ? 'success' : 'danger'}>
                  {review.recommendation === 'like' ? 'Recomendada' : 'No recomendada'}
                </StatusBadge>
              </div>
              <p className="mt-2 text-slate-700">{review.comment}</p>
              <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-200 pt-3">
                {review.selected_tags.map(tag => (
                  <StatusBadge key={tag} tone="info">{tag}</StatusBadge>
                ))}
              </div>
            </article>
          ))}
          {!reviews.length && <p className="text-slate-500">Todavía no hay reseñas aprobadas para este docente.</p>}
        </div>
      </div>
    </section>
  );
}
