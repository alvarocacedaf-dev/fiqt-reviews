'use client';

import { useEffect, useRef, useState } from 'react';
import { ConflictWarning } from './ConflictWarning';
import { ScheduleExplorer } from './ScheduleExplorer';
import { ScheduleSummary } from './ScheduleSummary';
import { Icon } from '@/components/ui/Icon';
import type { GeneratedSchedule } from '@/lib/schedule/types';
import { ScheduleImagePreview } from './ScheduleImagePreview';

const IMAGE_DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'] as const;
const IMAGE_COLORS = ['#fcd34d', '#93c5fd', '#c4b5fd', '#6ee7b7', '#fda4af', '#fdba74', '#67e8f9', '#f0abfc'];

function timeToMinutes(time: string) {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

function courseColor(courseId: string) {
  const index = [...courseId].reduce((total, character) => total + character.charCodeAt(0), 0) % IMAGE_COLORS.length;
  return IMAGE_COLORS[index];
}

function fitText(context: CanvasRenderingContext2D, text: string, maxWidth: number) {
  if (context.measureText(text).width <= maxWidth) return text;
  let shortened = text;
  while (shortened.length > 1 && context.measureText(`${shortened}…`).width > maxWidth) shortened = shortened.slice(0, -1);
  return `${shortened}…`;
}

function createScheduleImage(schedule: GeneratedSchedule, position: number) {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  if (!context) throw new Error('El navegador no permite generar la imagen.');

  const width = 1800;
  const leftColumn = 130;
  const topGrid = 250;
  const hourHeight = 92;
  const gridStart = 8 * 60;
  const gridEnd = 22 * 60;
  const gridHeight = ((gridEnd - gridStart) / 60) * hourHeight;
  const dayWidth = (width - leftColumn - 60) / IMAGE_DAYS.length;
  canvas.width = width;
  canvas.height = topGrid + gridHeight + 60;

  context.fillStyle = '#071a3d';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = '#ffffff';
  context.font = 'bold 54px Arial, sans-serif';
  context.fillText(`Horario ${position}`, 60, 78);
  context.fillStyle = '#f4c542';
  context.font = 'bold 25px Arial, sans-serif';
  context.fillText('FIQT REVIEWS · 2026-2', 60, 122);
  context.fillStyle = '#bfdbfe';
  context.font = '24px Arial, sans-serif';
  const sections = schedule.sections.map((section) => `${section.courseId}-${section.section}`).join(' · ');
  context.fillText(fitText(context, sections, width - 120), 60, 164);
  context.fillStyle = '#ffffff';
  context.font = 'bold 20px Arial, sans-serif';
  context.fillText(`Secciones fijas respetadas: ${schedule.lockedSectionIds.length}`, 60, 198);

  context.strokeStyle = 'rgba(255,255,255,0.18)';
  context.lineWidth = 2;
  context.font = 'bold 21px Arial, sans-serif';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  IMAGE_DAYS.forEach((day, index) => {
    const x = leftColumn + index * dayWidth;
    context.fillStyle = '#ffffff';
    context.fillText(day.toUpperCase(), x + dayWidth / 2, topGrid - 30);
    context.beginPath();
    context.moveTo(x, topGrid - 60);
    context.lineTo(x, topGrid + gridHeight);
    context.stroke();
  });
  context.beginPath();
  context.moveTo(width - 60, topGrid - 60);
  context.lineTo(width - 60, topGrid + gridHeight);
  context.stroke();

  context.font = 'bold 19px Arial, sans-serif';
  for (let hour = 8; hour <= 22; hour += 1) {
    const y = topGrid + (hour - 8) * hourHeight;
    context.strokeStyle = 'rgba(255,255,255,0.14)';
    context.beginPath();
    context.moveTo(leftColumn, y);
    context.lineTo(width - 60, y);
    context.stroke();
    context.fillStyle = '#bfdbfe';
    context.fillText(`${String(hour).padStart(2, '0')}:00`, leftColumn / 2, y + 12);
  }

  schedule.blocks.forEach((block) => {
    const dayIndex = IMAGE_DAYS.indexOf(block.day);
    if (dayIndex < 0) return;
    const start = timeToMinutes(block.startTime);
    const end = timeToMinutes(block.endTime);
    const conflict = schedule.conflicts.find((candidate) => candidate.blocks.some((item) => item.id === block.id));
    const lane = conflict?.blocks[1].id === block.id ? 1 : 0;
    const hasConflict = Boolean(conflict);
    const isLocked = schedule.sections.some((section) => schedule.lockedSectionIds.includes(section.id) && section.blocks.some((item) => item.id === block.id));
    const availableWidth = dayWidth - 16;
    const blockWidth = hasConflict ? availableWidth / 2 - 4 : availableWidth;
    const x = leftColumn + dayIndex * dayWidth + 8 + (hasConflict ? lane * (availableWidth / 2 + 4) : 0);
    const y = topGrid + ((start - gridStart) / 60) * hourHeight + 5;
    const blockHeight = Math.max(((end - start) / 60) * hourHeight - 10, 58);

    context.fillStyle = courseColor(block.courseId);
    context.beginPath();
    context.roundRect(x, y, blockWidth, blockHeight, 14);
    context.fill();
    context.fillStyle = '#082044';
    context.textAlign = 'left';
    context.textBaseline = 'top';
    context.font = 'bold 20px Arial, sans-serif';
    context.fillText(fitText(context, block.courseName, blockWidth - 24), x + 12, y + 10);
    context.font = 'bold 15px Arial, sans-serif';
    context.fillText(fitText(context, `Código: ${block.courseId}`, blockWidth - 24), x + 12, y + 37);
    context.font = 'bold 17px Arial, sans-serif';
    context.fillText(fitText(context, `${block.type} · Sec. ${block.section}`, blockWidth - 24), x + 12, y + 59);
    if (blockHeight >= 116) {
      context.font = '16px Arial, sans-serif';
      context.fillText(fitText(context, block.professorName ?? 'Profesor por confirmar', blockWidth - 24), x + 12, y + 85);
    }
    if (blockHeight >= 142) {
      context.font = 'bold 16px Arial, sans-serif';
      context.fillText(`${block.startTime}–${block.endTime}`, x + 12, y + 111);
    }
    if (isLocked) {
      context.fillStyle = '#082044';
      context.font = 'bold 14px Arial, sans-serif';
      context.textAlign = 'right';
      context.textBaseline = 'bottom';
      context.fillText('SECCIÓN FIJA', x + blockWidth - 10, y + blockHeight - 8);
    }
  });

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('No se pudo generar la imagen.'));
        return;
      }
      resolve(blob);
    }, 'image/png');
  });
}

