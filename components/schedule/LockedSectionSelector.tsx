import type { CourseSection, LockedSectionMap } from '@/lib/schedule/types';

type SelectedCourse = {
  id: string;
  name: string;
  department: string;
  sections: CourseSection[];
};

function isUnavailable(section: CourseSection) {
  return section.closed === true || (section.availableSeats != null && section.availableSeats <= 0);
}

function sectionDetails(section: CourseSection) {
  const professors = section.professors.length > 0 ? section.professors.join(', ') : 'Profesor por confirmar';
  const blocks = section.blocks
    .map((block) => `${block.day.slice(0, 3)} ${block.startTime}–${block.endTime}`)
    .join(' / ');
  const vacancies = section.availableSeats == null
    ? ''
    : ` · ${section.availableSeats}${section.capacity ? `/${section.capacity}` : ''} vacantes`;
  return `${professors} · ${blocks}${vacancies}${isUnavailable(section) ? ' · SIN VACANTES' : ''}`;
}

export function LockedSectionSelector({
  courses,
  lockedSections,
  onChange,
  onClear,
}: {
  courses: SelectedCourse[];
  lockedSections: LockedSectionMap;
  onChange: (courseId: string, sectionId: string | null) => void;
  onClear: () => void;
}) {
  if (courses.length === 0) return null;
  const lockedCount = courses.filter((course) => Boolean(lockedSections[course.id])).length;

  return (
    <section className="rounded-[1.25rem] border border-white/15 bg-white/95 p-5 shadow-card sm:p-7">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-3xl">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-royal">Paso 2</p>
          <h2 className="mt-1 text-2xl font-black text-ink">Secciones obligatorias</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Si ya sabes que llevarás un curso en una sección específica por disponibilidad de vacantes o matrícula,
            fíjala aquí. El generador armará tus horarios respetando esa sección.
          </p>
        </div>
        <button
          className="btn-secondary shrink-0 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={lockedCount === 0}
          onClick={onClear}
          type="button"
        >
          Limpiar secciones fijas
        </button>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        {courses.map((course) => {
          const lockedId = lockedSections[course.id] ?? '';
          const lockedSection = course.sections.find((section) => section.id === lockedId);
          const automaticCandidates = course.sections.filter((section) => !isUnavailable(section));
          return (
            <article className="rounded-2xl border border-slate-200 bg-white p-4" key={course.id}>
              <div>
                <p className="text-xs font-black uppercase tracking-wide text-royal">{course.id} · {course.department}</p>
                <h3 className="mt-1 font-black text-ink">{course.name}</h3>
              </div>
              <label className="mt-3 block text-sm font-bold text-slate-700">
                Sección obligatoria
                <select
                  aria-label={`Sección obligatoria de ${course.name}`}
                  className="input mt-1 w-full"
                  onChange={(event) => onChange(course.id, event.target.value || null)}
                  value={lockedId}
                >
                  <option value="">Sin sección fija</option>
                  {course.sections.map((section) => (
                    <option key={section.id} value={section.id}>
                      Sección {section.section} · {sectionDetails(section)}
                    </option>
                  ))}
                </select>
              </label>
              {lockedSection && (
                <p className="mt-2 text-xs leading-5 text-slate-600">{sectionDetails(lockedSection)}</p>
              )}
              {lockedSection && isUnavailable(lockedSection) && (
                <p className="mt-3 rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs font-bold leading-5 text-amber-900">
                  Esta sección aparece sin vacantes. Solo fíjala si ya estás matriculado o tienes autorización para llevarla.
                </p>
              )}
              {!lockedSection && automaticCandidates.length === 0 && (
                <p className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-bold leading-5 text-red-800">
                  Este curso no tiene secciones con vacantes para selección automática. Puedes fijar una sección bajo tu responsabilidad.
                </p>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
