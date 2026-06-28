import { CourseCard } from '@/components/CourseCard';
import { getCourses, getCycles } from '@/lib/data';

function cycleHeader(cycle?: { number: number; name: string }) {
  if (!cycle) return { eyebrow: 'CURSOS', title: 'Cursos' };
  if (cycle.number === 11) return { eyebrow: 'ELECTIVOS', title: 'Cursos electivos' };
  if (cycle.number === 12) return { eyebrow: 'COMPLEMENTARIOS', title: 'Cursos complementarios' };
  return { eyebrow: `CICLO ${cycle.number}`, title: cycle.name };
}

export default async function CyclePage({ params }: { params: Promise<{ cycleId: string }> }) {
  const { cycleId } = await params;
  const [courses, cycles] = await Promise.all([getCourses(cycleId), getCycles()]);
  const cycle = cycles.find(c => String(c.id) === cycleId);
  const header = cycleHeader(cycle);

  return (
    <section>
      <div className="mb-6 text-white">
        <p className="text-sm font-bold text-gold">{header.eyebrow}</p>
        <h1 className="text-3xl font-black">{header.title}</h1>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {courses.map(course => <CourseCard key={course.id} course={course} />)}
      </div>
      {!courses.length && <p className="panel">No hay cursos disponibles en esta sección todavía.</p>}
    </section>
  );
}
