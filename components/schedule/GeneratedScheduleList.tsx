'use client';

import { useState } from 'react';
import { ConflictWarning } from './ConflictWarning';
import { ScheduleGrid } from './ScheduleGrid';
import { ScheduleSummary } from './ScheduleSummary';
import { Icon } from '@/components/ui/Icon';
import type { GeneratedSchedule } from '@/lib/schedule/types';

export function GeneratedScheduleList({ schedules, truncated }: { schedules: GeneratedSchedule[]; truncated: boolean }) {
  const [savedIds, setSavedIds] = useState<string[]>([]);

  function saveSchedule(schedule: GeneratedSchedule) {
    localStorage.setItem('fiqt-reviews-saved-schedule', JSON.stringify({ academicTerm: '2026-2', schedule, savedAt: new Date().toISOString() }));
    setSavedIds((current) => current.includes(schedule.id) ? current : [...current, schedule.id]);
  }

  return (
    <section className="space-y-8">
      <div className="flex flex-col gap-2 text-white sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-gold">Resultados</p>
          <h2 className="mt-1 text-3xl font-black">Tus mejores horarios</h2>
        </div>
        {truncated && <p className="max-w-md text-sm text-blue-100">Se aplicó una búsqueda optimizada para evaluar las combinaciones más prometedoras sin congelar la página.</p>}
      </div>

      {schedules.map((schedule, index) => (
        <article className="overflow-hidden rounded-[1.5rem] border border-white/15 bg-white shadow-card" key={schedule.id}>
          <header className="bg-gradient-to-r from-[#071a3d] to-[#123c88] p-5 sm:p-7">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="text-white">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-2xl font-black">Horario {index + 1}</h3>
                  {index === 0 && <span className="rounded-full border border-gold/60 bg-gold/15 px-3 py-1 text-xs font-black uppercase tracking-wide text-gold">Opción recomendada</span>}
                </div>
                <p className="mt-1 text-sm text-blue-100">{schedule.sections.map((section) => `${section.courseId}-${section.section}`).join(' · ')}</p>
              </div>
              <div className="w-full lg:max-w-xl"><ScheduleSummary schedule={schedule} /></div>
            </div>
          </header>

          <div className="space-y-4 p-4 sm:p-6">
            <ConflictWarning schedule={schedule} />
            <ScheduleGrid schedule={schedule} />
            <div className="flex flex-wrap gap-3">
              <button className="btn-primary gap-2" onClick={() => saveSchedule(schedule)} type="button">
                <Icon className="h-4 w-4" name="check" />
                {savedIds.includes(schedule.id) ? 'Horario guardado' : 'Guardar horario'}
              </button>
              <button className="btn-secondary gap-2" disabled title="Disponible en una próxima versión" type="button">
                <Icon className="h-4 w-4" name="file" />
                Descargar imagen · Próximamente
              </button>
            </div>
          </div>
        </article>
      ))}
    </section>
  );
}
