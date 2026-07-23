'use client';

import { useMemo, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { saveWorksheetPreferences } from '@/app/planchas/actions';

type CourseOption = {
  id: string;
  code: string | null;
  name: string;
  cycleLabel: string;
};

type ColumnProps = {
  courses: CourseOption[];
  description: string;
  emptyText: string;
  onToggle: (courseId: string) => void;
  query: string;
  selected: Set<string>;
  setQuery: (value: string) => void;
  title: string;
};

function CourseColumn({
  courses,
  description,
  emptyText,
  onToggle,
  query,
  selected,
  setQuery,
  title,
}: ColumnProps) {
  const visibleCourses = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return courses;

    return courses.filter(course =>
      `${course.code ?? ''} ${course.name} ${course.cycleLabel}`.toLowerCase().includes(normalizedQuery),
    );
  }, [courses, query]);

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-black text-ink">{title}</h2>
          <p className="mt-1 text-sm leading-6 text-slate-600">{description}</p>
        </div>
        <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-royal">
          {selected.size} seleccionado{selected.size === 1 ? '' : 's'}
        </span>
      </div>

      <input
        className="input mt-5 w-full"
        onChange={event => setQuery(event.target.value)}
        placeholder="Buscar por código, curso o ciclo"
        type="search"
        value={query}
      />

      <div className="mt-4 max-h-[520px] space-y-2 overflow-y-auto pr-1">
        {visibleCourses.map(course => {
          const checked = selected.has(course.id);
          return (
            <label
              className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-3 transition ${
                checked
                  ? 'border-royal bg-blue-50 shadow-sm'
                  : 'border-slate-200 bg-slate-50 hover:border-blue-300 hover:bg-white'
              }`}
              key={course.id}
            >
              <input
                checked={checked}
                className="mt-1 h-4 w-4 shrink-0 accent-[#123c88]"
                onChange={() => onToggle(course.id)}
                type="checkbox"
              />
              <span className="min-w-0">
                <span className="block font-black text-ink">
                  {course.code || 'Sin código'} — {course.name}
                </span>
                <span className="mt-1 block text-xs font-semibold text-slate-500">{course.cycleLabel}</span>
              </span>
            </label>
          );
        })}

        {!visibleCourses.length && (
          <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">{emptyText}</p>
        )}
      </div>
    </section>
  );
}

function SaveButton() {
  const { pending } = useFormStatus();

  return (
    <button className="btn-primary min-w-52 disabled:cursor-wait disabled:opacity-60" disabled={pending} type="submit">
      {pending ? 'Guardando…' : 'Guardar mis selecciones'}
    </button>
  );
}

export function WorksheetPreferencesForm({
  courses,
  initialHave,
  initialWant,
}: {
  courses: CourseOption[];
  initialHave: string[];
  initialWant: string[];
}) {
  const [have, setHave] = useState(() => new Set(initialHave));
  const [want, setWant] = useState(() => new Set(initialWant));
  const [haveQuery, setHaveQuery] = useState('');
  const [wantQuery, setWantQuery] = useState('');

  function toggleHave(courseId: string) {
    const next = new Set(have);
    if (next.has(courseId)) {
      next.delete(courseId);
    } else {
      next.add(courseId);
      setWant(current => {
        const withoutCourse = new Set(current);
        withoutCourse.delete(courseId);
        return withoutCourse;
      });
    }
    setHave(next);
  }

  function toggleWant(courseId: string) {
    const next = new Set(want);
    if (next.has(courseId)) {
      next.delete(courseId);
    } else {
      next.add(courseId);
      setHave(current => {
        const withoutCourse = new Set(current);
        withoutCourse.delete(courseId);
        return withoutCourse;
      });
    }
    setWant(next);
  }

  return (
    <form action={saveWorksheetPreferences}>
      {[...have].map(courseId => (
        <input key={`have-${courseId}`} name="have_course_ids" type="hidden" value={courseId} />
      ))}
      {[...want].map(courseId => (
        <input key={`want-${courseId}`} name="want_course_ids" type="hidden" value={courseId} />
      ))}

      <div className="grid gap-6 lg:grid-cols-2">
        <CourseColumn
          courses={courses}
          description="Marca los cursos de los que puedes compartir planchas."
          emptyText="No encontramos cursos con esa búsqueda."
          onToggle={toggleHave}
          query={haveQuery}
          selected={have}
          setQuery={setHaveQuery}
          title="Planchas que tengo"
        />
        <CourseColumn
          courses={courses}
          description="Marca los cursos cuyas planchas te gustaría conseguir."
          emptyText="No encontramos cursos con esa búsqueda."
          onToggle={toggleWant}
          query={wantQuery}
          selected={want}
          setQuery={setWantQuery}
          title="Planchas que quiero"
        />
      </div>

      <div className="mt-6 flex flex-col items-center justify-between gap-4 rounded-3xl border border-blue-100 bg-blue-50 p-5 sm:flex-row">
        <p className="text-sm leading-6 text-slate-700">
          Un mismo curso solo puede estar en una de las dos columnas. Puedes regresar y modificar tus selecciones cuando quieras.
        </p>
        <SaveButton />
      </div>
    </form>
  );
}

