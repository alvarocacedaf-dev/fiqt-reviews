import type { GeneratedSchedule } from '@/lib/schedule/types';

export function ConflictWarning({ schedule }: { schedule: GeneratedSchedule }) {
  if (schedule.conflicts.length === 0) {
    return <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800">Sin cruces. Esta combinación es compatible.</p>;
  }

  return (
    <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
      <p className="font-black">Este horario tiene {schedule.conflictCount} {schedule.conflictCount === 1 ? 'cruce' : 'cruces'}:</p>
      <ul className="mt-1 space-y-1">
        {schedule.conflicts.map((conflict) => (
          <li key={`${conflict.day}-${conflict.startTime}-${conflict.blocks.map((block) => block.id).join('-')}`}>
            {(() => {
              const lockedBlocks = conflict.blocks.filter((block) => schedule.sections.some((section) =>
                schedule.lockedSectionIds.includes(section.id) && section.blocks.some((item) => item.id === block.id)));
              if (lockedBlocks.length === 2) {
                return `Las secciones obligatorias seleccionadas tienen cruces entre ellas: ${conflict.day} ${conflict.startTime}–${conflict.endTime} — ${conflict.blocks[0].courseName} con ${conflict.blocks[1].courseName}.`;
              }
              if (lockedBlocks.length === 1) {
                return `La sección fija de ${lockedBlocks[0].courseName} genera cruces con otros cursos seleccionados: ${conflict.day} ${conflict.startTime}–${conflict.endTime}.`;
              }
              return `${conflict.day} ${conflict.startTime}–${conflict.endTime} — ${conflict.blocks[0].courseName} se cruza con ${conflict.blocks[1].courseName}.`;
            })()}
          </li>
        ))}
      </ul>
    </div>
  );
}
