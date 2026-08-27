'use client';

import { useMemo, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import type { CourseSection } from '@/lib/schedule/types';

type CourseOption = {
  id: string;
  name: string;
  department: string;
  sections: CourseSection[];
};

export function CourseSelector({ courses, selected, onToggle }: { courses: CourseOption[]; selected: string[]; onToggle: (courseId: string) => void }) {
  const [query, setQuery] = useState('');
  const normalizedQuery = query.trim().toLocaleLowerCase('es-PE');
  const filtered = useMemo(() => courses.filter((course) =>
    !normalizedQuery
    || course.name.toLocaleLowerCase('es-PE').includes(normalizedQuery)
    || course.id.toLocaleLowerCase('es-PE').includes(normalizedQuery)), [courses, normalizedQuery]);

  return (
    <section className="rounded-[1.25rem] border border-white/15 bg-white/95 p-5 shadow-card sm:p-7">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-royal">Paso 1</p>
          <h2 className="mt-1 text-2xl font-black text-ink">Elige tus cursos</h2>
          <p className="mt-1 text-sm text-slate-600">Carga académica oficial 2026-2 · {courses.length} cursos con horario disponible.</p>
        </div>
        <span className="w-fit rounded-full bg-blue-50 px-3 py-1.5 text-sm font-black text-royal">{selected.length} seleccionados</span>
      </div>

      <label className="relative mt-5 block">
        <span className="sr-only">Buscar curso</span>
        <Icon className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" name="library" />
        <input className="input pl-10" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por nombre o código" />
      </label>

      <div className="mt-4 max-h-[25rem] overflow-y-auto pr-1">
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((course) => {
            const isSelected = selected.includes(course.id);
            return (
              <button
                aria-pressed={isSelected}
                className={`group flex min-h-24 items-start gap-3 rounded-2xl border p-4 text-left transition ${isSelected ? 'border-royal bg-blue-50 shadow-sm ring-1 ring-royal' : 'border-slate-200 bg-white hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md'}`}
                key={course.id}
                onClick={() => onToggle(course.id)}
                type="button"
              >
                <span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border ${isSelected ? 'border-royal bg-royal text-white' : 'border-slate-300 text-transparent'}`}>
                  <Icon className="h-4 w-4" name="check" />
                </span>
                <span className="min-w-0">
                  <span className="block text-xs font-black uppercase tracking-wide text-royal">{course.id} · {course.department}</span>
                  <span className="mt-1 block font-bold leading-5 text-ink">{course.name}</span>
                  <span className="mt-1 block text-xs text-slate-500">{course.sections.length} {course.sections.length === 1 ? 'sección' : 'secciones'}</span>
                </span>
              </button>
            );
          })}
        </div>
        {filtered.length === 0 && <p className="surface-muted p-6 text-center text-sm text-slate-600">No encontramos cursos con esa búsqueda.</p>}
      </div>
    </section>
  );
}
