'use client';

import { useState } from 'react';
import { ConflictWarning } from './ConflictWarning';
import { ScheduleGrid } from './ScheduleGrid';
import { ScheduleSummary } from './ScheduleSummary';
import { Icon } from '@/components/ui/Icon';
import type { GeneratedSchedule } from '@/lib/schedule/types';

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

function downloadScheduleImage(schedule: GeneratedSchedule, position: number) {
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
    context.font = 'bold 17px Arial, sans-serif';
    context.fillText(fitText(context, `${block.type} · Sec. ${block.section}`, blockWidth - 24), x + 12, y + 38);
    if (blockHeight >= 94) {
      context.font = '16px Arial, sans-serif';
      context.fillText(fitText(context, block.professorName ?? 'Profesor por confirmar', blockWidth - 24), x + 12, y + 64);
    }
    if (blockHeight >= 120) {
      context.font = 'bold 16px Arial, sans-serif';
      context.fillText(`${block.startTime}–${block.endTime}`, x + 12, y + 90);
    }
  });

  const triggerDownload = (url: string) => {
    const link = document.createElement('a');
    link.download = `horario-${position}-fiqt-reviews.png`;
    link.href = url;
    link.click();
  };

  return new Promise<void>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('No se pudo generar la imagen.'));
        return;
      }
      const url = URL.createObjectURL(blob);
      triggerDownload(url);
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      resolve();
    }, 'image/png');
  });
}

export function GeneratedScheduleList({ schedules, truncated }: { schedules: GeneratedSchedule[]; truncated: boolean }) {
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [downloadingIds, setDownloadingIds] = useState<string[]>([]);

  function saveSchedule(schedule: GeneratedSchedule) {
    localStorage.setItem('fiqt-reviews-saved-schedule', JSON.stringify({ academicTerm: '2026-2', schedule, savedAt: new Date().toISOString() }));
    setSavedIds((current) => current.includes(schedule.id) ? current : [...current, schedule.id]);
  }

  async function handleDownload(schedule: GeneratedSchedule, position: number) {
    if (downloadingIds.includes(schedule.id)) return;
    setDownloadingIds((current) => [...current, schedule.id]);
    try {
      await downloadScheduleImage(schedule, position);
    } catch {
      window.alert('No se pudo descargar la imagen. Actualiza tu navegador e inténtalo nuevamente.');
    } finally {
      setDownloadingIds((current) => current.filter((id) => id !== schedule.id));
    }
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
              <button
                className="btn-secondary gap-2"
                disabled={downloadingIds.includes(schedule.id)}
                onClick={() => void handleDownload(schedule, index + 1)}
                type="button"
              >
                <Icon className="h-4 w-4" name="file" />
                {downloadingIds.includes(schedule.id) ? 'Generando imagen...' : 'Descargar imagen'}
              </button>
            </div>
          </div>
        </article>
      ))}
    </section>
  );
}
