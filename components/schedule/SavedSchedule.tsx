'use client';

import { useEffect, useState } from 'react';
import { GeneratedScheduleList } from './GeneratedScheduleList';
import type { GeneratedSchedule } from '@/lib/schedule/types';
import { SCHEDULE_DAYS } from '@/lib/schedule/types';

export function SavedSchedule() {
  const [schedule, setSchedule] = useState<GeneratedSchedule | null>(null);
  const [message, setMessage] = useState('Buscando tu horario guardado…');
  useEffect(() => {
    try {
      const value = JSON.parse(localStorage.getItem('fiqt-reviews-saved-schedule') || 'null');
      if (!value) { setMessage('Todavía no has guardado un horario en este navegador.'); return; }
      const s = value.schedule;
      if (value.academicTerm !== '2026-2') { setMessage('El horario guardado pertenece a otro periodo. Genera uno para 2026-2.'); return; }
      if (!s || typeof s.id !== 'string' || !Array.isArray(s.blocks) || !s.blocks.length || !Array.isArray(s.sections) || !Array.isArray(s.conflicts) || !Array.isArray(s.lockedSectionIds)
        || !s.blocks.every((b: GeneratedSchedule['blocks'][number]) => b && typeof b.id === 'string' && typeof b.courseId === 'string' && typeof b.courseName === 'string' && SCHEDULE_DAYS.includes(b.day) && /^\d{2}:\d{2}$/.test(b.startTime) && /^\d{2}:\d{2}$/.test(b.endTime))) {
        setMessage('No se pudo leer el horario guardado. Genera y guarda uno nuevo.'); return;
      }
      setSchedule(s);
    } catch { setMessage('No se pudo acceder al horario guardado. Comprueba que tu navegador permita almacenamiento local.'); }
  }, []);
  return <div className="space-y-6">
    <div className="flex flex-wrap items-center justify-between gap-3 text-white">
      <p className="text-sm text-blue-100">2026-2 · Guardado solo en este navegador, no sincronizado con tu cuenta.</p>
      <a href="/armar-horario" className="btn-secondary">Comparar nuevos horarios</a>
    </div>
    {schedule ? <GeneratedScheduleList schedules={[schedule]} truncated={false} daily /> : <section className="panel"><h1 className="text-2xl font-bold">Mi horario</h1><p role="status" className="mt-3 text-slate-600">{message}</p></section>}
  </div>;
}
