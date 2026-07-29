import { RatingSummary } from '@/components/RatingSummary';
import { getProfessor, getProfessorReviews } from '@/lib/data';
import { demoCourseProfessors, demoCourses, isSupabaseConfigured } from '@/lib/demo';
import { createClient } from '@/lib/supabase/server';

type CourseInfo = { name: string; code: string | null };
type CourseLink = {
  course_id: string;
  courses: CourseInfo | CourseInfo[] | null;
};

const professorMaterials: Record<string, {
  title: string;
  description: string;
  fileUrl: string;
  fileName: string;
  documentCount: number;
}> = {
  'b44d0eec-61bf-4f5d-920c-070dfd18389d': {
    title: 'Material teórico de Física III',
    description: 'Colección de temas compartidos para complementar el estudio del curso.',
    fileUrl: '/materiales/fisica-iii-carhuancho-material-teorico.zip',
    fileName: 'Fisica-III-Carhuancho-material-teorico.zip',
    documentCount: 12,
  },
};

function getCourseInfo(link: CourseLink): CourseInfo | null {
  if (Array.isArray(link.courses)) return link.courses[0] ?? null;
  return link.courses;
}

export default async function ProfessorPage({ params }: { params: Promise<{ professorId: string }> }) {
  const { professorId } = await params;
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
  const material = professorMaterials[professorId];

  if (!professor) return <section className="panel">Profesor no encontrado.</section>;

  return (
    <section className="space-y-6">
      <div className="panel">
        <p className="text-sm font-bold text-royal">PERFIL DOCENTE</p>
        <h1 className="mt-1 text-3xl font-black text-ink">{professor.full_name}</h1>
        <p className="mt-2 text-slate-600">Cursos asociados: {courseNames || 'Por asignar'}</p>
        <p className="mt-2 text-xs leading-5 text-slate-500">Información pública referencial. Fuente: DIRCE UNI.</p>
        <div className="mt-5">
          <RatingSummary reviews={reviews} />
        </div>
      </div>

      {material && (
        <div className="panel">
          <p className="text-sm font-bold text-royal">MATERIAL DEL CURSO</p>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-5">
            <div>
              <h2 className="text-xl font-black text-ink">{material.title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">{material.description}</p>
              <p className="mt-2 text-xs font-bold text-slate-500">
                Archivo ZIP · {material.documentCount} documentos PDF
              </p>
            </div>
            <a
              className="btn-primary shrink-0"
              download={material.fileName}
              href={material.fileUrl}
            >
              Descargar carpeta ZIP
            </a>
          </div>
        </div>
      )}

      <div className="panel">
        <h2 className="text-xl font-black text-ink">Reseñas aprobadas</h2>
        <div className="mt-5 space-y-4">
          {reviews.map(review => (
            <article key={review.id} className="rounded-2xl bg-slate-50 p-4">
              <p className="font-semibold text-royal">{review.recommendation === 'like' ? '✓ Lo recomienda' : '✕ No lo recomienda'}</p>
              <p className="mt-2 text-slate-700">{review.comment}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {review.selected_tags.map(tag => (
                  <span className="rounded-full bg-blue-100 px-2 py-1 text-xs text-royal" key={tag}>{tag}</span>
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