export function GeneratedScheduleList({ schedules, truncated, daily = false }: { schedules: GeneratedSchedule[]; truncated: boolean; daily?: boolean }) {
  const [savedId, setSavedId] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [message, setMessage] = useState('');
  const busy = useRef(false);
  const [downloadingIds, setDownloadingIds] = useState<string[]>([]);
  const [preview, setPreview] = useState<File | null>(null);
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('fiqt-reviews-saved-schedule') || 'null');
      setSavedId(saved?.schedule?.id || '');
    } catch { /* Storage can be unavailable. Saving reports the error below. */ }
  }, []);

  function saveSchedule(schedule: GeneratedSchedule) {
    try {
      localStorage.setItem('fiqt-reviews-saved-schedule', JSON.stringify({ academicTerm: '2026-2', schedule, savedAt: new Date().toISOString() }));
      setSavedId(schedule.id);
      setMessage('Horario guardado en este navegador. Puedes consultarlo en Mi horario guardado.');
    } catch {
      setMessage('No se pudo guardar en este navegador. Puedes conservar la imagen del horario.');
    }
  }

  async function handleDownload(schedule: GeneratedSchedule, position: number) {
    if (busy.current) return;
    busy.current = true;
    setDownloadingIds((current) => [...current, schedule.id]);
    try {
      const blob = await createScheduleImage(schedule, position);
      const file = new File([blob], `horario-${position}-fiqt-reviews.png`, { type: 'image/png' });
      setPreview(file);
    } catch {
      setMessage('No se pudo generar la imagen. Inténtalo nuevamente.');
    } finally {
      setDownloadingIds((current) => current.filter((id) => id !== schedule.id));
      busy.current = false;
    }
  }

  return (
    <section className="space-y-8">
      {preview && <ScheduleImagePreview file={preview} onClose={() => setPreview(null)} />}
      <div className="flex flex-col gap-2 text-white sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-gold">Resultados</p>
          <h2 className="mt-1 text-3xl font-black">{daily ? 'Tu horario guardado' : 'Compara y elige tu horario'}</h2>
        </div>
        {truncated && <p className="max-w-md text-sm text-blue-100">Se aplicó una búsqueda optimizada para evaluar las combinaciones más prometedoras sin congelar la página.</p>}
      </div>

      {!daily && <div className="grid gap-3 sm:grid-cols-3" aria-label="Comparar alternativas">
        {schedules.map((schedule, index) => <button key={schedule.id} type="button" aria-pressed={selectedIndex === index} onClick={() => setSelectedIndex(index)} className={`rounded-2xl border p-5 text-left transition ${selectedIndex === index ? 'border-gold bg-white text-ink ring-2 ring-gold' : 'border-white/20 bg-white/10 text-white'}`}>
          <span className="block text-lg font-bold">Horario {index + 1}{savedId === schedule.id ? ' · Guardado' : ''}</span>
          <span className="mt-2 block text-sm">{schedule.conflictCount ? `${schedule.conflictCount} cruces` : 'Sin cruces'} · {schedule.attendanceDays} días</span>
          <span className="mt-1 block text-sm">{schedule.gapMinutes} min libres entre clases</span>
          {index === 0 && <span className="mt-3 block text-xs font-bold">Mejor según cruces, huecos y asistencia</span>}
        </button>)}
      </div>}
      {schedules.map((schedule, index) => index === Math.min(selectedIndex, schedules.length - 1) && (
        <article className="overflow-hidden rounded-[1.5rem] border border-white/15 bg-white shadow-card" key={schedule.id}>
          <header className="bg-gradient-to-r from-[#071a3d] to-[#123c88] p-5 sm:p-7">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="text-white">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-2xl font-black">Horario {index + 1}</h3>
                  {index === 0 && !daily && <span className="rounded-full border border-gold/60 bg-gold/15 px-3 py-1 text-xs font-black uppercase tracking-wide text-gold">Opción recomendada</span>}
                </div>
                <p className="mt-1 text-sm text-blue-100">{schedule.sections.map((section) => `${section.courseId}-${section.section}`).join(' · ')}</p>
              </div>
              <div className="w-full lg:max-w-xl"><ScheduleSummary schedule={schedule} /></div>
            </div>
          </header>

          <div className="space-y-4 p-4 sm:p-6">
            <ConflictWarning schedule={schedule} />
            <ScheduleExplorer schedule={schedule} daily={daily} />
            <div className="flex flex-wrap gap-3">
              <button className="btn-primary gap-2" onClick={() => saveSchedule(schedule)} type="button">
                <Icon className="h-4 w-4" name="check" />
                {savedId === schedule.id ? 'Horario guardado' : 'Guardar en este navegador'}
              </button>
              <button
                className="btn-secondary gap-2"
                disabled={downloadingIds.includes(schedule.id)}
                onClick={() => void handleDownload(schedule, index + 1)}
                type="button"
              >
                <Icon className="h-4 w-4" name="file" />
                {downloadingIds.includes(schedule.id) ? 'Preparando imagen...' : 'Ver imagen semanal'}
              </button>
            </div>
            <p className="text-xs text-slate-500">Se guarda una sola elección en este navegador; guardar otra la reemplaza. La imagen siempre incluye la semana completa.</p>
            {!daily && <a className="inline-block text-sm font-semibold text-royal underline" href="/horario">Mi horario guardado</a>}
            {message && <p role="status" className="rounded-xl bg-blue-50 p-3 text-sm text-royal">{message}</p>}
          </div>
        </article>
      ))}
    </section>
  );
}
