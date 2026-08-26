import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';
import type { Course } from '@/lib/types';

export function CourseCard({ course }: { course: Course }) {
  return (
    <Link href={`/cursos/${course.id}`} className="surface-card-interactive group block p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-wider text-royal">{course.code ?? 'Curso'}</p>
          <h3 className="mt-1 font-bold text-ink">{course.name}</h3>
        </div>
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-royal transition group-hover:bg-royal group-hover:text-white">
          <Icon className="h-4 w-4 transition group-hover:translate-x-0.5" name="arrow-right" />
        </span>
      </div>
      <div className="mt-4 border-t border-slate-200 pt-3 text-xs font-semibold text-slate-500">
        {course.credits ? `${course.credits} créditos` : 'Créditos por confirmar'}
      </div>
    </Link>
  );
}
