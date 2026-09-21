'use client';

import { useEffect, useState } from 'react';
import { ScheduleGrid } from './ScheduleGrid';
import { SCHEDULE_DAYS, type Day, type GeneratedSchedule } from '@/lib/schedule/types';
import { timeToMinutes } from '@/lib/schedule/generator';
import { courseColors } from '@/lib/schedule/presentation';

export function ScheduleExplorer({ schedule, daily = false }: { schedule: GeneratedSchedule; daily?: boolean }) {
  const [view, setView] = useState<'week' | 'day'>('week');
  const [day, setDay] = useState<Day | 'Domingo'>('Lunes');
  useEffect(() => {
    if (!daily) return;
    const today = new Intl.DateTimeFormat('es-PE', { weekday: 'long', timeZone: 'America/Lima' }).format(new Date());
    setDay((today[0].toUpperCase() + today.slice(1)) as Day | 'Domingo');
    if (window.matchMedia('(max-width: 767px)').matches) setView('day');
  }, [daily]);
  const blocks = schedule.blocks.filter(b => b.day === day).sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));
  let latestEnd = 0;
  const colors = courseColors(schedule.blocks);
  return (
    <section className="space-y-4" aria-label="Explorar horario">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-xl bg-slate-100 p-1" aria-label="Vista del horario">
          {(['week', 'day'] as const).map(value => <button key={value} type="button" aria-pressed={view === value} onClick={() => setView(value)} className={`min-h-11 rounded-lg px-5 text-sm font-semibold ${view === value ? 'bg-white text-royal shadow-sm' : 'text-slate-600'}`}>{value === 'week' ? 'Semana' : 'Día'}</button>)}
        </div>
        {view === 'week' && <p className="text-xs text-slate-500">Selecciona una clase para ver sus detalles.</p>}
      </div>
      {view === 'week' ? <>
        <p className="text-sm text-slate-600 md:hidden">Desliza la cuadrícula para recorrer la semana, o usa Día para leer las clases completas.</p>
        <ScheduleGrid schedule={schedule} />
      </> : <>
        <div className="flex flex-wrap gap-2" aria-label="Día de la semana">
          {[...SCHEDULE_DAYS, 'Domingo' as const].map(value => <button key={value} type="button" aria-pressed={day === value} onClick={() => setDay(value)} className={`min-h-11 rounded-xl border px-3 text-sm font-semibold ${day === value ? 'border-royal bg-royal text-white' : 'border-slate-200 text-slate-600'}`}>{value}</button>)}
        </div>
        <h4 className="text-lg font-bold text-ink">{day}</h4>
        {!blocks.length && <div className="rounded-2xl bg-slate-50 p-6 text-slate-600">No tienes clases este día. Elige otro día para consultar tu semana.</div>}
        {blocks.map(block => {
          const start = timeToMinutes(block.startTime);
          const gap = latestEnd ? Math.max(0, start - latestEnd) : 0;
          latestEnd = Math.max(latestEnd, timeToMinutes(block.endTime));
          const conflicts = schedule.conflicts.filter(c => c.blocks.some(b => b.id === block.id));
          return <div key={block.id}>
            {gap > 0 && <p className="mb-3 border-l-2 border-dashed border-slate-300 py-2 pl-4 text-sm text-slate-500">{gap} min libres entre clases</p>}
            <article className="rounded-2xl border border-slate-200 border-l-8 bg-slate-50 p-5" style={{ borderLeftColor: colors[block.courseId] }}>
              <p className="text-sm font-bold text-royal">{block.startTime}–{block.endTime}</p>
              <h5 className="mt-1 text-lg font-bold text-ink">{block.courseName}</h5>
              <p className="mt-2 text-sm text-slate-600">{block.courseId} · {block.type} · Sección {block.section}</p>
              <p className="mt-1 text-sm text-slate-600">{block.professorName || 'Profesor por confirmar'}</p>
              {conflicts.map((c, i) => <p key={i} className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-800">Cruce con {c.blocks.find(b => b.id !== block.id)?.courseName}: {c.startTime}–{c.endTime} ({c.minutes} min).</p>)}
            </article>
          </div>;
        })}
      </>}
    </section>
  );
}
