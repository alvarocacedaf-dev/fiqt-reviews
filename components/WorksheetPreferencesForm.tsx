'use client';

import { useState } from 'react';
import { useFormStatus } from 'react-dom';
import { saveWorksheetPreferences } from '@/app/planchas/actions';

type CourseOption = {
  id: string;
  code: string | null;
  name: string;
  cycleLabel: string;
};

type ColumnProps = {
  blocked: Set<string>;
  courses: CourseOption[];
  description: string;
  disabled: boolean;
  emptyText: string;
  onAdd: (courseId: string) => void;
  onRemove: (courseId: string) => void;
  selected: Set<string>;
  title: string;
};

function CourseColumn({
  blocked,
  courses,
  description,
  disabled,
  emptyText,
  onAdd,
  onRemove,
  selected,
  title,
}: ColumnProps) {
  const selectedCourses = courses.filter(course => selected.has(course.id));
  const availableCourses = courses.filter(course => !selected.has(course.id) && !blocked.has(course.id));

  return (
    <section className={`surface-card p-5 ${disabled ? 'opacity-60' : ''}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-black text-ink">{title}</h2>
          <p className="mt-1 text-sm leading-6 text-slate-600">{description}</p>
        </div>
        <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-royal">
          {selected.size} seleccionado{selected.size === 1 ? '' : 's'}
        </span>
      </div>

      <label className="mt-5 block text-sm font-black text-ink">
        Seleccionar curso
        <select
          className="input mt-2 w-full disabled:cursor-not-allowed"
          defaultValue=""
          disabled={disabled}
          onChange={event => {
            if (!event.target.value) return;
            onAdd(event.target.value);
            event.target.value = '';
          }}
        >
          <option value="">Abre el desplegable para elegir un curso</option>
          {availableCourses.map(course => (
            <option key={course.id} value={course.id}>
              {course.code || 'Sin código'} — {course.name} · {course.cycleLabel}
            </option>
          ))}
        </select>
      </label>

      <div className="mt-5 border-t border-slate-200 pt-4">
        <h3 className="text-sm font-black uppercase tracking-wider text-royal">Cursos seleccionados</h3>
        <div className="mt-3 space-y-2">
          {selectedCourses.map(course => (
            <article
              className="surface-muted flex items-start justify-between gap-4 border-blue-100 bg-blue-50 p-4"
              key={course.id}
            >
              <div className="min-w-0">
                <p className="font-black text-ink">
                  {course.code || 'Sin código'} — {course.name}
                </p>
                <p className="mt-1 text-xs font-semibold text-slate-500">{course.cycleLabel}</p>
              </div>
              <button
                className="shrink-0 rounded-xl border border-red-200 bg-white px-3 py-2 text-xs font-black text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed"
                disabled={disabled}
                onClick={() => onRemove(course.id)}
                type="button"
              >
                Quitar
              </button>
            </article>
          ))}

          {!selectedCourses.length && (
            <p className="surface-muted p-4 text-sm text-slate-600">{emptyText}</p>
          )}
        </div>
      </div>

      {!availableCourses.length && courses.length > 0 && (
        <p className="mt-4 text-xs font-semibold text-slate-500">
          Todos los cursos disponibles ya están seleccionados en una de las columnas.
        </p>
      )}
      {!courses.length && (
        <p className="surface-muted mt-4 border-amber-100 bg-amber-50 p-4 text-sm font-semibold text-amber-900">
          Todavía no hay cursos disponibles.
        </p>
      )}
    </section>
  );
}

function SaveButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();

  return (
    <button
      className="btn-primary min-w-52 disabled:cursor-not-allowed disabled:opacity-50"
      disabled={disabled || pending}
      type="submit"
    >
      {pending ? 'Guardando…' : 'Guardar mis selecciones'}
    </button>
  );
}

export function WorksheetPreferencesForm({
  courses,
  initialHave,
  initialWant,
  isUnlocked,
  approvedReviews,
  requiredReviews,
}: {
  courses: CourseOption[];
  initialHave: string[];
  initialWant: string[];
  isUnlocked: boolean;
  approvedReviews: number;
  requiredReviews: number;
}) {
  const [have, setHave] = useState(() => new Set(initialHave));
  const [want, setWant] = useState(() => new Set(initialWant));

  function addHave(courseId: string) {
    setWant(current => {
      const next = new Set(current);
      next.delete(courseId);
      return next;
    });
    setHave(current => new Set(current).add(courseId));
  }

  function addWant(courseId: string) {
    setHave(current => {
      const next = new Set(current);
      next.delete(courseId);
      return next;
    });
    setWant(current => new Set(current).add(courseId));
  }

  function removeHave(courseId: string) {
    setHave(current => {
      const next = new Set(current);
      next.delete(courseId);
      return next;
    });
  }

  function removeWant(courseId: string) {
    setWant(current => {
      const next = new Set(current);
      next.delete(courseId);
      return next;
    });
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
          blocked={want}
          courses={courses}
          description="Elige en el desplegable los cursos de los que puedes compartir planchas."
          disabled={!isUnlocked}
          emptyText="Aún no seleccionaste cursos en esta columna."
          onAdd={addHave}
          onRemove={removeHave}
          selected={have}
          title="Planchas que tengo"
        />
        <CourseColumn
          blocked={have}
          courses={courses}
          description="Elige en el desplegable los cursos cuyas planchas te gustaría conseguir."
          disabled={!isUnlocked}
          emptyText="Aún no seleccionaste cursos en esta columna."
          onAdd={addWant}
          onRemove={removeWant}
          selected={want}
          title="Planchas que quiero"
        />
      </div>

      <div className="surface-muted mt-6 flex flex-col items-center justify-between gap-4 border-blue-100 bg-blue-50 p-5 sm:flex-row">
        {isUnlocked ? (
          <div>
            <p className="font-black text-royal">Comunidad de planchas desbloqueada</p>
            <p className="mt-1 text-sm leading-6 text-slate-700">
              Usa <strong>Quitar</strong> para retirar un curso y luego guarda los cambios.
            </p>
          </div>
        ) : (
          <div>
            <p className="font-black text-ink">Desplegables bloqueados</p>
            <p className="mt-1 text-sm leading-6 text-slate-700">
              Se desbloquean con {requiredReviews} reseñas aprobadas. Actualmente tienes {approvedReviews}.
            </p>
          </div>
        )}
        <SaveButton disabled={!isUnlocked} />
      </div>
    </form>
  );
}
