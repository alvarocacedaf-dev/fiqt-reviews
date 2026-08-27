import { blocksConflict, timeToMinutes } from '@/lib/schedule/generator';
import type { ClassBlock, ScheduleConflict } from '@/lib/schedule/types';

const COLORS = [
  'bg-amber-300 text-amber-950 border-amber-400',
  'bg-sky-400 text-sky-950 border-sky-300',
  'bg-violet-400 text-violet-950 border-violet-300',
  'bg-emerald-400 text-emerald-950 border-emerald-300',
  'bg-rose-400 text-rose-950 border-rose-300',
  'bg-orange-400 text-orange-950 border-orange-300',
  'bg-cyan-300 text-cyan-950 border-cyan-200',
  'bg-fuchsia-400 text-fuchsia-950 border-fuchsia-300',
];

function colorIndex(courseId: string) {
  return [...courseId].reduce((total, character) => total + character.charCodeAt(0), 0) % COLORS.length;
}

export function ScheduleBlock({ block, conflicts, gridStart, pixelsPerHour }: { block: ClassBlock; conflicts: ScheduleConflict[]; gridStart: number; pixelsPerHour: number }) {
  const start = timeToMinutes(block.startTime);
  const end = timeToMinutes(block.endTime);
  const conflict = conflicts.find((candidate) => candidate.blocks.some((item) => item.id === block.id));
  const lane = conflict?.blocks[1].id === block.id ? 1 : 0;
  const hasConflict = blocksConflict(block, conflicts);
  const top = ((start - gridStart) / 60) * pixelsPerHour;
  const height = Math.max(((end - start) / 60) * pixelsPerHour, 38);

  return (
    <article
      className={`absolute z-10 overflow-hidden rounded-xl border p-2 shadow-md ${COLORS[colorIndex(block.courseId)]} ${hasConflict ? 'ring-2 ring-red-600' : ''}`}
      style={{ top, height: height - 4, left: hasConflict ? `${2 + lane * 49}%` : '3%', width: hasConflict ? '47%' : '94%' }}
      title={`${block.courseName} · ${block.type} · Sección ${block.section} · ${block.professorName ?? 'Profesor por confirmar'}`}
    >
      <p className="line-clamp-2 text-xs font-black leading-4">{block.courseName}</p>
      <p className="mt-0.5 truncate text-[0.66rem] font-bold">{block.type} · Sec. {block.section}</p>
      <p className="truncate text-[0.62rem] opacity-80">{block.professorName ?? 'Profesor por confirmar'}</p>
      <p className="mt-0.5 text-[0.62rem] font-bold">{block.startTime}–{block.endTime}</p>
    </article>
  );
}
