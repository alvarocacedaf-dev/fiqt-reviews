'use client';

import { useMemo, useState } from 'react';
import { CourseSelector } from './CourseSelector';
import { GeneratedScheduleList } from './GeneratedScheduleList';
import { LockedSectionSelector } from './LockedSectionSelector';
import { detectConflicts, generateScheduleCombinations } from '@/lib/schedule/generator';
import type { CourseSection, LockedSectionMap, ScheduleGenerationResult } from '@/lib/schedule/types';
import { Icon } from '@/components/ui/Icon';

export function ScheduleBuilderPage({ sections }: { sections: CourseSection[] }) {
  const [selected, setSelected] = useState<string[]>([]);
  const [lockedSections, setLockedSections] = useState<LockedSectionMap>({});
  const [result, setResult] = useState<ScheduleGenerationResult | null>(null);
  const [message, setMessage] = useState('');

  const courses = useMemo(() => {
    const map = new Map<string, { id: string; name: string; department: string; sections: CourseSection[] }>();
    for (const section of sections) {
      const existing = map.get(section.courseId);
      if (existing) existing.sections.push(section);
      else map.set(section.courseId, { id: section.courseId, name: section.courseName, department: section.department, sections: [section] });
    }
    return [...map.values()].sort((left, right) => left.name.localeCompare(right.name, 'es'));
  }, [sections]);

  function toggleCourse(courseId: string) {
    setSelected((current) => {
      if (!current.includes(courseId)) return [...current, courseId];
      setLockedSections((locks) => {
        const next = { ...locks };
        delete next[courseId];
        return next;
      });
      return current.filter((id) => id !== courseId);
    });
    setResult(null);
    setMessage('');
  }

  function lockSection(courseId: string, sectionId: string | null) {
    setLockedSections((current) => ({ ...current, [courseId]: sectionId }));
    setResult(null);
    setMessage('');
  }

  function clearLockedSections() {
    setLockedSections({});
    setResult(null);
    setMessage('');
  }

  function generate() {
    if (selected.length === 0) {
      setMessage('Selecciona al menos un curso para generar tu horario.');
      setResult(null);
      return;
    }
    const groups = selected.map((courseId) => sections.filter((section) => section.courseId === courseId && section.blocks.length > 0));
    if (groups.some((group) => group.length === 0)) {
      setMessage('Uno de los cursos seleccionados no tiene secciones disponibles.');
      setResult(null);
      return;
    }
    const generated = generateScheduleCombinations(groups, 600, lockedSections);
    const lockedChoices = groups.flatMap((group) => group.filter((section) => lockedSections[section.courseId] === section.id));
    const lockedConflicts = detectConflicts(lockedChoices.flatMap((section) => section.blocks));
    setResult(generated);
    setMessage(
      generated.schedules.length === 0
        ? 'No se encontraron horarios posibles respetando las secciones obligatorias seleccionadas. Prueba liberar una sección fija o retirar algún curso.'
        : lockedConflicts.length > 0
          ? 'Las secciones obligatorias seleccionadas tienen cruces entre ellas.'
          : '',
    );
    requestAnimationFrame(() => document.getElementById('horarios-generados')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  }

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-[1.5rem] border border-white/15 bg-[#071a3d]/85 px-6 py-8 text-white shadow-card sm:px-10 sm:py-11">
        <div className="absolute -right-20 -top-24 h-64 w-64 rounded-full bg-blue-500/25 blur-3xl" />
        <div className="relative max-w-3xl">
          <div className="flex items-center gap-3 text-gold">
            <span className="h-10 w-1.5 rounded-full bg-gold" />
            <Icon className="h-8 w-8" name="calendar" />
            <p className="text-sm font-black uppercase tracking-[0.2em]">Nueva herramienta</p>
          </div>
          <h1 className="mt-4 text-4xl font-black sm:text-5xl">Arma tu horario 2026-2</h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-blue-100 sm:text-lg">Selecciona tus cursos y compara hasta tres combinaciones, priorizadas por cruces, tiempo perdido y días de asistencia.</p>
        </div>
      </section>

      <CourseSelector courses={courses} onToggle={toggleCourse} selected={selected} />

      <LockedSectionSelector
        courses={courses.filter((course) => selected.includes(course.id))}
        lockedSections={lockedSections}
        onChange={lockSection}
        onClear={clearLockedSections}
      />

      <section className="flex flex-col gap-3 rounded-[1.25rem] border border-white/15 bg-[#0b1f46]/90 p-5 text-white shadow-card sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-black">¿Listo para comparar?</p>
          <p className="mt-1 text-sm text-blue-100">Se elegirá una sección completa por cada curso, incluyendo teoría y práctica/laboratorio.</p>
        </div>
        <button className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-gold px-5 py-3 font-black text-ink transition hover:-translate-y-0.5 hover:bg-yellow-300 hover:shadow-lg" onClick={generate} type="button">
          <Icon className="h-5 w-5" name="calendar" />
          Generar horarios
        </button>
      </section>

      {message && <p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 font-bold text-amber-900">{message}</p>}
      {result && result.schedules.length > 0 && <div id="horarios-generados"><GeneratedScheduleList schedules={result.schedules} truncated={result.truncated} /></div>}
    </div>
  );
}
