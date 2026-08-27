import Link from 'next/link';
import { ContentHeader } from '@/components/ContentHeader';
import { Icon } from '@/components/ui/Icon';
import { getCourse } from '@/lib/data';

export default async function CourseMaterialPage({ params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = await params;
  const course = await getCourse(courseId);

  return (
    <section>
      <ContentHeader
        description="Este espacio quedará reservado para las carpetas, archivos y libros del curso."
        eyebrow={course?.code ?? 'Material académico'}
        title={`Material de ${course?.name ?? 'curso'}`}
        tone="dark"
      />

      <div className="panel max-w-3xl">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-royal">
          <Icon className="h-6 w-6" name="folder" />
        </span>
        <h2 className="mt-4 text-xl font-black text-ink">Material próximamente</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Aquí se incorporarán las carpetas desplegables con archivos y libros de este curso.
        </p>
        <Link className="btn-secondary mt-5 gap-2" href={`/cursos/${courseId}`}>
          <Icon className="h-4 w-4" name="arrow-left" />
          Volver al curso
        </Link>
      </div>
    </section>
  );
}
