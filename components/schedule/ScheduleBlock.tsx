'use client';
import { useState } from 'react';
import { blocksConflict, timeToMinutes } from '@/lib/schedule/generator';
import type { ClassBlock, ScheduleConflict } from '@/lib/schedule/types';

export function ScheduleBlock({ block, color, conflicts, gridStart, pixelsPerHour, isLocked = false }: { block: ClassBlock; color: string; conflicts: ScheduleConflict[]; gridStart: number; pixelsPerHour: number; isLocked?: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const start = timeToMinutes(block.startTime);
  const end = timeToMinutes(block.endTime);
  const conflict = conflicts.find((candidate) => candidate.blocks.some((item) => item.id === block.id));
  const lane = conflict?.blocks[1].id === block.id ? 1 : 0;
  const hasConflict = blocksConflict(block, conflicts);
  const top = ((start - gridStart) / 60) * pixelsPerHour;
  const height = Math.max(((end - start) / 60) * pixelsPerHour, 38);

  return (
    <button
      type="button"
      onClick={() => setExpanded(!expanded)}
      aria-expanded={expanded}
      aria-label={`${block.courseName}, ${block.day}, ${block.startTime}–${block.endTime}, ver detalles`}
      className={`absolute z-10 overflow-hidden rounded-xl border border-white/40 p-2 text-[#082044] shadow-md ${hasConflict ? 'ring-2 ring-red-600' : ''}`}
      style={{ backgroundColor: color, top, height: expanded ? 'auto' : height - 4, minHeight: height - 4, zIndex: expanded ? 30 : 10, textAlign: 'left', left: hasConflict ? `${2 + lane * 49}%` : '3%', width: expanded ? '97%' : hasConflict ? '47%' : '94%' }}
      title={`${block.courseName} · Código ${block.courseId} · ${block.type} · Sección ${block.section} · ${block.professorName ?? 'Profesor por confirmar'}${isLocked ? ' · Sección fija' : ''}`}
    >
      <p className={expanded ? 'text-xs font-bold leading-4' : 'line-clamp-2 text-xs font-black leading-4'}>{block.courseName}</p>
      <p className="truncate text-[0.62rem] font-black opacity-80">Código: {block.courseId}</p>
      <p className="mt-0.5 truncate text-[0.66rem] font-bold">{block.type} · Sec. {block.section}</p>
      <p className={expanded ? 'text-xs' : 'truncate text-[0.62rem] opacity-80'}>{block.professorName ?? 'Profesor por confirmar'}</p>
      <p className="mt-0.5 text-[0.62rem] font-bold">{block.startTime}–{block.endTime}</p>
      {isLocked && <span className="absolute bottom-1 right-1 rounded bg-slate-950/75 px-1.5 py-0.5 text-[0.52rem] font-black uppercase tracking-wide text-white">Sección fija</span>}
      {expanded && <span className="block pb-5 text-xs">Pulsa para cerrar</span>}
    </button>
  );
}
